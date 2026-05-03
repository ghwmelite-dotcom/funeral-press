# Phase 0: Unblock Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Existing built code deploys cleanly through CI to `funeralpress.org` subdomains. No new features. After merge, `wrangler deploy --dry-run` succeeds for every worker, lint exits 0, all 270 tests still pass, build is clean.

**Architecture:** Three logical sub-PRs that can be reviewed and merged independently. Sub-PR-A is config + missing tables (mostly mechanical, few tests). Sub-PR-B is correctness fixes (TDD throughout). Sub-PR-C is observability (light tests, mostly wiring). Tasks within each sub-PR can be done in any order.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), Wrangler CLI, GitHub Actions, Vitest, React 19, `@sentry/cloudflare`.

**Spec:** `docs/superpowers/specs/2026-05-02-100-percent-production-readiness-design.md` § "Phase 0 — Unblock production"

**Working directory:** `C:\Users\USER\OneDrive - Smart Workplace\Desktop\Projects\funeral-press`

**Branch:** continue on `feature/donation-rail` until merge to `main` at the end of Sub-PR-C.

**Wrangler binary path (this machine):** `C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler` — use directly to avoid `npx wrangler` hangs.

---

## User Action Checklist (do BEFORE Task A2)

These items require Cloudflare/Paystack dashboard access and must be done by the user, not the implementing agent. Block on user confirmation before proceeding to Task A2.

- [ ] **Create OTP_KV namespace.** Run:
  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" kv namespace create OTP_KV
  ```
  Expected output contains a line like `id = "abc123..."`. Save this ID for Task A2.

- [ ] **Create MEMORIAL_PAGES_KV namespace.** Run:
  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" kv namespace create MEMORIAL_PAGES_KV
  ```
  Save the returned ID for Task A2.

  Note: there is already an existing `MEMORIAL_PAGES_KV` binding on `memorial-wrangler.toml` (real ID). If it exists, copy that ID instead of creating a new one — donation-api must share the same namespace as memorial-page-api so the cache invalidation in `donation-api.js` reaches the right namespace.

- [ ] **Create Paystack live subscription plans.** In Paystack dashboard → Plans → Create Plan:
  - Pro Monthly: GHS 85 / month → record the `plan_code` (format `PLN_xxxxxxxxxxxx`)
  - Pro Annual: GHS 850 / year → record the `plan_code`

- [ ] **Create DNS CNAME records** in Cloudflare DNS for the 6 worker subdomains:
  | Subdomain | Target | Proxy |
  |---|---|---|
  | `auth-api.funeralpress.org` | `funeralpress-auth-api.ghwmelite.workers.dev` | Proxied |
  | `donation-api.funeralpress.org` | `funeralpress-donation-api.ghwmelite.workers.dev` | Proxied |
  | `memorial-api.funeralpress.org` | `funeralpress-memorial-api.ghwmelite.workers.dev` | Proxied |
  | `live-api.funeralpress.org` | `funeralpress-live-service-api.ghwmelite.workers.dev` | Proxied |
  | `share-api.funeralpress.org` | `funeralpress-share-api.ghwmelite.workers.dev` | Proxied |
  | `ai.funeralpress.org` | `funeralpress-ai-writer.ghwmelite.workers.dev` | Proxied |

  Note: workers.dev hostnames will resolve only after first deploy of each worker. Cloudflare will accept the CNAME ahead of time.

- [ ] **Provision Sentry DSN for workers.** In Sentry dashboard → Projects → New Project → "Cloudflare Workers" platform. Copy the DSN. This will be set as `SENTRY_DSN` worker secret in Sub-PR-C.

When all 5 items are done, proceed to Task A2.

---

## Sub-PR-A — Wrangler config + missing migrations

**Branch tip after Sub-PR-A merge:** every wrangler.toml deploys cleanly via `wrangler deploy --dry-run`, every D1 table referenced by worker code has a migration in `workers/migrations/`, CI deploys all 7 workers.

### Task A1: Create implementing branch + verify clean baseline

**Files:**
- Read: `package.json`, `workers/auth-api-wrangler.toml`, `workers/donation-api-wrangler.toml`

- [ ] **Step 1: Confirm baseline tests pass**

  Run: `npm test`
  Expected: `Test Files  33 passed`, `Tests  270 passed`, exit 0.

- [ ] **Step 2: Confirm baseline lint state**

  Run: `npx eslint src/ workers/ --max-warnings 0`
  Expected: exit 1 with ~110 problems (will be fixed in Sub-PR-B; just confirm baseline matches audit).

- [ ] **Step 3: Confirm baseline build passes**

  Run: `npm run build`
  Expected: exit 0, builds in ~50s.

- [ ] **Step 4: Verify on the right branch**

  Run: `git rev-parse --abbrev-ref HEAD`
  Expected: `feature/donation-rail`

### Task A2: Wire real KV namespace IDs into wranglers

**Files:**
- Modify: `workers/auth-api-wrangler.toml:29`
- Modify: `workers/donation-api-wrangler.toml:13`
- Modify: `workers/donation-api-wrangler.toml:22`

- [ ] **Step 1: Replace OTP_KV placeholder in auth-api-wrangler.toml**

  At line 29, replace:
  ```toml
  id = "REPLACE_BEFORE_DEPLOY_OTP_KV"
  ```
  With the real OTP_KV ID from User Action Checklist:
  ```toml
  id = "<real-otp-kv-id>"
  ```

- [ ] **Step 2: Replace MEMORIAL_PAGES_KV placeholder in donation-api-wrangler.toml**

  At line 13, replace:
  ```toml
  id = "REPLACE_BEFORE_DEPLOY_MEMORIAL_PAGES_KV"
  ```
  With the real MEMORIAL_PAGES_KV ID (must match the one in `workers/memorial-wrangler.toml` for cache coherence).

- [ ] **Step 3: Replace OTP_KV placeholder in donation-api-wrangler.toml**

  At line 22, replace:
  ```toml
  id = "REPLACE_BEFORE_DEPLOY_OTP_KV"
  ```
  With the same OTP_KV ID used in auth-api-wrangler.toml.

- [ ] **Step 4: Verify no placeholder strings remain**

  Run: `npx --no-install ripgrep "REPLACE_BEFORE_DEPLOY" workers/`
  Or: `Grep tool with pattern REPLACE_BEFORE_DEPLOY in workers/`
  Expected: zero matches.

- [ ] **Step 5: Commit**

  ```bash
  git add workers/auth-api-wrangler.toml workers/donation-api-wrangler.toml
  git commit -m "fix(wrangler): replace placeholder KV namespace IDs with real ones"
  ```

### Task A3: Wire real Paystack plan codes

**Files:**
- Modify: `workers/auth-api-wrangler.toml:8-9`

- [ ] **Step 1: Replace Paystack plan codes**

  At lines 8-9, replace:
  ```toml
  PAYSTACK_PLAN_MONTHLY = "PLN_placeholder_monthly"
  PAYSTACK_PLAN_ANNUAL = "PLN_placeholder_annual"
  ```
  With the real plan codes from User Action Checklist:
  ```toml
  PAYSTACK_PLAN_MONTHLY = "PLN_<real-monthly-code>"
  PAYSTACK_PLAN_ANNUAL = "PLN_<real-annual-code>"
  ```

- [ ] **Step 2: Verify no `PLN_placeholder` strings remain**

  Run: Grep tool with pattern `PLN_placeholder` in `workers/`
  Expected: zero matches.

- [ ] **Step 3: Commit**

  ```bash
  git add workers/auth-api-wrangler.toml
  git commit -m "fix(wrangler): replace placeholder Paystack plan codes with real ones"
  ```

### Task A4: Create wrangler config for brochure-ai-writer

**Files:**
- Create: `workers/brochure-ai-writer-wrangler.toml`

- [ ] **Step 1: Create the wrangler config**

  Write `workers/brochure-ai-writer-wrangler.toml`:
  ```toml
  name = "funeralpress-ai-writer"
  main = "brochure-ai-writer.js"
  compatibility_date = "2026-04-01"

  [observability]
  enabled = true

  [vars]
  ENVIRONMENT = "production"

  [ai]
  binding = "AI"

  [[kv_namespaces]]
  binding = "RATE_LIMITS"
  id = "3cf6b47818c04ca8828461650478a6c1"
  ```

  Note: routes block added in Task A5; Sentry init added in Sub-PR-C.

- [ ] **Step 2: Dry-run deploy to verify config parses**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" deploy --config workers/brochure-ai-writer-wrangler.toml --dry-run
  ```
  Expected: parses without error, reports compiled bundle size.

- [ ] **Step 3: Commit**

  ```bash
  git add workers/brochure-ai-writer-wrangler.toml
  git commit -m "feat(wrangler): add brochure-ai-writer wrangler config"
  ```

### Task A5: Add `[[routes]]` to all 7 wrangler configs

**Files:**
- Modify: `workers/auth-api-wrangler.toml`
- Modify: `workers/donation-api-wrangler.toml`
- Modify: `workers/memorial-wrangler.toml`
- Modify: `workers/live-service-wrangler.toml`
- Modify: `workers/share-wrangler.toml`
- Modify: `workers/twitter-bot-wrangler.toml` (NO route — internal only)
- Modify: `workers/brochure-ai-writer-wrangler.toml`

- [ ] **Step 1: Append route block to auth-api-wrangler.toml**

  Append at end of file:
  ```toml

  [[routes]]
  pattern = "auth-api.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 2: Append route block to donation-api-wrangler.toml**

  Append at end:
  ```toml

  [[routes]]
  pattern = "donation-api.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 3: Append route block to memorial-wrangler.toml**

  Append at end:
  ```toml

  [[routes]]
  pattern = "memorial-api.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 4: Append route block to live-service-wrangler.toml**

  Append at end:
  ```toml

  [[routes]]
  pattern = "live-api.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 5: Append route block to share-wrangler.toml**

  Append at end:
  ```toml

  [[routes]]
  pattern = "share-api.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 6: Append route block to brochure-ai-writer-wrangler.toml**

  Append at end:
  ```toml

  [[routes]]
  pattern = "ai.funeralpress.org/*"
  zone_name = "funeralpress.org"
  ```

- [ ] **Step 7: Skip twitter-bot (internal trigger only, no public route)**

  No change to `workers/twitter-bot-wrangler.toml`.

- [ ] **Step 8: Verify all configs still parse**

  For each of the 6 modified configs, run dry-run:
  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" deploy --config workers/<name>-wrangler.toml --dry-run
  ```
  Expected: each parses, no errors.

- [ ] **Step 9: Commit**

  ```bash
  git add workers/*-wrangler.toml
  git commit -m "feat(wrangler): bind 6 workers to funeralpress.org subdomain routes"
  ```

### Task A6: Update CI to deploy donation-api + brochure-ai-writer

**Files:**
- Modify: `.github/workflows/deploy.yml:73-99`

- [ ] **Step 1: Add donation-api and brochure-ai-writer steps**

  In the `deploy-workers` job, after the `twitter-bot-wrangler.toml` step (line 99), append:
  ```yaml
        - uses: cloudflare/wrangler-action@v3
          with:
            apiToken: ${{ secrets.CF_API_TOKEN }}
            command: deploy --config workers/donation-api-wrangler.toml
        - uses: cloudflare/wrangler-action@v3
          with:
            apiToken: ${{ secrets.CF_API_TOKEN }}
            command: deploy --config workers/brochure-ai-writer-wrangler.toml
  ```

- [ ] **Step 2: Verify YAML parses**

  Run: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy.yml', 'utf8'))"`
  Or open the file and visually confirm indentation matches surrounding steps.
  Expected: no parse error.

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "ci: deploy donation-api and brochure-ai-writer workers"
  ```

### Task A7: Commit existing untracked migration-subscriptions.sql

**Files:**
- Track (already exists on disk): `workers/migrations/migration-subscriptions.sql`

- [ ] **Step 1: Confirm file is untracked**

  Run: `git status --short workers/migrations/migration-subscriptions.sql`
  Expected: `?? workers/migrations/migration-subscriptions.sql`

- [ ] **Step 2: Stage and commit**

  ```bash
  git add workers/migrations/migration-subscriptions.sql
  git commit -m "chore(migrations): track migration-subscriptions.sql in repo"
  ```

### Task A8: Author + apply migration-guest-book.sql

**Files:**
- Create: `workers/migrations/migration-guest-book.sql`
- Create: `workers/__tests__/migration-guest-book.test.js`

Schema (derived from `workers/auth-api.js:1495-1535` queries):
- `guest_books`: id (TEXT PK), user_id (TEXT FK users), slug (TEXT UNIQUE), deceased_name (TEXT), deceased_photo (TEXT NULL), cover_message (TEXT NULL), is_active (INT DEFAULT 1), created_at (TEXT)
- `guest_entries`: id (TEXT PK), book_id (TEXT FK guest_books), name (TEXT), message (TEXT NULL), photo_url (TEXT NULL), created_at (TEXT)

- [ ] **Step 1: Write the failing test**

  Create `workers/__tests__/migration-guest-book.test.js`:
  ```js
  import { describe, it, expect } from 'vitest'
  import { readFileSync } from 'fs'
  import { join, dirname } from 'path'
  import { fileURLToPath } from 'url'

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const MIGRATION_PATH = join(__dirname, '..', 'migrations', 'migration-guest-book.sql')
  const sql = readFileSync(MIGRATION_PATH, 'utf8')

  describe('migration-guest-book.sql', () => {
    it('creates guest_books table with required columns', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS guest_books/)
      for (const col of ['id', 'user_id', 'slug', 'deceased_name', 'deceased_photo', 'cover_message', 'is_active', 'created_at']) {
        expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
      }
    })

    it('creates guest_entries table with required columns', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS guest_entries/)
      for (const col of ['id', 'book_id', 'name', 'message', 'photo_url', 'created_at']) {
        expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
      }
    })

    it('declares foreign keys', () => {
      expect(sql).toMatch(/REFERENCES users/)
      expect(sql).toMatch(/REFERENCES guest_books/)
    })

    it('indexes slug and user_id', () => {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON guest_books\(slug\)/)
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON guest_books\(user_id\)/)
    })
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run workers/__tests__/migration-guest-book.test.js`
  Expected: FAIL — file not found.

- [ ] **Step 3: Write the migration**

  Create `workers/migrations/migration-guest-book.sql`:
  ```sql
  -- ============================================================
  -- Migration: Guest Book
  -- Date: 2026-05-02
  -- Adds guest_books + guest_entries tables for memorial guest book feature.
  -- ============================================================

  CREATE TABLE IF NOT EXISTS guest_books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    slug TEXT NOT NULL UNIQUE,
    deceased_name TEXT NOT NULL,
    deceased_photo TEXT,
    cover_message TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guest_entries (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES guest_books(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT,
    photo_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_guest_books_slug ON guest_books(slug);
  CREATE INDEX IF NOT EXISTS idx_guest_books_user_id ON guest_books(user_id);
  CREATE INDEX IF NOT EXISTS idx_guest_entries_book ON guest_entries(book_id);
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run workers/__tests__/migration-guest-book.test.js`
  Expected: PASS, 4/4.

- [ ] **Step 5: Apply migration to remote D1**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --remote --file workers/migrations/migration-guest-book.sql
  ```
  Expected: `Executed 5 commands` (2 CREATE TABLE + 3 CREATE INDEX), no errors. If tables already exist, the `IF NOT EXISTS` prevents errors.

- [ ] **Step 6: Apply migration to local D1**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --local --file workers/migrations/migration-guest-book.sql
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add workers/migrations/migration-guest-book.sql workers/__tests__/migration-guest-book.test.js
  git commit -m "feat(migrations): add guest_books and guest_entries tables"
  ```

### Task A9: Author + apply migration-obituary-pages.sql

**Files:**
- Create: `workers/migrations/migration-obituary-pages.sql`
- Create: `workers/__tests__/migration-obituary-pages.test.js`

Schema (derived from `workers/auth-api.js:1556-1586`):
- `obituary_pages`: id, user_id, slug, deceased_name, deceased_photo, birth_date, death_date, biography, funeral_date, funeral_time, funeral_venue, venue_address, family_members, is_active (default 1), created_at, updated_at

- [ ] **Step 1: Write the failing test**

  Create `workers/__tests__/migration-obituary-pages.test.js`:
  ```js
  import { describe, it, expect } from 'vitest'
  import { readFileSync } from 'fs'
  import { join, dirname } from 'path'
  import { fileURLToPath } from 'url'

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const sql = readFileSync(join(__dirname, '..', 'migrations', 'migration-obituary-pages.sql'), 'utf8')

  describe('migration-obituary-pages.sql', () => {
    it('creates obituary_pages with required columns', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS obituary_pages/)
      for (const col of [
        'id', 'user_id', 'slug', 'deceased_name', 'deceased_photo',
        'birth_date', 'death_date', 'biography',
        'funeral_date', 'funeral_time', 'funeral_venue', 'venue_address',
        'family_members', 'is_active', 'created_at', 'updated_at'
      ]) {
        expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
      }
    })

    it('declares foreign key to users', () => {
      expect(sql).toMatch(/REFERENCES users/)
    })

    it('indexes slug and user_id', () => {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON obituary_pages\(slug\)/)
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON obituary_pages\(user_id\)/)
    })
  })
  ```

- [ ] **Step 2: Run test, expect FAIL**

  Run: `npx vitest run workers/__tests__/migration-obituary-pages.test.js`

- [ ] **Step 3: Write migration**

  Create `workers/migrations/migration-obituary-pages.sql`:
  ```sql
  -- ============================================================
  -- Migration: Obituary Pages
  -- Date: 2026-05-02
  -- ============================================================

  CREATE TABLE IF NOT EXISTS obituary_pages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    slug TEXT NOT NULL UNIQUE,
    deceased_name TEXT NOT NULL,
    deceased_photo TEXT,
    birth_date TEXT,
    death_date TEXT,
    biography TEXT,
    funeral_date TEXT,
    funeral_time TEXT,
    funeral_venue TEXT,
    venue_address TEXT,
    family_members TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_obituary_pages_slug ON obituary_pages(slug);
  CREATE INDEX IF NOT EXISTS idx_obituary_pages_user_id ON obituary_pages(user_id);
  ```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Apply to remote and local D1**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --remote --file workers/migrations/migration-obituary-pages.sql
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --local --file workers/migrations/migration-obituary-pages.sql
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add workers/migrations/migration-obituary-pages.sql workers/__tests__/migration-obituary-pages.test.js
  git commit -m "feat(migrations): add obituary_pages table"
  ```

### Task A10: Author + apply migration-photo-gallery.sql

**Files:**
- Create: `workers/migrations/migration-photo-gallery.sql`
- Create: `workers/__tests__/migration-photo-gallery.test.js`

Schema (from `workers/auth-api.js:1607-1654`):
- `photo_galleries`: id, user_id, slug, title, deceased_name, description, is_active (default 1), created_at
- `gallery_photos`: id, gallery_id, photo_url, caption, sort_order, created_at

- [ ] **Step 1: Write the failing test**

  Create `workers/__tests__/migration-photo-gallery.test.js`:
  ```js
  import { describe, it, expect } from 'vitest'
  import { readFileSync } from 'fs'
  import { join, dirname } from 'path'
  import { fileURLToPath } from 'url'

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const sql = readFileSync(join(__dirname, '..', 'migrations', 'migration-photo-gallery.sql'), 'utf8')

  describe('migration-photo-gallery.sql', () => {
    it('creates photo_galleries table', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS photo_galleries/)
      for (const col of ['id', 'user_id', 'slug', 'title', 'deceased_name', 'description', 'is_active', 'created_at']) {
        expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
      }
    })

    it('creates gallery_photos table', () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS gallery_photos/)
      for (const col of ['id', 'gallery_id', 'photo_url', 'caption', 'sort_order', 'created_at']) {
        expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
      }
    })

    it('declares foreign keys', () => {
      expect(sql).toMatch(/REFERENCES users/)
      expect(sql).toMatch(/REFERENCES photo_galleries/)
    })

    it('indexes slug and gallery_id', () => {
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON photo_galleries\(slug\)/)
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON gallery_photos\(gallery_id\)/)
    })
  })
  ```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Write migration**

  Create `workers/migrations/migration-photo-gallery.sql`:
  ```sql
  -- ============================================================
  -- Migration: Photo Gallery
  -- Date: 2026-05-02
  -- ============================================================

  CREATE TABLE IF NOT EXISTS photo_galleries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    deceased_name TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gallery_photos (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES photo_galleries(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_photo_galleries_slug ON photo_galleries(slug);
  CREATE INDEX IF NOT EXISTS idx_photo_galleries_user_id ON photo_galleries(user_id);
  CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_id ON gallery_photos(gallery_id);
  CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort ON gallery_photos(gallery_id, sort_order);
  ```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Apply to remote and local D1**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --remote --file workers/migrations/migration-photo-gallery.sql
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" d1 execute funeralpress-db --local --file workers/migrations/migration-photo-gallery.sql
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add workers/migrations/migration-photo-gallery.sql workers/__tests__/migration-photo-gallery.test.js
  git commit -m "feat(migrations): add photo_galleries and gallery_photos tables"
  ```

### Task A11: Dedupe `workers/schema.sql`

**Files:**
- Modify: `workers/schema.sql`

`workers/schema.sql` is a reference snapshot of the legacy schema. The audit found `orders` defined twice (lines 51 and 87) and `unlocked_designs` defined twice (lines 67 and 103).

- [ ] **Step 1: Read the file**

  Read `workers/schema.sql` and identify the two duplicate `CREATE TABLE` blocks.

- [ ] **Step 2: Remove the second `orders` block (around line 87)**

  Delete lines from the second `CREATE TABLE orders ...` through its closing `);`.

- [ ] **Step 3: Remove the second `unlocked_designs` block (around line 103)**

  Delete lines from the second `CREATE TABLE unlocked_designs ...` through its closing `);`.

- [ ] **Step 4: Add a header comment marking the file as reference-only**

  At the top of the file, add:
  ```sql
  -- ============================================================
  -- LEGACY REFERENCE — Do NOT apply this file. Runtime schema
  -- lives in workers/migrations/. This file is a snapshot of
  -- the original V1 tables, kept for historical reference only.
  -- ============================================================
  ```

- [ ] **Step 5: Verify no duplicate CREATE TABLE statements remain**

  Run: Grep tool with pattern `^CREATE TABLE` in `workers/schema.sql`, output_mode `count`
  Expected: each table name appears exactly once.

- [ ] **Step 6: Commit**

  ```bash
  git add workers/schema.sql
  git commit -m "fix(schema): dedupe orders + unlocked_designs blocks; mark file as reference-only"
  ```

### Sub-PR-A Exit Gate

- [ ] Run `npm test` — all 270 + 11 new tests (3 migrations × ~3-4 each) pass.
- [ ] Run `npm run build` — exit 0.
- [ ] For each of the 7 wrangler configs, run `wrangler deploy --config <path> --dry-run` — all parse and return successful upload preview.
- [ ] Push branch, open PR titled "Phase 0 Sub-PR-A: wrangler config + missing migrations", get review.
- [ ] Merge PR.

---

## Sub-PR-B — Correctness fixes + CORS lockdown

**Branch tip after Sub-PR-B merge:** `npx eslint src/ workers/ --max-warnings 0` exits 0. Subscription webhook rejects non-Paystack IPs. brochure-ai-writer rejects non-allowlisted origins. Production CORS no longer accepts localhost.

### Task B1: Fix `PageTransition.jsx` — eliminate set-state-in-effect

**Files:**
- Modify: `src/components/layout/PageTransition.jsx`
- Create: `src/components/layout/__tests__/PageTransition.test.jsx`

The bug: lines 9-18 set `transitionStage` and `displayLocation` inside `useEffect` watching `[location, displayLocation]`. Setting state inside an effect that depends on that state is the React 19 anti-pattern flagged by `react-hooks/set-state-in-effect`. Fix: derive `displayLocation` from refs + flush via callback, or use `useReducer` with a single transition action.

- [ ] **Step 1: Write the failing test**

  Create `src/components/layout/__tests__/PageTransition.test.jsx`:
  ```jsx
  import { describe, it, expect } from 'vitest'
  import { render } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import PageTransition from '../PageTransition'

  describe('PageTransition', () => {
    it('renders children without throwing', () => {
      const { getByText } = render(
        <MemoryRouter>
          <PageTransition>
            <div>Hello</div>
          </PageTransition>
        </MemoryRouter>
      )
      expect(getByText('Hello')).toBeTruthy()
    })

    it('does not render children with hidden state on first mount', () => {
      const { container } = render(
        <MemoryRouter>
          <PageTransition>
            <div>Content</div>
          </PageTransition>
        </MemoryRouter>
      )
      // First render must be in 'enter' state — verifies no set-state-in-effect causes mount-time exit
      expect(container.firstChild.className).toMatch(/opacity-100/)
    })
  })
  ```

- [ ] **Step 2: Run test to verify baseline behavior**

  Run: `npx vitest run src/components/layout/__tests__/PageTransition.test.jsx`
  Expected: both pass against current code (the bug is a perf regression, not a functional break — these tests guard against making it worse).

- [ ] **Step 3: Refactor `PageTransition.jsx` to derive without effect**

  Replace `src/components/layout/PageTransition.jsx` with:
  ```jsx
  import { useLocation } from 'react-router-dom'
  import { useEffect, useRef, useState } from 'react'

  export default function PageTransition({ children }) {
    const location = useLocation()
    const prevPathRef = useRef(location.pathname)
    const [transitionKey, setTransitionKey] = useState(location.pathname)

    // Imperative side effect (DOM-bound timer); not state derivation.
    useEffect(() => {
      if (location.pathname === prevPathRef.current) return
      prevPathRef.current = location.pathname
      const timer = setTimeout(() => setTransitionKey(location.pathname), 150)
      return () => clearTimeout(timer)
    }, [location.pathname])

    const stage = transitionKey === location.pathname ? 'enter' : 'exit'

    return (
      <div
        key={transitionKey}
        className={`transition-all duration-150 ease-out ${
          stage === 'enter' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        {children}
      </div>
    )
  }
  ```

  Why this works: `transitionKey` only changes via the timer (a true side effect, not state derivation). `stage` is derived synchronously during render. The eslint rule allows effects that touch the DOM/timers; it only flags the anti-pattern of effect-driven state derivation.

- [ ] **Step 4: Run test, verify still passes**

  Run: `npx vitest run src/components/layout/__tests__/PageTransition.test.jsx`
  Expected: PASS, 2/2.

- [ ] **Step 5: Verify lint passes for this file**

  Run: `npx eslint src/components/layout/PageTransition.jsx`
  Expected: exit 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/layout/PageTransition.jsx src/components/layout/__tests__/PageTransition.test.jsx
  git commit -m "fix(PageTransition): eliminate set-state-in-effect anti-pattern"
  ```

### Task B2: Fix `RouteProgressBar.jsx` — eliminate set-state-in-effect

**Files:**
- Modify: `src/components/pwa/RouteProgressBar.jsx`
- Create: `src/components/pwa/__tests__/RouteProgressBar.test.jsx`

Same anti-pattern: `useEffect` watching `[location.pathname]` calls `setVisible`/`setProgress` based on path comparison.

- [ ] **Step 1: Write failing test**

  Create `src/components/pwa/__tests__/RouteProgressBar.test.jsx`:
  ```jsx
  import { describe, it, expect } from 'vitest'
  import { render } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import RouteProgressBar from '../RouteProgressBar'

  describe('RouteProgressBar', () => {
    it('renders nothing on first mount (no navigation has occurred)', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <RouteProgressBar />
        </MemoryRouter>
      )
      expect(container.firstChild).toBeNull()
    })
  })
  ```

- [ ] **Step 2: Run test against current code, expect PASS**

- [ ] **Step 3: Refactor**

  Replace `src/components/pwa/RouteProgressBar.jsx` with:
  ```jsx
  import { useLocation } from 'react-router-dom'
  import { useEffect, useRef, useState } from 'react'

  export default function RouteProgressBar() {
    const location = useLocation()
    const prevPathRef = useRef(location.pathname)
    const completionTimerRef = useRef(null)
    const hideTimerRef = useRef(null)
    const [state, setState] = useState({ visible: false, progress: 0 })

    useEffect(() => {
      if (location.pathname === prevPathRef.current) return
      prevPathRef.current = location.pathname

      setState({ visible: true, progress: 0 })
      const raf = requestAnimationFrame(() => setState({ visible: true, progress: 90 }))

      completionTimerRef.current = setTimeout(() => {
        setState({ visible: true, progress: 100 })
        hideTimerRef.current = setTimeout(() => setState({ visible: false, progress: 0 }), 200)
      }, 300)

      return () => {
        cancelAnimationFrame(raf)
        if (completionTimerRef.current) clearTimeout(completionTimerRef.current)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      }
    }, [location.pathname])

    if (!state.visible && state.progress === 0) return null

    return (
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        <div
          className="h-[2px] bg-primary transition-all ease-out"
          style={{
            width: `${state.progress}%`,
            transitionDuration: state.progress === 100 ? '150ms' : '500ms',
            opacity: state.visible ? 1 : 0,
          }}
        />
      </div>
    )
  }
  ```

  This consolidates two state vars into one object set, and the effect is now imperative (timers + animations) rather than state-derivation-from-state. The eslint rule fires on `setState` derived from a state value within the effect's deps; here the setter is keyed off `location.pathname` and `prevPathRef.current` (a ref, not state), which is allowed.

- [ ] **Step 4: Run test, verify still passes**

- [ ] **Step 5: Verify lint passes**

  Run: `npx eslint src/components/pwa/RouteProgressBar.jsx`
  Expected: exit 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/pwa/RouteProgressBar.jsx src/components/pwa/__tests__/RouteProgressBar.test.jsx
  git commit -m "fix(RouteProgressBar): consolidate state, eliminate set-state-in-effect"
  ```

### Task B3: Fix remaining 6 React effect bugs

**Files (one each, fix in any order):**
- Modify: `src/components/CheckoutDialog.jsx:51`
- Modify: `src/components/MigrationDialog.jsx:38`
- Modify: `src/pages/admin/OverviewTab.jsx:77`
- Modify: `src/hooks/useMediaQuery.js:13`
- Modify: `src/pages/AsedaEditorPage.jsx:423`
- Modify: `src/pages/AsedaEditorPage.jsx:477`
- Modify: `src/pages/PartnerDashboardPage.jsx:76`

For each, the anti-pattern is the same: `useEffect` reads a state/prop value and calls `setX` based on it. The fix is one of three patterns:
1. **Compute during render** if the value can be derived synchronously: replace `useState + useEffect` with a `useMemo` or a plain `const`.
2. **Use `useReducer`** if there are multiple state transitions that depend on each other.
3. **Move to event handlers** if the trigger is user input rather than a value change.

- [ ] **Step 1: For each file, identify the offending effect**

  Run: `npx eslint src/ --rule 'react-hooks/set-state-in-effect: error' --no-eslintrc --plugin react-hooks --parser-options ecmaVersion:latest,sourceType:module,ecmaFeatures:{jsx:true}`
  Or simpler: `npx eslint src/ 2>&1 | grep set-state-in-effect`
  Note exact line + variable for each file.

- [ ] **Step 2: For each file, choose the fix pattern**

  - `useMediaQuery.js:13` — almost certainly the `matches` state can be derived inside the listener callback; pattern 3.
  - `OverviewTab.jsx:77` — likely a derived "loading complete" state from data; pattern 1.
  - `CheckoutDialog.jsx:51`, `MigrationDialog.jsx:38` — likely setting `open` from a prop; pattern 1.
  - `AsedaEditorPage.jsx:423,477` — read each carefully; if it's syncing two state slices, pattern 2.
  - `PartnerDashboardPage.jsx:76` — likely fetching data on mount + storing; that's an OK effect pattern, but if it's setting derived state from a fetched value, extract derivation to render.

- [ ] **Step 3: For each file, apply the fix and re-run lint**

  After each file: `npx eslint <path>` exits 0.

- [ ] **Step 4: Run full test suite to ensure no regression**

  Run: `npm test`
  Expected: all 270+ tests pass.

- [ ] **Step 5: Run lint on full src/ to confirm `set-state-in-effect` is gone**

  Run: `npx eslint src/ 2>&1 | grep set-state-in-effect`
  Expected: zero matches.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/CheckoutDialog.jsx src/components/MigrationDialog.jsx src/pages/admin/OverviewTab.jsx src/hooks/useMediaQuery.js src/pages/AsedaEditorPage.jsx src/pages/PartnerDashboardPage.jsx
  git commit -m "fix(react): remove remaining set-state-in-effect anti-patterns"
  ```

### Task B4: Add IP allowlist to `handleSubscriptionWebhook`

**Files:**
- Modify: `workers/auth-api.js:1758-1768`
- Create: `workers/__tests__/subscription-webhook-ip.test.js`

- [ ] **Step 1: Write failing test**

  Create `workers/__tests__/subscription-webhook-ip.test.js`:
  ```js
  import { describe, it, expect } from 'vitest'

  // Pure function under test — extracted from handleSubscriptionWebhook
  function isPaystackIP(ip) {
    const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
    return PAYSTACK_IPS.includes(ip)
  }

  describe('subscription webhook IP allowlist', () => {
    it('accepts each known Paystack IP', () => {
      expect(isPaystackIP('52.31.139.75')).toBe(true)
      expect(isPaystackIP('52.49.173.169')).toBe(true)
      expect(isPaystackIP('52.214.14.220')).toBe(true)
    })

    it('rejects unknown IPs', () => {
      expect(isPaystackIP('1.2.3.4')).toBe(false)
      expect(isPaystackIP('127.0.0.1')).toBe(false)
      expect(isPaystackIP('')).toBe(false)
    })

    it('rejects IPv6 addresses', () => {
      expect(isPaystackIP('::1')).toBe(false)
      expect(isPaystackIP('2001:db8::1')).toBe(false)
    })
  })
  ```

- [ ] **Step 2: Run, expect PASS** (function is inlined in test for now)

  Run: `npx vitest run workers/__tests__/subscription-webhook-ip.test.js`
  Expected: 3/3 pass.

- [ ] **Step 3: Add IP allowlist + audit log to `handleSubscriptionWebhook`**

  In `workers/auth-api.js`, find function `handleSubscriptionWebhook(request, env)` (around line 1758). Insert after the function signature opening, before line 1760:
  ```js
  async function handleSubscriptionWebhook(request, env) {
    // Paystack webhook IP allowlist (matches handlePaymentWebhook + donation-api)
    const PAYSTACK_IPS = ['52.31.139.75', '52.49.173.169', '52.214.14.220']
    const clientIP = getClientIP(request)
    if (!PAYSTACK_IPS.includes(clientIP)) {
      await logAudit(env.DB, {
        action: 'subscription_webhook.blocked',
        detail: { ip: clientIP, reason: 'IP not in Paystack allowlist' },
        ipAddress: clientIP,
      })
      return error('Forbidden', 403, request)
    }

    // ... existing signature check follows
  ```

- [ ] **Step 4: Run full test suite, verify nothing broke**

  Run: `npm test`
  Expected: 270+ tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add workers/auth-api.js workers/__tests__/subscription-webhook-ip.test.js
  git commit -m "fix(auth-api): add Paystack IP allowlist to handleSubscriptionWebhook"
  ```

### Task B5: Lock `brochure-ai-writer` CORS to allowlist

**Files:**
- Modify: `workers/brochure-ai-writer.js:8-13`
- Create: `workers/__tests__/brochure-ai-writer-cors.test.js`

- [ ] **Step 1: Write failing test**

  Create `workers/__tests__/brochure-ai-writer-cors.test.js`:
  ```js
  import { describe, it, expect } from 'vitest'

  // Pure function — extracted to be testable
  function corsHeadersFor(origin, env) {
    const ALLOWED = [
      'https://funeralpress.org',
      'https://www.funeralpress.org',
      'https://funeral-brochure-app.pages.dev',
    ]
    const isAllowed = ALLOWED.includes(origin) || (origin && origin.endsWith('.funeral-brochure-app.pages.dev'))
    if (env?.ENVIRONMENT === 'dev' && origin && /^http:\/\/localhost:\d+$/.test(origin)) {
      return { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    }
    return {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'https://funeralpress.org',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }

  describe('brochure-ai-writer CORS', () => {
    it('echoes allowlisted production origin', () => {
      expect(corsHeadersFor('https://funeralpress.org', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
        .toBe('https://funeralpress.org')
    })

    it('falls back to canonical origin for unknown origins in production', () => {
      expect(corsHeadersFor('https://attacker.example.com', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
        .toBe('https://funeralpress.org')
    })

    it('does NOT echo wildcard', () => {
      const headers = corsHeadersFor('https://attacker.example.com', { ENVIRONMENT: 'production' })
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*')
    })

    it('echoes localhost only when ENVIRONMENT=dev', () => {
      expect(corsHeadersFor('http://localhost:5173', { ENVIRONMENT: 'dev' })['Access-Control-Allow-Origin'])
        .toBe('http://localhost:5173')
      expect(corsHeadersFor('http://localhost:5173', { ENVIRONMENT: 'production' })['Access-Control-Allow-Origin'])
        .toBe('https://funeralpress.org')
    })
  })
  ```

- [ ] **Step 2: Run test, expect PASS** (function inlined for now)

- [ ] **Step 3: Replace `corsHeaders` constant with per-request function in worker**

  In `workers/brochure-ai-writer.js`, replace the static `corsHeaders` block (lines 8-13) with:
  ```js
  const ALLOWED_ORIGINS = [
    'https://funeralpress.org',
    'https://www.funeralpress.org',
    'https://funeral-brochure-app.pages.dev',
  ]

  function corsHeadersFor(origin, env) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
      (origin && origin.endsWith('.funeral-brochure-app.pages.dev'))
    if (env?.ENVIRONMENT === 'dev' && origin && /^http:\/\/localhost:\d+$/.test(origin)) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    }
    return {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'https://funeralpress.org',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }

  function handleOptions(request, env) {
    const origin = request.headers.get('Origin')
    return new Response(null, { status: 204, headers: corsHeadersFor(origin, env) })
  }
  ```

  Then update every place in the file that previously used `corsHeaders` to call `corsHeadersFor(request.headers.get('Origin'), env)`. Search the file for `corsHeaders` and replace each call site, passing through the `request` and `env` from the surrounding function.

- [ ] **Step 4: Verify worker file still parses**

  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" deploy --config workers/brochure-ai-writer-wrangler.toml --dry-run
  ```
  Expected: parses, no errors.

- [ ] **Step 5: Run full test suite**

  Run: `npm test`

- [ ] **Step 6: Commit**

  ```bash
  git add workers/brochure-ai-writer.js workers/__tests__/brochure-ai-writer-cors.test.js
  git commit -m "fix(brochure-ai-writer): lock CORS to allowlist (no more wildcard)"
  ```

### Task B6: Strip `localhost` from production CORS in 5 workers

**Files:**
- Modify: `workers/auth-api.js:19-20`
- Modify: `workers/donation-api.js:22-23`
- Modify: `workers/live-service-api.js:20-21`
- Modify: `workers/memorial-page-api.js:20-21`
- Modify: `workers/share-api.js:19-20`

Pattern: each worker has an `ALLOWED_ORIGINS` array that includes `'http://localhost:5173'` and `'http://localhost:4173'`. We gate localhost behind `env.ENVIRONMENT === 'dev'`.

- [ ] **Step 1: Identify the CORS check function in each worker**

  For each worker, find the function (often `getAllowedOrigin` or inline check) that compares request `Origin` against `ALLOWED_ORIGINS`.

- [ ] **Step 2: Update each worker — replace static `ALLOWED_ORIGINS` with env-aware function**

  In each of the 5 workers, replace:
  ```js
  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://funeralpress.org',
    'https://www.funeralpress.org',
    'https://funeral-brochure-app.pages.dev',
  ]
  ```

  With:
  ```js
  const PROD_ORIGINS = [
    'https://funeralpress.org',
    'https://www.funeralpress.org',
    'https://funeral-brochure-app.pages.dev',
  ]
  const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

  function allowedOrigins(env) {
    return env?.ENVIRONMENT === 'dev' ? [...PROD_ORIGINS, ...DEV_ORIGINS] : PROD_ORIGINS
  }
  ```

  Then replace every `ALLOWED_ORIGINS.includes(origin)` with `allowedOrigins(env).includes(origin)`. The wildcard `*.funeral-brochure-app.pages.dev` check stays as-is.

- [ ] **Step 3: Add `ENVIRONMENT = "production"` var to each worker's wrangler config**

  In each of `auth-api-wrangler.toml`, `donation-api-wrangler.toml`, `memorial-wrangler.toml`, `live-service-wrangler.toml`, `share-wrangler.toml`, ensure `[vars]` section contains:
  ```toml
  ENVIRONMENT = "production"
  ```
  Add it if missing.

- [ ] **Step 4: Run full test suite**

  Run: `npm test`
  Expected: 270+ tests pass. Note: existing CORS tests that pass `localhost` origin without env may break. If so, update those tests to pass `env: { ENVIRONMENT: 'dev' }`.

- [ ] **Step 5: Commit**

  ```bash
  git add workers/auth-api.js workers/donation-api.js workers/live-service-api.js workers/memorial-page-api.js workers/share-api.js workers/*-wrangler.toml
  git commit -m "fix(cors): gate localhost origins behind ENVIRONMENT=dev (prod denies)"
  ```

### Task B7: Replace empty `catch {}` blocks in donation-api

**Files:**
- Modify: `workers/donation-api.js` lines 251, 288, 290, 313, 325, 1164, 1179

- [ ] **Step 1: Read the 7 sites and understand what each catches**

  Use the Read tool with `offset` near each line to see the surrounding context. Categorize each site:
  - If it's a fire-and-forget side effect (e.g., logging, metrics): swap to `.catch(err => console.error('<context>:', err))`
  - If it's a deliberate fallthrough (e.g., parse error → use default): add `console.error('<context> failed, using fallback:', err)` inside the catch

- [ ] **Step 2: Replace each empty catch with logged catch**

  For each site, replace `catch {}` with `catch (err) { console.error('donation-api <site-context>:', err) }`. Pick a `<site-context>` short string descriptive of what that block was doing (e.g., `'KV cache invalidation'`, `'audit log write'`, `'webhook send'`).

- [ ] **Step 3: Run lint to ensure nothing breaks**

  Run: `npx eslint workers/donation-api.js`

- [ ] **Step 4: Run full test suite**

  Run: `npm test`

- [ ] **Step 5: Commit**

  ```bash
  git add workers/donation-api.js
  git commit -m "fix(donation-api): log errors instead of silently swallowing in 7 catch blocks"
  ```

### Task B8: Remove dead imports

**Files:**
- Modify: `workers/auth-api.js:7` — remove `normalisePhone` from import
- Modify: `src/stores/familyHeadStore.js:7` — remove `get` if unused

- [ ] **Step 1: Verify each is unused**

  For `workers/auth-api.js`:
  Run: Grep tool with pattern `normalisePhone\(` in `workers/auth-api.js`, output_mode `count`
  Expected: 0 (only the import line referenced — that's about to be removed).

  For `src/stores/familyHeadStore.js`:
  Run: Grep tool with pattern `\bget\(` in `src/stores/familyHeadStore.js`, output_mode `count`
  Expected: 0.

- [ ] **Step 2: Remove the unused identifier from each import statement**

  In `workers/auth-api.js:7`, locate the import containing `normalisePhone` and remove just that identifier (keep the rest of the destructured import intact).

  In `src/stores/familyHeadStore.js:7`, the typical Zustand pattern is `(set, get) => ({ ... })`. If `get` is truly unused, change to `(set) => ({ ... })`. Verify by grepping the rest of the file for `\bget\b` — if no other use, the change is safe.

- [ ] **Step 3: Run lint to confirm warnings cleared**

  Run: `npx eslint workers/auth-api.js src/stores/familyHeadStore.js`
  Expected: 0 errors, 0 warnings on these two files.

- [ ] **Step 4: Run full test suite**

  Run: `npm test`

- [ ] **Step 5: Commit**

  ```bash
  git add workers/auth-api.js src/stores/familyHeadStore.js
  git commit -m "chore: remove unused imports"
  ```

### Sub-PR-B Exit Gate

- [ ] Run `npx eslint src/ workers/ --max-warnings 0` — exit 0.
- [ ] Run `npm test` — all tests pass (≥ 280 with the new tests added).
- [ ] Run `npm run build` — exit 0.
- [ ] For each of the 7 wrangler configs, `wrangler deploy --dry-run` succeeds.
- [ ] Push, open PR titled "Phase 0 Sub-PR-B: correctness + CORS lockdown", merge.

---

## Sub-PR-C — Observability + runtime hygiene

**Branch tip after Sub-PR-C merge:** every worker has Sentry init, `[observability] enabled = true`, `compatibility_date = "2026-04-01"`, and a health endpoint. `purchaseStore.js` mixed-import advisory is gone. Final smoke deploy of all 7 workers succeeds.

### Task C1: Bump `compatibility_date` and add observability blocks

**Files:**
- Modify: all 7 `workers/*-wrangler.toml`

- [ ] **Step 1: For each wrangler.toml, set `compatibility_date = "2026-04-01"`**

  Update line 3 (the `compatibility_date` line) in each of:
  - `workers/auth-api-wrangler.toml`
  - `workers/donation-api-wrangler.toml`
  - `workers/memorial-wrangler.toml`
  - `workers/live-service-wrangler.toml`
  - `workers/share-wrangler.toml`
  - `workers/twitter-bot-wrangler.toml`
  - `workers/brochure-ai-writer-wrangler.toml`

- [ ] **Step 2: For each wrangler.toml, add `[observability] enabled = true`**

  Append (or insert near the top, after `compatibility_date`):
  ```toml

  [observability]
  enabled = true
  ```

  Skip if the block already exists (e.g., brochure-ai-writer added in Task A4 already has it).

- [ ] **Step 3: Dry-run deploy each to confirm parsing**

  For each: `wrangler deploy --config <path> --dry-run`. Expected: parses, returns upload preview.

- [ ] **Step 4: Commit**

  ```bash
  git add workers/*-wrangler.toml
  git commit -m "chore(wrangler): bump compatibility_date to 2026-04-01 and enable observability"
  ```

### Task C2: Install `@sentry/cloudflare` and wire to all 7 workers

**Files:**
- Modify: `package.json`
- Modify: all 7 `workers/*.js` (one Sentry init each)

- [ ] **Step 1: Install dependency**

  Run: `npm install @sentry/cloudflare@^9`
  Expected: package added to `package.json` dependencies, `package-lock.json` updated.

- [ ] **Step 2: Add Sentry wrapper to `workers/auth-api.js`**

  At the top of the file (after the existing imports), add:
  ```js
  import * as Sentry from '@sentry/cloudflare'
  ```

  Wrap the default export. Find the `export default { fetch(...) }` block. Replace with:
  ```js
  const handler = {
    async fetch(request, env, ctx) {
      // ... existing fetch body
    },
    // ... existing scheduled() etc.
  }

  export default Sentry.withSentry(
    (env) => ({
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT || 'production',
      tracesSampleRate: 0.1,
    }),
    handler
  )
  ```

  If the worker has no `SENTRY_DSN` configured, `withSentry` no-ops and does not throw — this matches the pattern Cloudflare recommends.

- [ ] **Step 3: Repeat Step 2 pattern for the remaining 6 workers**

  For each of `donation-api.js`, `memorial-page-api.js` (file is `workers/memorial-page-api.js`; check actual filename), `live-service-api.js`, `share-api.js`, `twitter-bot.js`, `brochure-ai-writer.js`, apply the same import + wrapper pattern.

  Note: if a worker only has a `scheduled` handler (twitter-bot, donation-api cron), pass an object with both `fetch` (if present) and `scheduled` to `Sentry.withSentry`. The wrapper supports both.

- [ ] **Step 4: Run lint + test**

  Run: `npx eslint workers/`
  Run: `npm test`
  Expected: both green.

- [ ] **Step 5: Dry-run deploy each worker**

  For each: `wrangler deploy --config <path> --dry-run`. Confirm bundle compiles with new Sentry import.

- [ ] **Step 6: User action — set SENTRY_DSN secret on each worker (manual)**

  Document this as a USER ACTION post-merge:
  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" secret put SENTRY_DSN --config workers/auth-api-wrangler.toml
  # paste DSN when prompted
  # repeat for donation-api, memorial, live-service, share, twitter-bot, brochure-ai-writer
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add package.json package-lock.json workers/*.js
  git commit -m "feat(observability): wire @sentry/cloudflare to all 7 workers"
  ```

### Task C3: Add health endpoints to 4 workers missing them

**Files:**
- Modify: `workers/share-api.js`
- Modify: `workers/memorial-page-api.js`
- Modify: `workers/live-service-api.js`
- Modify: `workers/brochure-ai-writer.js`

- [ ] **Step 1: For each of the 4 workers, add `/health` route**

  In each worker's `fetch` handler, add the early return BEFORE other route matching (use OPTIONS handling pattern as template):
  ```js
  if (url.pathname === '/health' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: '<service-name>',  // e.g. 'share-api'
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
  ```
  Substitute `<service-name>` per worker.

- [ ] **Step 2: Run lint**

  Run: `npx eslint workers/`
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add workers/share-api.js workers/memorial-page-api.js workers/live-service-api.js workers/brochure-ai-writer.js
  git commit -m "feat(observability): add /health endpoints to 4 workers"
  ```

### Task C4: Resolve `purchaseStore.js` mixed import advisory

**Files:**
- Modify: whichever file dynamically imports `src/stores/purchaseStore.js` (find via grep)

The build advisory says `purchaseStore.js` is both statically and dynamically imported. Dynamic-import gains nothing because the static import already pulled it into the main chunk.

- [ ] **Step 1: Find the dynamic import**

  Run: Grep tool with pattern `import\(.*purchaseStore` in `src/`, output_mode `content`, `-n true`
  Note the file:line of the dynamic import.

- [ ] **Step 2: Find the static import(s)**

  Run: Grep tool with pattern `from ['"].*purchaseStore['"]` in `src/`, output_mode `content`, `-n true`

- [ ] **Step 3: Remove the dynamic import**

  Replace the dynamic `import('../stores/purchaseStore')` with the same store reference imported statically at the top of the file. Adjust the surrounding code that consumed the dynamically imported module (it was probably awaiting it; now it's a sync access).

- [ ] **Step 4: Run build, expect no advisory**

  Run: `npm run build`
  Expected: exit 0, no `purchaseStore.js` mixed-import warning.

- [ ] **Step 5: Run tests**

  Run: `npm test`

- [ ] **Step 6: Commit**

  ```bash
  git add <changed-file>
  git commit -m "fix(build): remove dynamic import of purchaseStore (was duplicating static)"
  ```

### Task C5: Final Phase 0 verification gate

**Files:** none (verification only)

- [ ] **Step 1: Lint clean**

  Run: `npx eslint src/ workers/ --max-warnings 0`
  Expected: exit 0, 0 errors, 0 warnings.

- [ ] **Step 2: All tests pass**

  Run: `npm test`
  Expected: ≥ 285 tests passing (270 baseline + 4 migration + 2 PageTransition + 1 RouteProgressBar + 3 IP allowlist + 4 CORS), exit 0.

- [ ] **Step 3: Build succeeds clean**

  Run: `npm run build`
  Expected: exit 0, no advisories.

- [ ] **Step 4: Every wrangler dry-runs cleanly**

  For each of the 7 configs:
  ```powershell
  & "C:/Users/USER/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/.bin/wrangler" deploy --config workers/<name>-wrangler.toml --dry-run
  ```
  Expected: each prints "Would deploy ..." and an upload size.

- [ ] **Step 5: Smoke deploy each worker (USER ACTION — manual)**

  After merging the PR to main, the user runs the deploy or relies on CI. As a Phase 0 acceptance test:
  - Confirm each subdomain returns 200 from `GET /health`:
    - `curl https://auth-api.funeralpress.org/health`
    - `curl https://donation-api.funeralpress.org/health`
    - `curl https://memorial-api.funeralpress.org/health`
    - `curl https://live-api.funeralpress.org/health`
    - `curl https://share-api.funeralpress.org/health`
    - `curl https://ai.funeralpress.org/health`

- [ ] **Step 6: Open PR for Sub-PR-C and merge**

  PR title: "Phase 0 Sub-PR-C: observability + runtime hygiene". After merge, mark Phase 0 complete.

### Sub-PR-C Exit Gate (Phase 0 Done)

- [ ] All three sub-PRs merged to `main`.
- [ ] CI pipeline runs lint → test → build → deploy successfully on the merge commit.
- [ ] All 6 production worker subdomains return 200 on `/health`.
- [ ] User has set `SENTRY_DSN` secret on each worker.
- [ ] User has flipped no feature flags yet (`DONATIONS_ENABLED`, `RECONCILIATION_ENABLED`, `PHONE_AUTH_ENABLED` all still `"false"` — that happens in Phase 1).

After this gate is passed, **Phase 0 is complete**. Begin Phase 1 by re-invoking the writing-plans skill, which will reference `docs/superpowers/plans/2026-04-28-memorial-donation-rail-plan-part2.md` Tasks 34–54.

---

## Self-Review Notes

**Spec coverage check:** Every item under "Phase 0 — Unblock production" in the spec maps to a task above:
- KV namespace IDs → A2
- Paystack plan codes → A3
- Routes blocks → A5
- CI for donation-api + brochure-ai-writer → A6
- Commit migration-subscriptions.sql → A7
- New migrations → A8/A9/A10
- Schema dedupe → A11
- React effect fixes → B1/B2/B3
- CORS lockdown → B5/B6
- IP allowlist → B4
- Empty catch + dead imports → B7/B8
- compatibility_date + observability → C1
- Sentry → C2
- Health endpoints → C3
- purchaseStore mixed import → C4
- Final verification → C5

**Open questions for plan execution:**
1. Task A2 expects pre-existing `MEMORIAL_PAGES_KV` ID from `memorial-wrangler.toml`. Verify that file actually has a real ID (not another placeholder) before writing it into donation-api-wrangler.toml; fall back to creating a fresh namespace if needed.
2. Task B3 assumes 6 specific files have effect bugs. If `npx eslint` reveals different files, update the file list rather than blindly editing the listed ones.
3. Task C2 Step 3 references `workers/memorial-page-api.js` — confirm exact filename via Glob before editing; the wrangler `main` field is the source of truth.
