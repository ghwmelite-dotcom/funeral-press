# Campaign Creatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce 78 production-ready campaign creative PNGs (13 products × 2 formats × 3 audiences) that promote every FuneralPress product across every audience and channel, using a data-driven Puppeteer renderer.

**Architecture:** Source-of-truth data files (products + audiences + copy) feed two master HTML templates (`9-16.html` + `16-9.html`) that compose 13 per-product motif fragments. A Node.js renderer (`campaigns/render.mjs`) loops the matrix, substitutes slots, and screenshots each combination via Puppeteer to PNG at exact target dimensions.

**Tech Stack:** Node.js (ESM), Puppeteer (already in deps at `^24.39.0`), Vitest (already in deps), plain HTML/CSS for templates and motifs.

**Spec:** `docs/superpowers/specs/2026-05-20-campaign-creatives-design.md`

---

## File Structure

```
campaigns/
├── data/
│   ├── products.json        # 13 product records
│   ├── audiences.json       # 3 audience records
│   └── copy.json            # 39 copy cells (product × audience)
├── templates/
│   ├── 9-16.html            # Master vertical template
│   ├── 16-9.html            # Master wide template
│   └── motifs/              # 13 product-specific HTML/CSS fragments
│       ├── brochure.html
│       ├── poster.html
│       ├── invitation.html
│       ├── booklet.html
│       ├── banner.html
│       ├── thankyou.html
│       ├── memorial-page.html
│       ├── budget-planner.html
│       ├── collage.html
│       ├── qr-card.html
│       ├── wreath-card.html
│       ├── donation-receipt.html
│       └── slideshow.html
├── lib/
│   └── render-lib.mjs       # Pure functions: substitute(), loadData(), buildHtml() — tested with vitest
├── render.mjs               # CLI entry point that calls lib functions + Puppeteer
├── README.md                # How to re-render, swap copy, add a product
└── output/
    ├── _html/{format}/{product}-{audience}.html
    ├── 9-16/{product}-{audience}.png
    └── 16-9/{product}-{audience}.png

tests/
└── campaigns/
    └── render-lib.test.mjs  # Unit tests for substitution, data loading, matrix expansion
```

**Boundaries:**
- `lib/render-lib.mjs` is pure functions, no Puppeteer, no fs writes for output → unit-testable
- `render.mjs` is the I/O shell: file reads, Puppeteer browser, PNG writes
- Templates know nothing about products; motifs know nothing about copy; copy knows nothing about visuals
- Each motif is a self-contained HTML+CSS fragment that drops into `{{MOTIF}}` slot

---

## Task 1: Scaffold directory structure + npm scripts

**Files:**
- Create: `campaigns/` (directory structure only, empty for now)
- Modify: `package.json` (add scripts)
- Modify: `.gitignore` (add `campaigns/output/`)

- [ ] **Step 1: Create the campaigns directory tree**

Run:
```bash
mkdir -p campaigns/data campaigns/templates/motifs campaigns/lib campaigns/output/_html/9-16 campaigns/output/_html/16-9 campaigns/output/9-16 campaigns/output/16-9 tests/campaigns
```

- [ ] **Step 2: Add npm scripts to `package.json`**

Modify `package.json` — add to `scripts` block:

```json
"campaigns:render": "node campaigns/render.mjs",
"campaigns:test": "vitest run tests/campaigns"
```

The full `scripts` block should read:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "vite build && wrangler pages deploy dist",
  "test": "vitest run",
  "test:watch": "vitest",
  "campaigns:render": "node campaigns/render.mjs",
  "campaigns:test": "vitest run tests/campaigns"
},
```

- [ ] **Step 3: Add output dir + html cache to .gitignore**

Append to `.gitignore`:

```
campaigns/output/
```

(The hydrated HTML under `output/_html/` is regeneratable and shouldn't bloat the repo. Final PNGs will be distributed separately — designers/marketers download them, they're not source.)

- [ ] **Step 4: Commit**

```bash
git add campaigns/ package.json .gitignore
git -c commit.gpgsign=false commit -m "feat(campaigns): scaffold directory structure + npm scripts"
```

---

## Task 2: Author `products.json` data file

**Files:**
- Create: `campaigns/data/products.json`

- [ ] **Step 1: Write `campaigns/data/products.json`**

```json
[
  { "slug": "brochure",         "name": "Brochure",         "eyebrow": "FuneralPress · Brochures",         "motif": "brochure",         "default_sub": "11 elegant templates. AI helps write the tribute. Print-ready in minutes." },
  { "slug": "poster",           "name": "Poster",           "eyebrow": "FuneralPress · Posters",           "motif": "poster",           "default_sub": "Vertical or landscape. Print-ready PDF. Designed for dignity." },
  { "slug": "invitation",       "name": "Invitation",       "eyebrow": "FuneralPress · Invitations",       "motif": "invitation",       "default_sub": "Share by WhatsApp or print. RSVP tracking. Elegant by default." },
  { "slug": "booklet",          "name": "Programme Booklet","eyebrow": "FuneralPress · Booklets",          "motif": "booklet",          "default_sub": "Order of service, hymns, tributes — bound into one beautiful booklet." },
  { "slug": "banner",           "name": "Banner",           "eyebrow": "FuneralPress · Banners",           "motif": "banner",           "default_sub": "Venue-ready banners. Multiple sizes. Print or display digitally." },
  { "slug": "thankyou",         "name": "Thank-You Card",   "eyebrow": "FuneralPress · Thank-You Cards",   "motif": "thankyou",         "default_sub": "Personalised cards for every guest. Send by post or share digitally." },
  { "slug": "memorial-page",    "name": "Memorial Page",    "eyebrow": "FuneralPress · Memorial Pages",    "motif": "memorial-page",    "default_sub": "A permanent online tribute. Photos, stories, a shareable link." },
  { "slug": "budget-planner",   "name": "Budget Planner",   "eyebrow": "FuneralPress · Budget Planner",    "motif": "budget-planner",   "default_sub": "Track every cedi. Categorised expenses. Plan with clarity." },
  { "slug": "collage",          "name": "Photo Collage",    "eyebrow": "FuneralPress · Collages",          "motif": "collage",          "default_sub": "A life in pictures, beautifully arranged. Print or share." },
  { "slug": "qr-card",          "name": "QR Card",          "eyebrow": "FuneralPress · QR Cards",          "motif": "qr-card",          "default_sub": "One scan opens the full memorial page. Print, share, remember." },
  { "slug": "wreath-card",      "name": "Wreath Card",      "eyebrow": "FuneralPress · Wreath Cards",      "motif": "wreath-card",      "default_sub": "Sympathy cards with elegant floral motifs. Personalise in minutes." },
  { "slug": "donation-receipt", "name": "Donation Receipt", "eyebrow": "FuneralPress · Donation Receipts", "motif": "donation-receipt", "default_sub": "Acknowledge every contribution. Branded. Print or email instantly." },
  { "slug": "slideshow",        "name": "Slideshow",        "eyebrow": "FuneralPress · Slideshows",        "motif": "slideshow",        "default_sub": "A tribute slideshow ready in minutes. Music, photos, captions." }
]
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/data/products.json
git -c commit.gpgsign=false commit -m "feat(campaigns): products.json — 13 product records"
```

---

## Task 3: Author `audiences.json` data file

**Files:**
- Create: `campaigns/data/audiences.json`

- [ ] **Step 1: Write `campaigns/data/audiences.json`**

```json
[
  {
    "slug": "families",
    "tone": "empathy-first",
    "cta_verbs": ["Begin Gently", "Honour Them", "Start Free", "Design Now"]
  },
  {
    "slug": "directors",
    "tone": "professional",
    "cta_verbs": ["See Partner Plans", "Request a Demo", "Get Bulk Pricing", "Talk to Us"]
  },
  {
    "slug": "affiliates",
    "tone": "invitational",
    "cta_verbs": ["Join the Programme", "Start Earning", "Learn More", "Apply Now"]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/data/audiences.json
git -c commit.gpgsign=false commit -m "feat(campaigns): audiences.json — 3 audience records"
```

---

## Task 4: Build pure render-lib with TDD — failing test first

**Files:**
- Create: `tests/campaigns/render-lib.test.mjs`

- [ ] **Step 1: Write failing tests for the pure render-lib API**

Create `tests/campaigns/render-lib.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest'
import {
  substitute,
  buildMatrix,
  validateCell,
} from '../../campaigns/lib/render-lib.mjs'

describe('substitute', () => {
  it('replaces a single slot', () => {
    expect(substitute('hello {{NAME}}', { NAME: 'world' })).toBe('hello world')
  })

  it('replaces multiple slots', () => {
    const tpl = '{{A}} and {{B}}'
    expect(substitute(tpl, { A: 'foo', B: 'bar' })).toBe('foo and bar')
  })

  it('replaces repeated slots', () => {
    expect(substitute('{{X}} {{X}}', { X: 'yo' })).toBe('yo yo')
  })

  it('throws if a slot is missing from data', () => {
    expect(() => substitute('hi {{NAME}}', {})).toThrow(/missing slot: NAME/i)
  })

  it('leaves text untouched when no slots present', () => {
    expect(substitute('plain text', {})).toBe('plain text')
  })
})

describe('buildMatrix', () => {
  const products = [{ slug: 'brochure' }, { slug: 'poster' }]
  const audiences = [{ slug: 'families' }, { slug: 'directors' }]
  const formats = ['9-16', '16-9']

  it('returns one cell per (product × audience × format) combination', () => {
    const matrix = buildMatrix(products, audiences, formats)
    expect(matrix).toHaveLength(2 * 2 * 2)
  })

  it('each cell has product, audience, format keys', () => {
    const matrix = buildMatrix(products, audiences, formats)
    for (const cell of matrix) {
      expect(cell).toHaveProperty('product')
      expect(cell).toHaveProperty('audience')
      expect(cell).toHaveProperty('format')
    }
  })

  it('produces 78 cells for 13 × 3 × 2', () => {
    const ps = Array.from({ length: 13 }, (_, i) => ({ slug: `p${i}` }))
    const as = Array.from({ length: 3 }, (_, i) => ({ slug: `a${i}` }))
    expect(buildMatrix(ps, as, ['9-16', '16-9'])).toHaveLength(78)
  })
})

describe('validateCell', () => {
  it('passes a complete cell', () => {
    const copy = { brochure: { families: { hook: 'h', sub: 's', cta: 'c' } } }
    expect(() => validateCell(copy, 'brochure', 'families')).not.toThrow()
  })

  it('throws when product missing from copy', () => {
    expect(() => validateCell({}, 'brochure', 'families')).toThrow(/no copy for product: brochure/i)
  })

  it('throws when audience missing from copy', () => {
    const copy = { brochure: {} }
    expect(() => validateCell(copy, 'brochure', 'families')).toThrow(/no copy for audience: families/i)
  })

  it('throws when any required field is empty', () => {
    const copy = { brochure: { families: { hook: '', sub: 's', cta: 'c' } } }
    expect(() => validateCell(copy, 'brochure', 'families')).toThrow(/empty: hook/i)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npm run campaigns:test
```

Expected: All tests fail with `ERR_MODULE_NOT_FOUND` or similar — `render-lib.mjs` doesn't exist yet.

- [ ] **Step 3: Create the minimal implementation**

Create `campaigns/lib/render-lib.mjs`:

```javascript
/**
 * Pure functions for campaign rendering — no I/O, no Puppeteer.
 * Kept I/O-free so it's unit-testable with vitest.
 */

const SLOT_RE = /\{\{([A-Z_]+)\}\}/g

export function substitute(template, data) {
  return template.replace(SLOT_RE, (_, key) => {
    if (!(key in data)) {
      throw new Error(`substitute: missing slot: ${key}`)
    }
    return data[key]
  })
}

export function buildMatrix(products, audiences, formats) {
  const out = []
  for (const product of products) {
    for (const audience of audiences) {
      for (const format of formats) {
        out.push({ product, audience, format })
      }
    }
  }
  return out
}

export function validateCell(copy, productSlug, audienceSlug) {
  if (!copy[productSlug]) {
    throw new Error(`validateCell: no copy for product: ${productSlug}`)
  }
  if (!copy[productSlug][audienceSlug]) {
    throw new Error(`validateCell: no copy for audience: ${audienceSlug} under product: ${productSlug}`)
  }
  const cell = copy[productSlug][audienceSlug]
  for (const key of ['hook', 'sub', 'cta']) {
    if (!cell[key] || !cell[key].trim()) {
      throw new Error(`validateCell: copy field empty: ${key} (${productSlug}/${audienceSlug})`)
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run campaigns:test
```

Expected: All 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add campaigns/lib/render-lib.mjs tests/campaigns/render-lib.test.mjs
git -c commit.gpgsign=false commit -m "feat(campaigns): render-lib pure functions + tests"
```

---

## Task 5: Build the 16:9 master template

**Files:**
- Create: `campaigns/templates/16-9.html`

- [ ] **Step 1: Write `campaigns/templates/16-9.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; }
  body {
    background: radial-gradient(120% 100% at 30% 0%, #1A1828 0%, #0A0A0F 60%, #050507 100%);
    color: #F5EAD0;
    font-family: Georgia, 'Times New Roman', serif;
    position: relative;
  }
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(50% 40% at 50% 20%, rgba(201,168,76,0.10), transparent 70%);
    pointer-events: none;
  }
  .canvas {
    position: absolute;
    inset: 0;
    padding: 96px 110px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    z-index: 1;
  }
  .copy-col {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .eyebrow {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 22px;
    letter-spacing: 0.3em;
    color: #C9A84C;
    text-transform: uppercase;
  }
  .hook {
    font-size: 88px;
    line-height: 1.05;
    font-weight: 400;
    letter-spacing: -0.015em;
    color: #F5EAD0;
    margin-top: 36px;
    max-width: 760px;
  }
  .sub {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 26px;
    line-height: 1.5;
    color: rgba(245, 234, 208, 0.72);
    max-width: 680px;
    margin-bottom: 36px;
  }
  .cta-row { display: flex; align-items: center; gap: 28px; }
  .cta {
    display: inline-block;
    padding: 22px 40px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    letter-spacing: 0.22em;
    color: #0A0A0F;
    background: #C9A84C;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .url {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    color: rgba(245, 234, 208, 0.6);
    text-transform: lowercase;
  }
  .motif-col {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gold-rule {
    width: 80px; height: 1px;
    background: linear-gradient(90deg, transparent, #C9A84C, transparent);
    margin: 24px 0;
    opacity: 0.7;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="copy-col">
      <div>
        <div class="eyebrow">{{EYEBROW}}</div>
        <div class="hook">{{HOOK}}</div>
        <div class="gold-rule"></div>
      </div>
      <div>
        <div class="sub">{{SUB}}</div>
        <div class="cta-row">
          <span class="cta">{{CTA}}</span>
          <span class="url">funeralpress.org</span>
        </div>
      </div>
    </div>
    <div class="motif-col">
      {{MOTIF}}
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/templates/16-9.html
git -c commit.gpgsign=false commit -m "feat(campaigns): 16:9 master template"
```

---

## Task 6: Build the 9:16 master template

**Files:**
- Create: `campaigns/templates/9-16.html`

- [ ] **Step 1: Write `campaigns/templates/9-16.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body {
    background: radial-gradient(120% 80% at 50% 0%, #1A1828 0%, #0A0A0F 60%, #050507 100%);
    color: #F5EAD0;
    font-family: Georgia, 'Times New Roman', serif;
    position: relative;
  }
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(60% 35% at 50% 15%, rgba(201,168,76,0.12), transparent 70%);
    pointer-events: none;
  }
  .canvas {
    position: absolute;
    inset: 0;
    padding: 96px 80px;
    display: grid;
    grid-template-rows: auto auto 1fr auto auto;
    gap: 40px;
    z-index: 1;
    text-align: center;
  }
  .eyebrow {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 22px;
    letter-spacing: 0.3em;
    color: #C9A84C;
    text-transform: uppercase;
  }
  .hook {
    font-size: 72px;
    line-height: 1.1;
    font-weight: 400;
    letter-spacing: -0.015em;
    color: #F5EAD0;
  }
  .motif-row {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .sub {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 28px;
    line-height: 1.5;
    color: rgba(245, 234, 208, 0.72);
    max-width: 800px;
    margin: 0 auto;
  }
  .cta-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .cta {
    display: inline-block;
    padding: 24px 48px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 20px;
    letter-spacing: 0.22em;
    color: #0A0A0F;
    background: #C9A84C;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .url {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    color: rgba(245, 234, 208, 0.6);
    text-transform: lowercase;
  }
  .gold-rule {
    width: 100px; height: 1px;
    background: linear-gradient(90deg, transparent, #C9A84C, transparent);
    margin: 0 auto;
    opacity: 0.7;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="eyebrow">{{EYEBROW}}</div>
    <div>
      <div class="hook">{{HOOK}}</div>
      <div class="gold-rule" style="margin-top:32px;"></div>
    </div>
    <div class="motif-row">{{MOTIF}}</div>
    <div class="sub">{{SUB}}</div>
    <div class="cta-row">
      <span class="cta">{{CTA}}</span>
      <span class="url">funeralpress.org</span>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/templates/9-16.html
git -c commit.gpgsign=false commit -m "feat(campaigns): 9:16 master template"
```

---

## Task 7: Build motif — Brochure

**Files:**
- Create: `campaigns/templates/motifs/brochure.html`

- [ ] **Step 1: Write `campaigns/templates/motifs/brochure.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px;">
  <!-- Folded paper sheet -->
  <div style="position:absolute; inset: 10% 12%; background: linear-gradient(180deg, rgba(245,234,208,0.04) 0%, rgba(201,168,76,0.03) 100%); border: 1px solid rgba(201,168,76,0.35); border-radius: 4px;"></div>
  <!-- Vertical fold line -->
  <div style="position:absolute; left:50%; top: 10%; bottom: 10%; width: 1px; background: linear-gradient(180deg, transparent, rgba(201,168,76,0.5), transparent);"></div>
  <!-- Top-right corner crop -->
  <div style="position:absolute; right: 12%; top: 10%; width: 80px; height: 80px; background: linear-gradient(135deg, transparent 50%, rgba(201,168,76,0.25) 50%); border-left: 1px solid rgba(201,168,76,0.4); border-bottom: 1px solid rgba(201,168,76,0.4);"></div>
  <!-- Inscribed glyph centre -->
  <div style="position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); width: 140px; height: 140px; border: 1px solid rgba(201,168,76,0.45); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 64px; color: #C9A84C; opacity: 0.85;">&#10086;</div>
  <!-- Sub-fold indication lines -->
  <div style="position:absolute; left: 18%; right: 56%; top: 18%; height: 1px; background: rgba(201,168,76,0.18);"></div>
  <div style="position:absolute; left: 18%; right: 56%; top: 22%; height: 1px; background: rgba(201,168,76,0.12);"></div>
  <div style="position:absolute; left: 56%; right: 18%; bottom: 22%; height: 1px; background: rgba(201,168,76,0.18);"></div>
  <div style="position:absolute; left: 56%; right: 18%; bottom: 18%; height: 1px; background: rgba(201,168,76,0.12);"></div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/templates/motifs/brochure.html
git -c commit.gpgsign=false commit -m "feat(campaigns): brochure motif — folded paper"
```

---

## Task 8: Build the renderer (single-cell + matrix mode)

**Files:**
- Create: `campaigns/render.mjs`

- [ ] **Step 1: Write `campaigns/render.mjs`**

```javascript
#!/usr/bin/env node
/**
 * Campaign creative renderer.
 *
 * Usage:
 *   node campaigns/render.mjs                                         # render all 78
 *   node campaigns/render.mjs --product=brochure                      # 6 cells
 *   node campaigns/render.mjs --audience=families                     # 26 cells
 *   node campaigns/render.mjs --format=16-9                           # 39 cells
 *   node campaigns/render.mjs --product=brochure --audience=families --format=16-9   # 1 cell
 */

import puppeteer from 'puppeteer'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { substitute, buildMatrix, validateCell } from './lib/render-lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const FORMATS = {
  '9-16':  { w: 1080, h: 1920 },
  '16-9':  { w: 1920, h: 1080 },
}

function parseArgs(argv) {
  const out = {}
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

async function loadAll() {
  const products = JSON.parse(await readFile(resolve(ROOT, 'data/products.json'), 'utf8'))
  const audiences = JSON.parse(await readFile(resolve(ROOT, 'data/audiences.json'), 'utf8'))
  const copy = JSON.parse(await readFile(resolve(ROOT, 'data/copy.json'), 'utf8'))
  const templates = {
    '9-16': await readFile(resolve(ROOT, 'templates/9-16.html'), 'utf8'),
    '16-9': await readFile(resolve(ROOT, 'templates/16-9.html'), 'utf8'),
  }
  return { products, audiences, copy, templates }
}

async function loadMotif(motifKey) {
  return await readFile(resolve(ROOT, 'templates/motifs', `${motifKey}.html`), 'utf8')
}

function applyFilters(matrix, args) {
  return matrix.filter(c =>
    (!args.product  || c.product.slug  === args.product) &&
    (!args.audience || c.audience.slug === args.audience) &&
    (!args.format   || c.format        === args.format)
  )
}

async function renderCell(browser, cell, templates, copy) {
  const { product, audience, format } = cell
  validateCell(copy, product.slug, audience.slug)
  const cellCopy = copy[product.slug][audience.slug]
  const motif = await loadMotif(product.motif)
  const html = substitute(templates[format], {
    EYEBROW: product.eyebrow,
    HOOK: cellCopy.hook,
    SUB: cellCopy.sub,
    CTA: cellCopy.cta,
    MOTIF: motif,
  })

  const htmlPath = resolve(ROOT, 'output/_html', format, `${product.slug}-${audience.slug}.html`)
  await mkdir(dirname(htmlPath), { recursive: true })
  await writeFile(htmlPath, html, 'utf8')

  const { w, h } = FORMATS[format]
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' })
  const pngPath = resolve(ROOT, 'output', format, `${product.slug}-${audience.slug}.png`)
  await mkdir(dirname(pngPath), { recursive: true })
  await page.screenshot({ path: pngPath, type: 'png', clip: { x: 0, y: 0, width: w, height: h } })
  await page.close()
  return pngPath
}

async function main() {
  const args = parseArgs(process.argv)
  const { products, audiences, copy, templates } = await loadAll()
  const matrix = applyFilters(buildMatrix(products, audiences, Object.keys(FORMATS)), args)

  if (matrix.length === 0) {
    console.error('No cells matched filters:', args)
    process.exit(1)
  }

  console.log(`Rendering ${matrix.length} cell(s)…`)
  const browser = await puppeteer.launch({ headless: 'new' })
  try {
    let done = 0
    for (const cell of matrix) {
      const path = await renderCell(browser, cell, templates, copy)
      done++
      console.log(`[${done}/${matrix.length}] ${cell.format} · ${cell.product.slug} · ${cell.audience.slug}`)
    }
  } finally {
    await browser.close()
  }
  console.log(`Done. ${matrix.length} creative(s) rendered to campaigns/output/`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/render.mjs
git -c commit.gpgsign=false commit -m "feat(campaigns): render.mjs — puppeteer renderer with CLI filters"
```

---

## Task 9: Stub copy.json (single-cell validation gate)

**Files:**
- Create: `campaigns/data/copy.json`

- [ ] **Step 1: Write `campaigns/data/copy.json` with just Brochure × Families filled**

This minimal copy file unblocks the validation gate (§6.1 of the spec). All other cells stay empty for now and will be filled in Task 13.

```json
{
  "brochure": {
    "families":   { "hook": "When words are hard to find, the page can still be beautiful.", "sub": "11 elegant templates. AI helps write the tribute. Print-ready in minutes.", "cta": "Begin Gently" },
    "directors":  { "hook": "", "sub": "", "cta": "" },
    "affiliates": { "hook": "", "sub": "", "cta": "" }
  },
  "poster":           { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "invitation":       { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "booklet":          { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "banner":           { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "thankyou":         { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "memorial-page":    { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "budget-planner":   { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "collage":          { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "qr-card":          { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "wreath-card":      { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "donation-receipt": { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } },
  "slideshow":        { "families": { "hook": "", "sub": "", "cta": "" }, "directors": { "hook": "", "sub": "", "cta": "" }, "affiliates": { "hook": "", "sub": "", "cta": "" } }
}
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/data/copy.json
git -c commit.gpgsign=false commit -m "feat(campaigns): copy.json stub — brochure×families filled, rest empty"
```

---

## Task 10: Validation gate render + manual review

**Files:**
- No new files; verifies Tasks 1–9 produce a working pipeline.

- [ ] **Step 1: Render the single validation-gate cell**

Run:
```bash
npm run campaigns:render -- --product=brochure --audience=families --format=16-9
```

Expected output:
```
Rendering 1 cell(s)…
[1/1] 16-9 · brochure · families
Done. 1 creative(s) rendered to campaigns/output/
```

- [ ] **Step 2: Inspect the output PNG**

The file `campaigns/output/16-9/brochure-families.png` should exist. Open it. Verify against spec §6.1:

1. Brand fidelity — obsidian background, gold radial glow top-centre, ivory text, gold rule under hook
2. Motif legibility — folded paper sheet on right with fold line, gold corner crop, central glyph
3. Copy hierarchy — eyebrow (small gold caps) → hook (large serif) → sub (helvetica) → CTA pill → URL
4. Dimensions — exactly 1920×1080

Use:
```bash
node -e "const sharp = require('sharp'); sharp('campaigns/output/16-9/brochure-families.png').metadata().then(m => console.log(m.width + 'x' + m.height))" 2>/dev/null || node -e "import('puppeteer').then(()=>console.log('puppeteer ok'))"
```

(Or simply open the PNG in an image viewer and confirm the file dimensions in Properties.)

- [ ] **Step 3: If validation passes, also render the 9:16 vertical**

Run:
```bash
npm run campaigns:render -- --product=brochure --audience=families --format=9-16
```

Inspect `campaigns/output/9-16/brochure-families.png`. Confirm 1080×1920 dimensions, vertical layout per §3.3.

- [ ] **Step 4: Commit the validation outputs (HTML only, PNGs are gitignored)**

```bash
git add campaigns/output/_html/16-9/brochure-families.html campaigns/output/_html/9-16/brochure-families.html 2>/dev/null || true
git -c commit.gpgsign=false commit -m "test(campaigns): validation gate — brochure×families rendered in both formats" --allow-empty
```

(If the `_html/` outputs were gitignored under `campaigns/output/`, the commit is empty — that's fine; this is the manual-review milestone, not an artefact-commit gate.)

---

## Task 11: Build motifs 2–7 (paper + ceremonial family)

**Files:**
- Create: `campaigns/templates/motifs/poster.html`
- Create: `campaigns/templates/motifs/invitation.html`
- Create: `campaigns/templates/motifs/booklet.html`
- Create: `campaigns/templates/motifs/banner.html`
- Create: `campaigns/templates/motifs/thankyou.html`
- Create: `campaigns/templates/motifs/wreath-card.html`

- [ ] **Step 1: Write `poster.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Tall portrait frame -->
  <div style="position:relative; width: 280px; height: 420px; border: 2px solid #C9A84C; padding: 18px;">
    <div style="width: 100%; height: 100%; border: 1px solid rgba(201,168,76,0.5); display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 96px; color: #C9A84C; opacity:0.8;">&#9775;</div>
  </div>
  <!-- Vertical glow line behind -->
  <div style="position:absolute; left:50%; top:5%; bottom:5%; width: 1px; background: linear-gradient(180deg, transparent, rgba(201,168,76,0.4), transparent); transform: translateX(-50%); z-index:-1;"></div>
</div>
```

- [ ] **Step 2: Write `invitation.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Envelope body -->
  <div style="position:relative; width: 380px; height: 240px; background: linear-gradient(180deg, rgba(245,234,208,0.04), rgba(201,168,76,0.02)); border: 1px solid rgba(201,168,76,0.45);">
    <!-- Flap triangle -->
    <div style="position:absolute; left:0; top:0; right:0; height:140px; background: linear-gradient(180deg, rgba(245,234,208,0.06), transparent); clip-path: polygon(0 0, 100% 0, 50% 100%); border-bottom: 1px solid rgba(201,168,76,0.4);"></div>
    <!-- Wax seal -->
    <div style="position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); width: 84px; height: 84px; border-radius:50%; background: radial-gradient(circle at 35% 30%, #E0B97A, #C9A84C 50%, #8a7235); border: 2px solid #C9A84C; display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 36px; color: #0A0A0F; font-style: italic;">F</div>
  </div>
</div>
```

- [ ] **Step 3: Write `booklet.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Stacked pages -->
  <div style="position:relative; width: 320px; height: 420px;">
    <div style="position:absolute; left:24px; top:24px; width:280px; height:380px; background: rgba(245,234,208,0.03); border:1px solid rgba(201,168,76,0.2);"></div>
    <div style="position:absolute; left:12px; top:12px; width:280px; height:380px; background: rgba(245,234,208,0.04); border:1px solid rgba(201,168,76,0.3);"></div>
    <div style="position:absolute; left:0; top:0; width:280px; height:380px; background: linear-gradient(180deg, rgba(245,234,208,0.05), rgba(201,168,76,0.03)); border:1px solid rgba(201,168,76,0.5);"></div>
    <!-- Stitched spine -->
    <div style="position:absolute; left:0; top:8%; bottom:8%; width: 2px; border-left: 2px dashed #C9A84C;"></div>
    <!-- Inner ornament -->
    <div style="position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); font-family: Georgia, serif; font-size: 56px; color: #C9A84C; opacity:0.7;">&#10047;</div>
  </div>
</div>
```

- [ ] **Step 4: Write `banner.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Hanging cloth -->
  <div style="position:relative; width: 360px; height: 380px;">
    <!-- Rod -->
    <div style="position:absolute; left:-10px; right:-10px; top:0; height: 6px; background: linear-gradient(90deg, #8a7235, #C9A84C 50%, #8a7235); border-radius: 3px;"></div>
    <!-- Cloth -->
    <div style="position:absolute; left:0; right:0; top:6px; bottom:30px; background: linear-gradient(180deg, rgba(201,168,76,0.10), rgba(20,19,28,0.0)); border-left:1px solid rgba(201,168,76,0.4); border-right:1px solid rgba(201,168,76,0.4); border-bottom: 1px solid rgba(201,168,76,0.3); clip-path: polygon(0 0, 100% 0, 100% 92%, 50% 100%, 0 92%);"></div>
    <!-- Tassels -->
    <div style="position:absolute; left:-20px; top:0; width: 12px; height: 30px; background: linear-gradient(180deg, #C9A84C, transparent);"></div>
    <div style="position:absolute; right:-20px; top:0; width: 12px; height: 30px; background: linear-gradient(180deg, #C9A84C, transparent);"></div>
    <!-- Centre glyph -->
    <div style="position:absolute; left:50%; top:45%; transform: translate(-50%,-50%); font-family: Georgia, serif; font-size: 80px; color: #C9A84C; opacity:0.85;">&#10086;</div>
  </div>
</div>
```

- [ ] **Step 5: Write `thankyou.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Folded card -->
  <div style="position:relative; width: 380px; height: 280px; display:flex;">
    <div style="flex:1; background: linear-gradient(135deg, rgba(245,234,208,0.05), rgba(201,168,76,0.02)); border: 1px solid rgba(201,168,76,0.3); border-right: 1px solid rgba(201,168,76,0.5); box-shadow: inset -4px 0 8px rgba(0,0,0,0.3);"></div>
    <div style="flex:1; background: linear-gradient(225deg, rgba(245,234,208,0.06), rgba(201,168,76,0.03)); border: 1px solid rgba(201,168,76,0.45); display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-style: italic; font-size: 44px; color: #C9A84C; text-align:center; line-height: 1.1;">
      Thank<br>You
    </div>
  </div>
</div>
```

- [ ] **Step 6: Write `wreath-card.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <svg viewBox="0 0 400 400" width="380" height="380" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="leaf" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#E0B97A" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#C9A84C" stop-opacity="0.6"/>
      </linearGradient>
    </defs>
    <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(201,168,76,0.25)" stroke-width="1"/>
    <g fill="url(#leaf)" stroke="#C9A84C" stroke-width="0.5" opacity="0.85">
      <!-- 24 leaves around circle -->
      <g transform="translate(200,60)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(236,64) rotate(15)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(270,80) rotate(30)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(298,107) rotate(45)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(320,140) rotate(60)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(336,176) rotate(75)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(340,200) rotate(90)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(336,224) rotate(105)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(320,260) rotate(120)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(298,293) rotate(135)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(270,320) rotate(150)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(236,336) rotate(165)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(200,340) rotate(180)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(164,336) rotate(195)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(130,320) rotate(210)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(102,293) rotate(225)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(80,260) rotate(240)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(64,224) rotate(255)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(60,200) rotate(270)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(64,176) rotate(285)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(80,140) rotate(300)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(102,107) rotate(315)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(130,80) rotate(330)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
      <g transform="translate(164,64) rotate(345)"><ellipse cx="0" cy="0" rx="6" ry="14"/></g>
    </g>
    <!-- Ribbon at bottom -->
    <path d="M 170 320 Q 200 340 230 320 L 220 360 L 200 350 L 180 360 Z" fill="#C9A84C" opacity="0.9"/>
  </svg>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add campaigns/templates/motifs/poster.html campaigns/templates/motifs/invitation.html campaigns/templates/motifs/booklet.html campaigns/templates/motifs/banner.html campaigns/templates/motifs/thankyou.html campaigns/templates/motifs/wreath-card.html
git -c commit.gpgsign=false commit -m "feat(campaigns): 6 motifs — poster, invitation, booklet, banner, thankyou, wreath"
```

---

## Task 12: Build motifs 8–13 (digital + document family)

**Files:**
- Create: `campaigns/templates/motifs/memorial-page.html`
- Create: `campaigns/templates/motifs/budget-planner.html`
- Create: `campaigns/templates/motifs/collage.html`
- Create: `campaigns/templates/motifs/qr-card.html`
- Create: `campaigns/templates/motifs/donation-receipt.html`
- Create: `campaigns/templates/motifs/slideshow.html`

- [ ] **Step 1: Write `memorial-page.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Phone bezel -->
  <div style="position:relative; width: 240px; height: 480px; border: 4px solid #C9A84C; border-radius: 36px; padding: 14px; background: #050507;">
    <!-- Screen content -->
    <div style="width:100%; height:100%; background: linear-gradient(180deg, #14131C 0%, #0A0A0F 100%); border-radius: 22px; padding: 20px; display:flex; flex-direction:column; align-items:center; gap:14px;">
      <!-- Portrait disc -->
      <div style="width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle at 40% 30%, rgba(201,168,76,0.5), rgba(20,19,28,0.8)); border: 2px solid #C9A84C; margin-top: 20px;"></div>
      <!-- Name line -->
      <div style="width: 120px; height: 6px; background: rgba(201,168,76,0.6); border-radius: 1px;"></div>
      <div style="width: 80px; height: 4px; background: rgba(201,168,76,0.3); border-radius: 1px;"></div>
      <!-- Body lines -->
      <div style="display:flex; flex-direction:column; gap: 6px; width: 80%; margin-top: 20px;">
        <div style="height: 3px; background: rgba(245,234,208,0.2);"></div>
        <div style="height: 3px; background: rgba(245,234,208,0.2);"></div>
        <div style="height: 3px; background: rgba(245,234,208,0.15); width: 70%;"></div>
        <div style="height: 3px; background: rgba(245,234,208,0.2);"></div>
        <div style="height: 3px; background: rgba(245,234,208,0.15); width: 80%;"></div>
      </div>
      <!-- Link icon -->
      <div style="margin-top: auto; margin-bottom: 12px; font-family: Georgia, serif; font-size: 18px; color: #C9A84C;">&#128279;</div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Write `budget-planner.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px;">
  <!-- Ledger grid background -->
  <div style="position:absolute; inset: 8% 10%;
    background:
      repeating-linear-gradient(0deg, transparent 0px, transparent 38px, rgba(201,168,76,0.12) 38px, rgba(201,168,76,0.12) 39px),
      repeating-linear-gradient(90deg, transparent 0px, transparent 76px, rgba(201,168,76,0.06) 76px, rgba(201,168,76,0.06) 77px),
      linear-gradient(180deg, rgba(245,234,208,0.02), rgba(201,168,76,0.01));
    border: 1px solid rgba(201,168,76,0.35); border-radius: 4px;
  "></div>
  <!-- Oversized cedi mark -->
  <div style="position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); font-family: Georgia, serif; font-size: 280px; color: #C9A84C; opacity: 0.55; line-height:1; font-weight: 400;">&#8373;</div>
  <!-- Subtle row labels -->
  <div style="position:absolute; left: 14%; top: 14%; font-family: 'Courier New', monospace; font-size: 11px; color: rgba(201,168,76,0.5); letter-spacing: 0.1em;">VENUE &middot; 12,000</div>
  <div style="position:absolute; left: 14%; top: 18%; font-family: 'Courier New', monospace; font-size: 11px; color: rgba(201,168,76,0.5); letter-spacing: 0.1em;">FLOWERS &middot; 3,400</div>
  <div style="position:absolute; left: 14%; top: 22%; font-family: 'Courier New', monospace; font-size: 11px; color: rgba(201,168,76,0.5); letter-spacing: 0.1em;">PRINT &middot; 1,800</div>
</div>
```

- [ ] **Step 3: Write `collage.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <div style="display:grid; grid-template-columns: repeat(3, 110px); grid-template-rows: repeat(3, 110px); gap: 10px;">
    <div style="background: linear-gradient(135deg, rgba(245,234,208,0.10), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(201,168,76,0.10), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(245,234,208,0.06), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(201,168,76,0.08), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <!-- Focal frame -->
    <div style="background: radial-gradient(circle at 50% 40%, rgba(201,168,76,0.35), rgba(20,19,28,0.6)); border: 2px solid #C9A84C; display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 32px; color: #C9A84C;">&#9775;</div>
    <div style="background: linear-gradient(135deg, rgba(245,234,208,0.08), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(201,168,76,0.05), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(245,234,208,0.08), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
    <div style="background: linear-gradient(135deg, rgba(201,168,76,0.10), rgba(20,19,28,0.4)); border: 1px solid rgba(201,168,76,0.3);"></div>
  </div>
</div>
```

- [ ] **Step 4: Write `qr-card.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Outer card -->
  <div style="position:relative; width: 320px; height: 320px; border: 1px solid rgba(201,168,76,0.35); padding: 32px; background: linear-gradient(135deg, rgba(245,234,208,0.03), rgba(20,19,28,0.6));">
    <!-- Reticle brackets -->
    <div style="position:absolute; left:14px; top:14px; width:28px; height:28px; border-left:3px solid #C9A84C; border-top:3px solid #C9A84C;"></div>
    <div style="position:absolute; right:14px; top:14px; width:28px; height:28px; border-right:3px solid #C9A84C; border-top:3px solid #C9A84C;"></div>
    <div style="position:absolute; left:14px; bottom:14px; width:28px; height:28px; border-left:3px solid #C9A84C; border-bottom:3px solid #C9A84C;"></div>
    <div style="position:absolute; right:14px; bottom:14px; width:28px; height:28px; border-right:3px solid #C9A84C; border-bottom:3px solid #C9A84C;"></div>
    <!-- QR-like dot grid -->
    <div style="width:100%; height:100%;
      background-image: radial-gradient(rgba(201,168,76,0.7) 3px, transparent 3px);
      background-size: 18px 18px;
      opacity: 0.55;"></div>
    <!-- Centre glyph (hides some dots, mimics QR positioning square) -->
    <div style="position:absolute; left:50%; top:50%; transform: translate(-50%,-50%); width: 60px; height: 60px; background: #0A0A0F; border: 3px solid #C9A84C; display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 28px; color: #C9A84C;">F</div>
  </div>
</div>
```

- [ ] **Step 5: Write `donation-receipt.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Receipt sheet -->
  <div style="position:relative; width: 300px; height: 420px; background: linear-gradient(180deg, rgba(245,234,208,0.06), rgba(201,168,76,0.02)); border: 1px solid rgba(201,168,76,0.4);">
    <!-- Perforated top -->
    <div style="position:absolute; left:0; right:0; top:-4px; height: 8px; border-top: 2px dashed #C9A84C; opacity: 0.6;"></div>
    <!-- Header rule -->
    <div style="position:absolute; left:24px; right:24px; top:48px; height: 1px; background: rgba(201,168,76,0.4);"></div>
    <!-- Subtle lines representing rows -->
    <div style="position:absolute; left:24px; right:24px; top:80px;">
      <div style="height: 5px; background: rgba(245,234,208,0.15); margin-bottom: 10px;"></div>
      <div style="height: 5px; background: rgba(245,234,208,0.12); margin-bottom: 10px; width:80%;"></div>
      <div style="height: 5px; background: rgba(245,234,208,0.15); margin-bottom: 10px;"></div>
      <div style="height: 5px; background: rgba(245,234,208,0.10); margin-bottom: 10px; width:65%;"></div>
    </div>
    <!-- Watermark "RECEIVED" -->
    <div style="position:absolute; left:50%; top:55%; transform: translate(-50%,-50%) rotate(-18deg); font-family: Georgia, serif; font-size: 38px; color: #C9A84C; opacity: 0.35; letter-spacing: 0.15em; font-weight: 600;">RECEIVED</div>
    <!-- Gold stamp circle -->
    <div style="position:absolute; right: 24px; bottom: 24px; width: 80px; height: 80px; border: 3px solid #C9A84C; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-family: Georgia, serif; font-size: 11px; color: #C9A84C; text-align:center; line-height:1.1; opacity: 0.85;">FUNERAL<br>PRESS</div>
  </div>
</div>
```

- [ ] **Step 6: Write `slideshow.html`**

```html
<div style="position:relative; width:100%; height:100%; min-height:520px; display:flex; align-items:center; justify-content:center;">
  <!-- Film strip -->
  <div style="position:relative; width: 200px; height: 480px; background: #0A0A0F; border-left: 1px solid rgba(201,168,76,0.4); border-right: 1px solid rgba(201,168,76,0.4);">
    <!-- Sprocket holes left -->
    <div style="position:absolute; left:8px; top:0; bottom:0; width:10px; display:flex; flex-direction:column; justify-content:space-around;">
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
    </div>
    <!-- Sprocket holes right -->
    <div style="position:absolute; right:8px; top:0; bottom:0; width:10px; display:flex; flex-direction:column; justify-content:space-around;">
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
      <div style="width:10px; height:10px; background:#C9A84C; opacity:0.5;"></div>
    </div>
    <!-- Frames -->
    <div style="position:absolute; left: 32px; right: 32px; top: 18px; bottom: 18px; display:flex; flex-direction:column; gap: 10px;">
      <div style="flex:1; background: linear-gradient(180deg, rgba(201,168,76,0.30), rgba(201,168,76,0.05)); border:1px solid rgba(201,168,76,0.4);"></div>
      <div style="flex:1; background: linear-gradient(180deg, rgba(201,168,76,0.22), rgba(201,168,76,0.03)); border:1px solid rgba(201,168,76,0.35);"></div>
      <div style="flex:1; background: linear-gradient(180deg, rgba(201,168,76,0.30), rgba(201,168,76,0.05)); border:1px solid rgba(201,168,76,0.4);"></div>
      <div style="flex:1; background: linear-gradient(180deg, rgba(201,168,76,0.22), rgba(201,168,76,0.03)); border:1px solid rgba(201,168,76,0.35);"></div>
      <div style="flex:1; background: linear-gradient(180deg, rgba(201,168,76,0.30), rgba(201,168,76,0.05)); border:1px solid rgba(201,168,76,0.4);"></div>
    </div>
  </div>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add campaigns/templates/motifs/memorial-page.html campaigns/templates/motifs/budget-planner.html campaigns/templates/motifs/collage.html campaigns/templates/motifs/qr-card.html campaigns/templates/motifs/donation-receipt.html campaigns/templates/motifs/slideshow.html
git -c commit.gpgsign=false commit -m "feat(campaigns): 6 motifs — memorial-page, budget-planner, collage, qr-card, donation-receipt, slideshow"
```

---

## Task 13: Populate the full 39-cell copy bank

**Files:**
- Modify: `campaigns/data/copy.json` (replace entirely)

This task fills every empty cell. All copy follows the voice rules in spec §5.1: hooks ≤12 words, sub names one specific feature, CTA verb matches audience, URL always `funeralpress.org`, no clichés, no false urgency, affiliate copy frames earning as a byproduct of helping families.

- [ ] **Step 1: Replace `campaigns/data/copy.json` with complete 39-cell copy bank**

```json
{
  "brochure": {
    "families":   { "hook": "When words are hard to find, the page can still be beautiful.", "sub": "11 elegant templates. AI helps write the tribute. Print-ready in minutes.",         "cta": "Begin Gently" },
    "directors":  { "hook": "Offer every family a brochure they'll keep forever.",            "sub": "White-label templates. Bulk pricing. One workflow for 15+ memorial products.",      "cta": "See Partner Plans" },
    "affiliates": { "hook": "Every brochure printed is a family helped — and a commission earned.", "sub": "Generous recurring commissions. Free to join. Meaningful work.",          "cta": "Join the Programme" }
  },
  "poster": {
    "families":   { "hook": "A poster that does more than fill a wall — it holds a name.",    "sub": "Vertical or landscape. Print-ready PDF. Designed for dignity.",                   "cta": "Design Now" },
    "directors":  { "hook": "Funeral posters your families will frame at home.",              "sub": "Premium templates. Bulk-print discounts. Branded for your funeral home.",          "cta": "Get Bulk Pricing" },
    "affiliates": { "hook": "Help a family print the poster. Earn while you do.",             "sub": "Monthly recurring commissions. Free to join. Refer with pride.",                 "cta": "Start Earning" }
  },
  "invitation": {
    "families":   { "hook": "Invite them by name. Honour them by design.",                     "sub": "Share by WhatsApp or print. RSVP tracking. Elegant by default.",                  "cta": "Start Free" },
    "directors":  { "hook": "Invitations your families will be proud to send.",                "sub": "Custom-branded. Bulk-send. Tracked RSVPs all in one workflow.",                   "cta": "Request a Demo" },
    "affiliates": { "hook": "Every invitation sent is one more family served.",                "sub": "Recurring commissions on every package. Free to join. Help and earn.",          "cta": "Apply Now" }
  },
  "booklet": {
    "families":   { "hook": "The order of service, bound with the care it deserves.",          "sub": "Hymns, tributes, programme — all in one beautifully laid-out booklet.",          "cta": "Design Now" },
    "directors":  { "hook": "Programme booklets your clients will display, not discard.",      "sub": "Multi-page templates. Bulk print. Streamlined production for any service size.","cta": "Talk to Us" },
    "affiliates": { "hook": "Refer a family. Help them remember. Earn every month.",           "sub": "Generous commissions on every booklet. Free to join. Dignified work.",          "cta": "Join the Programme" }
  },
  "banner": {
    "families":   { "hook": "Their name, hung with the dignity it carries.",                   "sub": "Venue-ready sizes. Print or display digitally. Designed in minutes.",            "cta": "Honour Them" },
    "directors":  { "hook": "Banners that make the venue feel like a tribute.",                "sub": "Multiple sizes. Print-ready. White-label for your funeral home.",                "cta": "See Partner Plans" },
    "affiliates": { "hook": "Help a venue feel sacred. Earn while you help.",                  "sub": "Monthly recurring commissions. Free to join. Work that means something.",       "cta": "Learn More" }
  },
  "thankyou": {
    "families":   { "hook": "Say thank you. Say it beautifully.",                              "sub": "Personalised cards for every guest. Send by post or share digitally.",           "cta": "Design Now" },
    "directors":  { "hook": "Thank-you cards your families won't have to think about.",        "sub": "Bulk personalisation. Branded for your funeral home. One streamlined workflow.","cta": "Request a Demo" },
    "affiliates": { "hook": "Every card sent is gratitude — and a commission.",                "sub": "Recurring earnings. Free to join. Help families honour every guest.",           "cta": "Start Earning" }
  },
  "memorial-page": {
    "families":   { "hook": "A page that holds their story, long after the day is done.",     "sub": "Photos, tributes, a shareable link. Permanent. Beautiful. Free to begin.",        "cta": "Begin Gently" },
    "directors":  { "hook": "Give every family a permanent online tribute — under your brand.","sub": "White-label memorial pages. Branded URL. Included in your partner plan.",        "cta": "Get Bulk Pricing" },
    "affiliates": { "hook": "Every memorial page is a family who'll remember your help.",     "sub": "Recurring commissions. Free to join. Work that lasts longer than a month.",     "cta": "Apply Now" }
  },
  "budget-planner": {
    "families":   { "hook": "Track every cedi. Honour every choice.",                          "sub": "Categorised expenses. Plan with clarity. Free to use.",                          "cta": "Start Free" },
    "directors":  { "hook": "Give every client clear costs and zero surprises.",               "sub": "Branded budget tools your families share with you live. Included in partner plans.","cta": "See Partner Plans" },
    "affiliates": { "hook": "Help a family plan with peace of mind. Earn every month.",        "sub": "Monthly recurring commissions. Free to join. Work that lifts a weight.",        "cta": "Join the Programme" }
  },
  "collage": {
    "families":   { "hook": "Their life, beautifully arranged.",                                "sub": "A photo collage in minutes. Print, share, or include in the slideshow.",         "cta": "Design Now" },
    "directors":  { "hook": "Collages that turn a service into a memory.",                      "sub": "Bulk templates. Premium output. One workflow for every product you offer.",      "cta": "Talk to Us" },
    "affiliates": { "hook": "Every collage printed is a family helped to remember.",            "sub": "Recurring commissions. Free to join. Meaningful, monthly earnings.",            "cta": "Start Earning" }
  },
  "qr-card": {
    "families":   { "hook": "Scan. Remember. Share their story.",                               "sub": "One scan opens their memorial page. Print on the brochure or as a card.",       "cta": "Design Now" },
    "directors":  { "hook": "Add a QR card to every package. Add value to every service.",      "sub": "Auto-linked to memorial pages. Branded. Included in your partner plan.",        "cta": "Request a Demo" },
    "affiliates": { "hook": "Every QR scanned is one more family who remembers your help.",     "sub": "Recurring commissions. Free to join. Tech that serves grief.",                  "cta": "Learn More" }
  },
  "wreath-card": {
    "families":   { "hook": "A sympathy card worthy of what's been lost.",                      "sub": "Elegant floral motifs. Personalise in minutes. Print or share digitally.",       "cta": "Honour Them" },
    "directors":  { "hook": "Branded wreath cards for every family you serve.",                  "sub": "White-label. Bulk-print. Premium output for premium funeral homes.",            "cta": "See Partner Plans" },
    "affiliates": { "hook": "Help a friend grieve. Earn while you help.",                       "sub": "Recurring monthly commissions. Free to join. Dignified work.",                  "cta": "Apply Now" }
  },
  "donation-receipt": {
    "families":   { "hook": "Acknowledge every kindness. Beautifully.",                          "sub": "Branded donation receipts. Print or email instantly. Always at hand.",           "cta": "Design Now" },
    "directors":  { "hook": "Donation receipts that match the dignity of the service.",          "sub": "Branded under your funeral home. Bulk export. Audit-ready.",                     "cta": "Get Bulk Pricing" },
    "affiliates": { "hook": "Help families thank their donors. Earn every month.",               "sub": "Recurring commissions. Free to join. Work that quietly matters.",               "cta": "Join the Programme" }
  },
  "slideshow": {
    "families":   { "hook": "Their life, frame by tender frame.",                                "sub": "A tribute slideshow ready in minutes. Music, photos, captions.",                 "cta": "Begin Gently" },
    "directors":  { "hook": "Slideshows that fill the silence at every service.",                "sub": "Branded for your funeral home. Bulk production. Premium output.",               "cta": "Talk to Us" },
    "affiliates": { "hook": "Every slideshow shown is a family who'll remember the help.",       "sub": "Generous recurring commissions. Free to join. Help and earn.",                  "cta": "Start Earning" }
  }
}
```

- [ ] **Step 2: Verify the JSON parses**

Run:
```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('campaigns/data/copy.json','utf8'))).length + ' products')"
```

Expected: `13 products`

- [ ] **Step 3: Commit**

```bash
git add campaigns/data/copy.json
git -c commit.gpgsign=false commit -m "feat(campaigns): full 39-cell copy bank"
```

---

## Task 14: Add full-matrix integration test

**Files:**
- Create: `tests/campaigns/data.test.mjs`

- [ ] **Step 1: Write data-completeness tests**

Create `tests/campaigns/data.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { validateCell, buildMatrix } from '../../campaigns/lib/render-lib.mjs'

const root = resolve(process.cwd(), 'campaigns/data')
const products = JSON.parse(readFileSync(resolve(root, 'products.json'), 'utf8'))
const audiences = JSON.parse(readFileSync(resolve(root, 'audiences.json'), 'utf8'))
const copy = JSON.parse(readFileSync(resolve(root, 'copy.json'), 'utf8'))

describe('data files', () => {
  it('products.json has 13 entries', () => {
    expect(products).toHaveLength(13)
  })

  it('every product has slug, name, eyebrow, motif, default_sub', () => {
    for (const p of products) {
      expect(p.slug).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.eyebrow).toBeTruthy()
      expect(p.motif).toBeTruthy()
      expect(p.default_sub).toBeTruthy()
    }
  })

  it('audiences.json has 3 entries', () => {
    expect(audiences).toHaveLength(3)
  })

  it('every audience has slug, tone, cta_verbs', () => {
    for (const a of audiences) {
      expect(a.slug).toBeTruthy()
      expect(a.tone).toBeTruthy()
      expect(Array.isArray(a.cta_verbs)).toBe(true)
      expect(a.cta_verbs.length).toBeGreaterThan(0)
    }
  })

  it('copy.json has every (product × audience) cell fully populated', () => {
    for (const p of products) {
      for (const a of audiences) {
        expect(() => validateCell(copy, p.slug, a.slug)).not.toThrow()
      }
    }
  })

  it('every hook is at most 12 words', () => {
    for (const p of products) {
      for (const a of audiences) {
        const hook = copy[p.slug][a.slug].hook
        const words = hook.split(/\s+/).filter(Boolean)
        expect(words.length, `hook too long: ${p.slug}/${a.slug}: "${hook}"`).toBeLessThanOrEqual(12)
      }
    }
  })

  it('matrix expansion yields 78 cells', () => {
    const matrix = buildMatrix(products, audiences, ['9-16', '16-9'])
    expect(matrix).toHaveLength(78)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npm run campaigns:test
```

Expected: All tests pass, including the original 12 from Task 4 + 6 new data tests = 18 total.

- [ ] **Step 3: Commit**

```bash
git add tests/campaigns/data.test.mjs
git -c commit.gpgsign=false commit -m "test(campaigns): data completeness + hook length validation"
```

---

## Task 15: Full render — produce all 78 creatives

**Files:**
- No new files; runs the renderer against the now-complete data.

- [ ] **Step 1: Run the full matrix**

Run:
```bash
npm run campaigns:render
```

Expected output ends with:
```
[78/78] 16-9 · slideshow · affiliates
Done. 78 creative(s) rendered to campaigns/output/
```

(Order may differ but total must be 78.)

- [ ] **Step 2: Verify the output directory has 78 PNGs**

Run:
```bash
node -e "import('fs').then(fs => { const a = fs.readdirSync('campaigns/output/9-16').filter(f=>f.endsWith('.png')).length; const b = fs.readdirSync('campaigns/output/16-9').filter(f=>f.endsWith('.png')).length; console.log('9-16:', a, '| 16-9:', b, '| total:', a+b); })"
```

Expected: `9-16: 39 | 16-9: 39 | total: 78`

- [ ] **Step 3: Spot-check 3 PNGs from different cells**

Open in an image viewer:
- `campaigns/output/16-9/qr-card-directors.png`
- `campaigns/output/9-16/budget-planner-affiliates.png`
- `campaigns/output/16-9/slideshow-families.png`

For each, confirm:
- Correct dimensions (1920×1080 or 1080×1920)
- Eyebrow matches product
- Hook matches audience tone
- Motif is product-appropriate
- CTA + `funeralpress.org` visible
- No layout overflow, no clipped text

- [ ] **Step 4: Commit the rendered HTML (PNGs stay gitignored)**

PNGs are gitignored under `campaigns/output/`. The hydrated `_html/` files are also gitignored as configured in Task 1 (under `campaigns/output/`). This step has no artefacts to commit; if spot-check passes, simply proceed.

```bash
git -c commit.gpgsign=false commit --allow-empty -m "milestone(campaigns): all 78 creatives rendered and spot-checked"
```

---

## Task 16: Write `campaigns/README.md`

**Files:**
- Create: `campaigns/README.md`

- [ ] **Step 1: Write `campaigns/README.md`**

```markdown
# FuneralPress Campaign Creatives

This directory produces **78 campaign creative images** — 13 products × 2 formats (9:16 + 16:9) × 3 audiences (families · directors · affiliates).

**Design spec:** `docs/superpowers/specs/2026-05-20-campaign-creatives-design.md`

## Run

```bash
npm run campaigns:render                                            # all 78
npm run campaigns:render -- --product=brochure                      # 6 (one product × 3 audiences × 2 formats)
npm run campaigns:render -- --audience=families                     # 26 (one audience × all products × both formats)
npm run campaigns:render -- --format=16-9                           # 39 (one format × all products × all audiences)
npm run campaigns:render -- --product=brochure --audience=families --format=16-9   # 1
```

Output:
- `campaigns/output/9-16/{product}-{audience}.png` (1080×1920)
- `campaigns/output/16-9/{product}-{audience}.png` (1920×1080)
- `campaigns/output/_html/{format}/{product}-{audience}.html` — hydrated HTML for audit / iteration

## Test

```bash
npm run campaigns:test
```

Tests cover: template substitution, matrix expansion, data completeness, and hook word-count voice rule.

## Edit copy without re-doing visuals

Edit `campaigns/data/copy.json` directly — every cell is `{ hook, sub, cta }`. Re-render only the cells you changed:

```bash
npm run campaigns:render -- --product=brochure --audience=directors
```

## Add a 14th product

1. Add a record to `campaigns/data/products.json` with a new `slug` and `motif` key
2. Create `campaigns/templates/motifs/{motif}.html` — follow the pattern of existing motifs (self-contained HTML+CSS, no external assets, 520px min-height)
3. Add three copy cells (families/directors/affiliates) to `campaigns/data/copy.json` under the new product slug
4. Run `npm run campaigns:test` — the data test will confirm all cells are present
5. Run `npm run campaigns:render -- --product={new-slug}` — produces 6 new creatives

## Add a 4th audience

1. Add a record to `campaigns/data/audiences.json`
2. Add a new cell under each of the 13 products in `campaigns/data/copy.json` for the new audience
3. Run `npm run campaigns:test` — confirms completeness
4. Run `npm run campaigns:render -- --audience={new-slug}` — produces 26 new creatives

## Voice rules

All copy obeys `ad-generation-prompt.md`:
- Hook ≤ 12 words; one image, one verb
- Sub-line names ONE specific feature
- CTA verb matches audience: families = gentle, directors = professional, affiliates = invitational
- URL always rendered as `funeralpress.org`
- No clichés ("in these difficult times"), no false urgency, no specific earnings amounts
- Affiliate copy frames earning as a byproduct of helping families

## Architecture

```
data/         → source of truth (products, audiences, copy)
templates/    → master HTML for each format
templates/motifs/  → one self-contained visual fragment per product
lib/render-lib.mjs → pure functions (substitute, buildMatrix, validateCell)
render.mjs    → CLI + Puppeteer (loads data, expands matrix, writes PNG)
output/       → generated artefacts (gitignored)
```

Each layer is independent: templates know nothing about products, motifs know nothing about copy, copy knows nothing about visuals. Three units that compose at render time.
```

- [ ] **Step 2: Commit**

```bash
git add campaigns/README.md
git -c commit.gpgsign=false commit -m "docs(campaigns): README — usage, copy editing, extending"
```

---

## Done

After all 16 tasks: 78 production-ready campaign PNGs in `campaigns/output/`, a re-runnable renderer, complete test coverage of the pure logic, and a README a designer or marketer can follow without engineering help. Adding a product or audience is a documented 4-step process.
