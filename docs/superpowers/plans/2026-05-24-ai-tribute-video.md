# AI Tribute Video (MVP step 3) Implementation Plan

> Backend tasks follow TDD against the mock-DB/mock-fetch pattern in `workers/__tests__/`.

**Goal:** Premium memorials can generate a dignified ~40–60s tribute video (title card → Ken-Burns photo montage with an AI-written tribute caption → closing card, over royalty-free music), rendered server-side by Shotstack, stored in R2 ("forever"), and shareable/downloadable. Premium-gated (requires a succeeded `memorial_premium`).

**Architecture:** Owned by `auth-api` (already holds the entitlement, D1, the `IMAGES` R2 bucket). Add a Workers AI binding for the caption and a `SHOTSTACK_API_KEY` secret. Flow: create endpoint → Workers AI writes the caption → build a Shotstack "edit" JSON → POST to Shotstack render (async) → store a `tribute_videos` row (`rendering`). The client polls a status endpoint that lazily checks Shotstack; on `done`, the worker copies the MP4 from Shotstack's CDN into R2 and marks `ready`.

**Tech Stack:** Cloudflare Workers (auth-api), D1, Workers AI (`@cf/meta/llama-3.1-8b-instruct`), R2 (`IMAGES`), Shotstack render API (`stage` sandbox for testing → `v1` for prod), React 19, Vitest.

**External dependency:** Shotstack account. `SHOTSTACK_API_KEY` (sandbox key for testing) set via `wrangler secret put`; `SHOTSTACK_ENV` var = `stage` (default) | `v1`.

---

## File structure
- **Create** `workers/migrations/migration-tribute-videos.sql` — the job table.
- **Create** `workers/utils/shotstackEdit.js` — pure `buildTributeEdit(...)` + test.
- **Modify** `workers/auth-api-wrangler.toml` — add `[ai] binding = "AI"`, `SHOTSTACK_ENV` var, document `SHOTSTACK_API_KEY` secret.
- **Modify** `workers/auth-api.js` — `handleCreateTributeVideo`, `handleTributeVideoStatus` + routes; a small Shotstack client + R2-copy helper.
- **Create** `workers/__tests__/tribute-video.test.js` — TDD.
- **Frontend (staged):** `src/components/memorial/TributeVideoStudio.jsx` (photo pick/upload + create + poll + player), wired into `MemorialPage` premium block; `memorialApi` create/status calls.

---

## Task 1: Shotstack edit-builder (pure) — TDD

**Files:** Create `workers/utils/shotstackEdit.js` + `workers/__tests__/shotstackEdit.test.js`

`buildTributeEdit({ title, subtitle, caption, imageUrls, soundtrackUrl })` returns a Shotstack edit object: a title clip (name + dates), one image clip per photo with alternating Ken-Burns zoom + fade transitions (~3.5s each), a caption HTML overlay, a closing card, and a fading soundtrack. Output: `mp4`, `sd`, 25fps.

- [ ] **Test** (`workers/__tests__/shotstackEdit.test.js`):
```javascript
import { describe, it, expect } from 'vitest'
import { buildTributeEdit, CLIP_SECONDS } from '../utils/shotstackEdit.js'

const base = {
  title: 'Ama Mensah',
  subtitle: '1950 — 2026',
  caption: 'A loving mother, remembered always.',
  imageUrls: ['https://img/1.jpg', 'https://img/2.jpg', 'https://img/3.jpg'],
  soundtrackUrl: 'https://cdn/track.mp3',
}

describe('buildTributeEdit', () => {
  it('produces an mp4 sd output', () => {
    const edit = buildTributeEdit(base)
    expect(edit.output.format).toBe('mp4')
    expect(edit.output.resolution).toBe('sd')
  })
  it('adds one image clip per photo plus title + closing cards', () => {
    const edit = buildTributeEdit(base)
    const imageClips = edit.timeline.tracks.flatMap((t) => t.clips).filter((c) => c.asset.type === 'image')
    expect(imageClips).toHaveLength(3)
    const titleClips = edit.timeline.tracks.flatMap((t) => t.clips).filter((c) => c.asset.type === 'title')
    expect(titleClips.length).toBeGreaterThanOrEqual(1) // title card
  })
  it('attaches the soundtrack with a fade', () => {
    const edit = buildTributeEdit(base)
    expect(edit.timeline.soundtrack.src).toBe('https://cdn/track.mp3')
    expect(edit.timeline.soundtrack.effect).toBe('fadeInFadeOut')
  })
  it('gives image clips Ken-Burns effects and fade transitions', () => {
    const edit = buildTributeEdit(base)
    const imageClips = edit.timeline.tracks.flatMap((t) => t.clips).filter((c) => c.asset.type === 'image')
    expect(imageClips.every((c) => /^zoom/.test(c.effect))).toBe(true)
    expect(imageClips.every((c) => c.length === CLIP_SECONDS)).toBe(true)
  })
  it('handles a single photo without error', () => {
    const edit = buildTributeEdit({ ...base, imageUrls: ['https://img/only.jpg'] })
    const imageClips = edit.timeline.tracks.flatMap((t) => t.clips).filter((c) => c.asset.type === 'image')
    expect(imageClips).toHaveLength(1)
  })
})
```
- [ ] **Implement** `workers/utils/shotstackEdit.js`:
```javascript
export const CLIP_SECONDS = 3.5
const ZOOMS = ['zoomIn', 'zoomOut']

// Build a Shotstack "edit" for a dignified tribute video.
export function buildTributeEdit({ title, subtitle, caption, imageUrls = [], soundtrackUrl }) {
  const photos = imageUrls.length ? imageUrls : []
  let cursor = 0

  const titleCard = {
    asset: { type: 'title', text: `${title}\n${subtitle || ''}`.trim(), style: 'minimal', size: 'large' },
    start: cursor, length: 3, transition: { in: 'fade', out: 'fade' },
  }
  cursor += 3

  const imageClips = photos.map((src, i) => {
    const clip = {
      asset: { type: 'image', src },
      start: cursor, length: CLIP_SECONDS,
      effect: ZOOMS[i % ZOOMS.length],
      transition: { in: 'fade', out: 'fade' },
    }
    cursor += CLIP_SECONDS
    return clip
  })

  const captionClip = caption
    ? {
        asset: { type: 'title', text: caption, style: 'subtitle', size: 'small' },
        start: Math.max(0, cursor - CLIP_SECONDS), length: CLIP_SECONDS,
      }
    : null

  const closingCard = {
    asset: { type: 'title', text: 'Forever in our hearts', style: 'minimal', size: 'medium' },
    start: cursor, length: 3, transition: { in: 'fade', out: 'fade' },
  }
  cursor += 3

  const tracks = [
    { clips: [titleCard, ...imageClips, closingCard] },
    ...(captionClip ? [{ clips: [captionClip] }] : []),
  ]

  return {
    timeline: {
      background: '#000000',
      soundtrack: soundtrackUrl ? { src: soundtrackUrl, effect: 'fadeInFadeOut' } : undefined,
      tracks,
    },
    output: { format: 'mp4', resolution: 'sd', fps: 25 },
  }
}
```
- [ ] Run `npx vitest run workers/__tests__/shotstackEdit.test.js` → pass. Commit.

## Task 2: `tribute_videos` table + worker config

- [ ] **Create** `workers/migrations/migration-tribute-videos.sql`:
```sql
CREATE TABLE IF NOT EXISTS tribute_videos (
  id              TEXT PRIMARY KEY,
  memorial_id     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'rendering',  -- rendering | ready | failed
  shotstack_id    TEXT,
  caption         TEXT,
  output_url      TEXT,
  error           TEXT,
  created_at      INTEGER NOT NULL,
  ready_at        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tribute_videos_memorial ON tribute_videos(memorial_id, created_at DESC);
```
- [ ] Apply local: `npx wrangler d1 execute funeralpress-db --local --config workers/auth-api-wrangler.toml --file workers/migrations/migration-tribute-videos.sql`
- [ ] **Modify** `workers/auth-api-wrangler.toml`: add under bindings `[ai]\n binding = "AI"`; under `[vars]` add `SHOTSTACK_ENV = "stage"`; add a secret comment line `# SHOTSTACK_API_KEY — Shotstack render API key (sandbox 'stage' for testing, prod 'v1')`.
- [ ] Commit migration + toml.

## Task 3: Create + status endpoints — TDD

**Add to `workers/auth-api.js`** (premium-gated). A render is created only for memorials with a succeeded entitlement.

- [ ] **Tests** (`workers/__tests__/tribute-video.test.js`, mock DB + mock `env.AI.run` + mock `fetch` for Shotstack + mock `env.IMAGES`):
  - create: not premium → 403; premium → inserts a `rendering` row, calls Shotstack render, returns `{ videoId, status:'rendering' }`; AI caption failure → still renders with a safe fallback caption.
  - status: Shotstack `done` → copies MP4 to R2, row becomes `ready` with `output_url`; Shotstack `failed` → row `failed`; still rendering → `{ status:'rendering' }`.
- [ ] **Implement** (sketch — full code in build):
```javascript
const SHOTSTACK_BASE = (env) => `https://api.shotstack.io/${env.SHOTSTACK_ENV || 'stage'}`

async function aiTributeCaption(env, { name, biography, tributes }) {
  try {
    const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Write a single dignified, warm one-sentence tribute caption (max 90 chars) for a funeral memorial video. No quotes, no emojis.' },
        { role: 'user', content: `Name: ${name}. Notes: ${(biography || tributes || '').slice(0, 500)}` },
      ],
      max_tokens: 60,
    })
    const text = (r.response || '').trim().replace(/^["']|["']$/g, '')
    return text.slice(0, 100) || `In loving memory of ${name}.`
  } catch {
    return `In loving memory of ${name}.`
  }
}

async function handleCreateTributeVideo(request, env, userId, memorialId) {
  if (!userId) return error('Sign in required', 401, request)
  const ent = await env.DB.prepare(`SELECT id FROM memorial_premium WHERE memorial_id = ? AND status = 'succeeded' LIMIT 1`).bind(memorialId).first()
  if (!ent) return error('Premium required', 403, request)

  const { title, subtitle, caption: bio, imageUrls = [], soundtrackUrl } = await request.json().catch(() => ({}))
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return error('At least one photo is required', 400, request)

  const caption = await aiTributeCaption(env, { name: title, biography: bio })
  const edit = buildTributeEdit({ title, subtitle, caption, imageUrls, soundtrackUrl })

  const res = await fetch(`${SHOTSTACK_BASE(env)}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.SHOTSTACK_API_KEY },
    body: JSON.stringify(edit),
  })
  const data = await res.json()
  if (!res.ok || !data.response?.id) return error('Could not start render', 502, request)

  const id = generateId()
  await env.DB.prepare(`INSERT INTO tribute_videos (id, memorial_id, status, shotstack_id, caption, created_at) VALUES (?, ?, 'rendering', ?, ?, ?)`)
    .bind(id, memorialId, data.response.id, caption, Date.now()).run()
  return json({ videoId: id, status: 'rendering' }, 200, request)
}

async function handleTributeVideoStatus(request, env, videoId) {
  const row = await env.DB.prepare('SELECT * FROM tribute_videos WHERE id = ?').bind(videoId).first()
  if (!row) return error('Not found', 404, request)
  if (row.status === 'ready') return json({ status: 'ready', url: row.output_url }, 200, request)
  if (row.status === 'failed') return json({ status: 'failed', error: row.error }, 200, request)

  const res = await fetch(`${SHOTSTACK_BASE(env)}/render/${row.shotstack_id}`, { headers: { 'x-api-key': env.SHOTSTACK_API_KEY } })
  const data = await res.json()
  const st = data.response?.status
  if (st === 'done' && data.response.url) {
    const mp4 = await fetch(data.response.url)
    const key = `tribute-videos/${row.memorial_id}/${videoId}.mp4`
    await env.IMAGES.put(key, mp4.body, { httpMetadata: { contentType: 'video/mp4' } })
    const publicUrl = `https://funeralpress.org/images/${key}`
    await env.DB.prepare("UPDATE tribute_videos SET status = 'ready', output_url = ?, ready_at = ? WHERE id = ?").bind(publicUrl, Date.now(), videoId).run()
    return json({ status: 'ready', url: publicUrl }, 200, request)
  }
  if (st === 'failed') {
    await env.DB.prepare("UPDATE tribute_videos SET status = 'failed', error = 'render failed' WHERE id = ?").bind(videoId).run()
    return json({ status: 'failed' }, 200, request)
  }
  return json({ status: 'rendering' }, 200, request)
}
```
  Routes: `POST /memorial-premium/:id/tribute-video` (authed group) → create; `GET /tribute-video/:id/status` (public) → status. (Confirm the `/images/<key>` serve path matches `handleImageServe`.)
- [ ] Run tests → pass. Commit.

## Task 4: Soundtracks
- [ ] Add 2–3 royalty-free instrumental MP3s to R2 under `soundtracks/` (operator step — provide files); expose their `/images/soundtracks/<file>.mp3` URLs as selectable options in the UI. (No code dependency; the create endpoint takes `soundtrackUrl`.)

## Task 5: Frontend — Tribute Video Studio (premium-gated)
- [ ] `memorialApi`: `createTributeVideo(memorialId, payload)`, `getTributeVideoStatus(videoId)`.
- [ ] `TributeVideoStudio.jsx`: shown in the MemorialPage premium block (only when `premium`). Photo selection — start from `coverPhoto`, let the family **add more photos** via the existing image-upload infra (`apiUploadImage`/R2); pick a soundtrack; "Create video" → `createTributeVideo` → poll `getTributeVideoStatus` every ~4s with a calm progress state (`aria-live`) → on ready, show a `<video>` player + download + WhatsApp share. UI/UX skill: dignified black+gold, one primary CTA, 44px targets, reduced-motion, loading/success/error feedback.
- [ ] Manual browser verify once `SHOTSTACK_API_KEY` (sandbox) is set.

---

## Operator steps (gates for live render)
1. Create a Shotstack account → copy the **sandbox** API key → `wrangler secret put SHOTSTACK_API_KEY` on auth-api (ghwmelite account). Switch `SHOTSTACK_ENV` to `v1` + prod key when going live.
2. Apply `migration-tribute-videos.sql` to the **remote** D1 (same as the premium migration).
3. Upload royalty-free soundtrack MP3s to R2.

## Out of scope
- Multiple video templates/themes; per-photo captions; voiceover narration; video re-render billing (the GHS 50 re-render is a later add).
