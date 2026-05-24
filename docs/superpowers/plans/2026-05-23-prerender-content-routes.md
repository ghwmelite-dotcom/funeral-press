# Prerender Content Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FuneralPress's indexable content routes (home, landing, templates, blog + 46 posts, hymns, venues, 16 region pages) serve real static HTML so AI crawlers and social scrapers — which don't execute JavaScript — can see the content, per-page titles/meta, and JSON-LD schema.

**Architecture:** Post-build Puppeteer prerender (the `react-snap` approach, written custom). After `vite build`, a Node script starts `vite preview` over `dist/`, drives headless Chromium (puppeteer — already a dependency) to each content route, waits for React + react-helmet-async to finish rendering, captures the fully-rendered DOM (including the Helmet-injected `<title>`, meta, and per-page JSON-LD), and writes it to `dist/<route>/index.html`. Cloudflare Pages serves these static files to everyone; the existing `_redirects` `/* /index.html 200` stays as the SPA fallback for non-prerendered routes. The app keeps pure client rendering (`createRoot`) — React re-renders into `#root` on load, replacing the prerendered markup.

**Scope:** Build-time SSG for **indexable content routes only**. Editor/tool routes (already `Disallow`ed in robots.txt) and user-generated dynamic routes (`/memorial/:id`, `/obituary/:slug`) are **out of scope** — the latter need runtime rendering for WhatsApp/social previews and are a separate follow-up plan (a Cloudflare Pages Function that injects per-entity meta server-side).

**Tech Stack:** Vite 7, React 19 (`createRoot`, CSR), react-router-dom 7 (`BrowserRouter`), react-helmet-async, puppeteer ^24, Cloudflare Pages, Vitest 4.

---

## File Structure

- **Create** `vite-plugins/prerender-routes.js` — pure function `collectPrerenderRoutes({ blogPosts, regions })` returning the ordered list of route paths to prerender. Lives beside the existing `sitemap.js` plugin; `vite-plugins/**` is already in the Vitest include glob.
- **Create** `vite-plugins/__tests__/prerender-routes.test.js` — unit tests for the collector.
- **Create** `scripts/prerender.mjs` — the Puppeteer prerender runner (spawns `vite preview`, crawls, writes per-route HTML).
- **Modify** `package.json` — fold prerender into `build`; update `deploy`.

No application source changes are required: content pages render from in-repo data (`src/data/*.js`), so `networkidle0` + a DOM-content check is a reliable readiness signal without an app-level hook.

---

### Task 1: Route collector (pure function)

**Files:**
- Create: `vite-plugins/prerender-routes.js`
- Test: `vite-plugins/__tests__/prerender-routes.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// vite-plugins/__tests__/prerender-routes.test.js
import { describe, it, expect } from 'vitest'
import { collectPrerenderRoutes, STATIC_CONTENT_ROUTES } from '../prerender-routes.js'

const blogPosts = [{ slug: 'how-to-design-funeral-brochure-ghana' }, { slug: 'funeral-printing-cost-ghana' }]
const regions = [{ slug: 'greater-accra' }, { slug: 'ashanti' }]

describe('collectPrerenderRoutes', () => {
  it('includes the homepage and the static content routes', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/')
    expect(routes).toContain('/blog')
    expect(routes).toContain('/hymns')
    expect(routes).toContain('/venues')
    expect(routes).toContain('/funeral-brochure-designer')
  })

  it('expands every blog post into a /blog/:slug route', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/blog/how-to-design-funeral-brochure-ghana')
    expect(routes).toContain('/blog/funeral-printing-cost-ghana')
  })

  it('expands every region into a /funeral-services/:region route', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/funeral-services/greater-accra')
    expect(routes).toContain('/funeral-services/ashanti')
  })

  it('never includes robots-disallowed editor/admin/user routes', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    for (const bad of ['/editor', '/admin', '/my-designs', '/partner-dashboard', '/obituary-creator']) {
      expect(routes).not.toContain(bad)
    }
  })

  it('returns no duplicate paths', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('starts from the curated STATIC_CONTENT_ROUTES list', () => {
    expect(STATIC_CONTENT_ROUTES[0]).toBe('/')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run vite-plugins/__tests__/prerender-routes.test.js`
Expected: FAIL — `Failed to resolve import "../prerender-routes.js"`.

- [ ] **Step 3: Write the implementation**

```javascript
// vite-plugins/prerender-routes.js
// Indexable, content-bearing routes worth prerendering to static HTML.
// Deliberately EXCLUDES editor/tool routes (Disallow'd in public/robots.txt)
// and user-generated dynamic routes (/memorial/:id, /obituary/:slug), which
// need runtime rendering and are handled by a separate plan.
export const STATIC_CONTENT_ROUTES = [
  '/',
  '/funeral-brochure-designer',
  '/funeral-poster-maker',
  '/memorial-page-creator',
  '/funeral-programme-booklet',
  '/funeral-brochure-templates',
  '/funeral-poster-templates',
  '/funeral-invitation-templates',
  '/funeral-booklet-templates',
  '/themes',
  '/hymns',
  '/venues',
  '/blog',
  '/privacy/donations',
]

/**
 * Build the full ordered list of route paths to prerender.
 * @param {object} opts
 * @param {Array<{slug: string}>} opts.blogPosts
 * @param {Array<{slug: string}>} opts.regions
 * @returns {string[]} unique, ordered route paths
 */
export function collectPrerenderRoutes({ blogPosts = [], regions = [] } = {}) {
  const routes = [
    ...STATIC_CONTENT_ROUTES,
    ...blogPosts.map((p) => `/blog/${p.slug}`),
    ...regions.map((r) => `/funeral-services/${r.slug}`),
  ]
  return [...new Set(routes)]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run vite-plugins/__tests__/prerender-routes.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/prerender-routes.js vite-plugins/__tests__/prerender-routes.test.js
git commit -m "feat(seo): prerender route collector (content routes only)"
```

---

### Task 2: Puppeteer prerender runner

**Files:**
- Create: `scripts/prerender.mjs`

- [ ] **Step 1: Write the prerender script**

```javascript
// scripts/prerender.mjs
// Post-build prerender: serve dist/ with `vite preview`, drive headless
// Chromium to each content route, capture the fully-rendered HTML (content +
// Helmet meta + JSON-LD), and write it to dist/<route>/index.html so non-JS
// crawlers (AI engines, social scrapers) see real content.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
import blogPosts from '../src/data/blogPosts.js'
import { REGIONS } from '../src/data/regions.js'
import { collectPrerenderRoutes } from '../vite-plugins/prerender-routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const PORT = 4183
const BASE = `http://127.0.0.1:${PORT}`

function log(m) { process.stdout.write(`[prerender] ${m}\n`) }

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`preview server did not start at ${url}`)
}

function outPathForRoute(route) {
  if (route === '/') return join(DIST, 'index.html')
  return join(DIST, route.replace(/^\//, ''), 'index.html')
}

async function renderRoute(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 45000 })
  // Content pages render from in-repo data, so once the network is idle the
  // React tree is mounted. Confirm #root actually holds content before capture.
  await page.waitForFunction(
    () => {
      const r = document.getElementById('root')
      return r && r.innerText.trim().length > 150
    },
    { timeout: 15000 },
  )
  return page.content()
}

async function main() {
  const routes = collectPrerenderRoutes({ blogPosts, regions: REGIONS })
  log(`prerendering ${routes.length} routes`)

  const preview = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, shell: process.platform === 'win32', stdio: 'ignore' },
  )

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const failures = []
  try {
    await waitForServer(BASE + '/')
    const page = await browser.newPage()
    for (const route of routes) {
      let html
      try {
        html = await renderRoute(page, route)
      } catch (err) {
        log(`retry ${route} (${err.message})`)
        try { html = await renderRoute(page, route) } catch (err2) {
          failures.push({ route, error: err2.message })
          log(`FAILED ${route}: ${err2.message}`)
          continue
        }
      }
      const out = outPathForRoute(route)
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, html, 'utf8')
      log(`✓ ${route} → ${out.replace(ROOT, '.')}`)
    }
  } finally {
    await browser.close()
    preview.kill()
  }

  if (failures.length) {
    log(`${failures.length} route(s) failed:`)
    for (const f of failures) log(`  - ${f.route}: ${f.error}`)
    process.exit(1)
  }
  log(`done — ${routes.length} routes prerendered`)
}

main().catch((err) => {
  process.stderr.write(`[prerender] ${err.stack || err.message}\n`)
  process.exit(1)
})
```

- [ ] **Step 2: Build, then run the prerender once**

Run: `npm run build` (current script: `vite build`) then `node scripts/prerender.mjs`
Expected: log lines `✓ /blog/how-to-design-funeral-brochure-ghana → ./dist/blog/how-to-design-funeral-brochure-ghana/index.html` etc., ending `done — N routes prerendered`, exit 0.

- [ ] **Step 3: Verify a blog post's static HTML contains its real content (not the homepage shell)**

Run:
```bash
grep -c "How to Design a Funeral Brochure in Ghana" dist/blog/how-to-design-funeral-brochure-ghana/index.html
```
Expected: `1` or more (the post's `<title>`/`<h1>` is baked into the static HTML).

Run (negative control — the generic homepage title should NOT be the page title here):
```bash
grep -o "<title>[^<]*</title>" dist/blog/how-to-design-funeral-brochure-ghana/index.html
```
Expected: a post-specific title, not `FuneralPress — Ghana's All-in-One Funeral Design Platform`.

- [ ] **Step 4: Verify per-page JSON-LD is present in the static HTML**

Run: `grep -c "application/ld+json" dist/blog/how-to-design-funeral-brochure-ghana/index.html`
Expected: `>= 1` (the global Organization/WebSite blocks plus the page's Article/FAQ schema, all serialized).

- [ ] **Step 5: Commit**

```bash
git add scripts/prerender.mjs
git commit -m "feat(seo): puppeteer post-build prerender of content routes"
```

---

### Task 3: Wire prerender into the build

**Files:**
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Update the build and deploy scripts**

Change the `scripts` entries from:

```json
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vite build && wrangler pages deploy dist",
```

to:

```json
    "build": "vite build && node scripts/prerender.mjs",
    "build:spa": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler pages deploy dist",
```

(`build:spa` is kept as an escape hatch for fast SPA-only builds during local dev. CI's existing `npm run build` step now produces prerendered output automatically, and `deploy-frontend` uploads that `dist`.)

- [ ] **Step 2: Verify a clean full build prerenders**

Run: `rm -rf dist && npm run build`
Expected: Vite build output, then `[prerender]` logs ending `done — N routes prerendered`, exit 0.

- [ ] **Step 3: Verify the homepage was prerendered with content**

Run: `grep -c "id=\"root\"" dist/index.html && [ $(wc -c < dist/index.html) -gt 5000 ] && echo OK`
Expected: prints `1` then `OK` (homepage HTML now contains rendered content, not just an empty `#root`).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build(seo): run prerender as part of build + deploy"
```

---

### Task 4: Verify crawler-visibility + SPA fallback (acceptance test)

**Files:** none (verification only)

- [ ] **Step 1: Serve the built output the way Cloudflare Pages will**

Run: `npx wrangler pages dev dist --port 8976` (run in a second terminal; leave it running)
Expected: server ready on `http://localhost:8976`.

- [ ] **Step 2: Confirm a content route returns real content in the raw HTTP response (no JS execution)**

Run: `curl -s http://localhost:8976/blog/funeral-printing-cost-ghana | grep -c "Funeral Printing Cost"`
Expected: `>= 1` — proves a non-JS crawler (AI engine / social scraper) now sees the article content and title.

- [ ] **Step 3: Confirm the SPA fallback still works for non-prerendered routes**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8976/memorial/some-random-id`
Expected: `200` (Cloudflare serves `index.html` via the `_redirects` SPA fallback; React then renders the dynamic page client-side).

- [ ] **Step 4: Confirm a prerendered region page is static-visible**

Run: `curl -s http://localhost:8976/funeral-services/ashanti | grep -c "Ashanti"`
Expected: `>= 1`.

- [ ] **Step 5: Stop the dev server.** No commit (verification task). If any check fails, return to Task 2 (readiness/selector tuning) before proceeding.

---

### Task 5: Confirm CI build prerenders on ubuntu + PWA does not mask content

**Files:**
- Modify (only if Step 2 shows a missing-Chromium error): `.github/workflows/deploy.yml` — add `- run: npx puppeteer browsers install chrome` in the `build` job before `npm run build`.

- [ ] **Step 1: Push the branch and let the `build` job run**

```bash
git push -u origin <branch>
```
Then watch the `Build` job: `gh run watch $(gh run list --branch <branch> --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`
Expected: build job succeeds and its logs include `[prerender] done`. (`puppeteer` installs a bundled Chromium during `npm ci`; the script already launches with `--no-sandbox`.)

- [ ] **Step 2: If the build job fails with a missing-Chromium / shared-library error, add the install step**

In `.github/workflows/deploy.yml`, inside the `build` job's steps, immediately before `- run: npm run build`, insert:

```yaml
      - run: npx puppeteer browsers install chrome
```

Then commit and re-push:

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(seo): ensure Chromium available for prerender in build job"
git push
```
Expected: build job now succeeds with `[prerender] done` in the logs.

- [ ] **Step 3: Verify the PWA service worker won't serve a stale shell for content routes**

Read `vite.config.js` `VitePWA(...)` options and check `workbox.navigateFallback` / `navigateFallbackDenylist`.
Expected outcome: returning users with the SW installed must not get a cached generic `index.html` for prerendered content routes. If `navigateFallback` is set to `/index.html` with no denylist, add the content routes' prefixes (`/blog`, `/funeral-services`, `/hymns`, `/venues`) to `navigateFallbackDenylist` (as regexes) so the SW lets network/precache serve the per-route HTML. If the build uses `registerType: 'autoUpdate'` and no SPA navigateFallback, no change is needed — note that in the commit message.

- [ ] **Step 4: Commit any PWA config change**

```bash
git add vite.config.js
git commit -m "fix(seo): exclude prerendered content routes from PWA navigateFallback"
```
(Skip if Step 3 found no change was needed.)

---

## Notes & follow-ups (not in scope here)

- **Brief content flash:** because the app uses `createRoot` (CSR), React replaces the prerendered DOM on mount. Content is identical, so the flash is minimal. Switching to `hydrateRoot` would remove it but is fragile with markup mismatches — defer unless it proves noticeable.
- **Dynamic per-entity previews** (`/memorial/:id`, `/obituary/:slug`) — the WhatsApp/Facebook link-preview fix for user-generated pages needs a Cloudflare Pages Function that fetches the entity from the memorial/obituary API and injects per-entity OG/title server-side. **Separate plan.**
- **After deploy:** submit the sitemap in Google Search Console + Bing Webmaster, then spot-check 3–4 prerendered URLs with Google's Rich Results Test and the URL Inspection "view crawled HTML".
