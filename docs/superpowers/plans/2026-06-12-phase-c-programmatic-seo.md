# Phase C: Programmatic SEO/AEO Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FuneralPress the page Google and AI answer engines cite for funeral-intent queries — per spec `docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md` §4 + §5.3.

**Architecture:** Hymn detail pages are data-driven SPA routes (slug-based, schema-rich, prerendered to static HTML by the existing Puppeteer pipeline, parallelized). Obituary indexing becomes explicit opt-in: a D1 flag, default-noindex meta, and a worker-served obituary sitemap cross-declared in robots.txt. The blog gains a D1 draft/publish layer: a weekly cron drafts posts via Workers AI, the owner approves in a new admin tab, published posts merge with the static posts on the frontend and (fail-soft) into the build-time feeds/sitemap. AEO ships as PageMeta extensions (speakable/HowTo/raw JSON-LD) applied to product, regional, diaspora, and hymn pages. The §5.3 weekly growth report is a Monday cron emailing D1-derived metrics via Resend.

**Tech Stack:** React 19 + react-helmet-async, Cloudflare Workers + D1 + Workers AI (`@cf/meta/llama-3.1-8b-instruct`), Resend, Puppeteer prerender (existing), Vitest.

---

## Spec corrections discovered during planning (owner-visible)

1. **The hymn library has 25 hymns, not 11,000** (spec §4.3's "goldmine" sizing came from the early marketing briefing and is wrong by three orders of magnitude). This plan builds the full programmatic hymn-page infrastructure — slugs, schema, related-hymns, copyright gate, sitemap/prerender integration — which works for 25 today and scales to thousands without code changes. **Dataset expansion (public-domain hymnal import) is a separate data-acquisition initiative**, already sketched in the older Phase-3D plan; the batched-rollout/Search-Console guidance in spec §4.3 applies when that lands.
2. **Obituaries are indexable today** (no noindex anywhere) — spec §4.4's "current privacy posture unchanged (default noindex)" was wrong. This plan introduces default-noindex with explicit opt-in, which is a **behavior change for existing obituaries**: they become non-indexable unless the family opts in. This matches the spec's consent intent; flagging because it's technically a regression in incidental discoverability.
3. **§4.1–§4.2 are largely done already:** robots.txt already explicitly welcomes GPTBot/ClaudeBot/PerplexityBot/Applebot; the 16 regional pages, 4 product landing pages, dynamic sitemap, and prerender pipeline all exist. Remaining: `llms.txt`, `Google-Extended` rule, a crawler-access verification script (the Cloudflare BIC config that broke the feeds may still block these bots at the edge — robots.txt is irrelevant if the edge 403s), and the owner's Cloudflare dashboard check.
4. **The blog is a static file** (`src/data/blogPosts.js` compiled into the bundle), so spec §4.6's "drafts land in the admin dashboard" requires a D1 layer. Published D1 posts appear on the site immediately (client fetch) and join the build-time feeds/sitemap at the next deploy (CI rebuilds on merge) — the feeds/sitemap plugins also fetch published posts at build time, fail-soft.
5. **§5.3's "top organic landing pages" metric is not derivable server-side** (GA4 only); the weekly report substitutes first-party D1 metrics (loop funnel by surface, signups, revenue by currency, referral grants) and notes GSC as the place to read organic queries. Google Search Console verification is an owner dashboard action (documented in Task 16); no code can substitute for it.

---

### Task 1: Crawler pre-flight — llms.txt, robots additions, verification script

**Files:**
- Create: `public/llms.txt`, `scripts/check-crawlers.mjs`
- Modify: `public/robots.txt`

- [ ] **Step 1: Create `public/llms.txt`**

```
# FuneralPress — https://funeralpress.org
> FuneralPress is a funeral design and memorial platform built for Ghana and the
> West African diaspora. Families design funeral brochures (order of service),
> posters, invitations and thank-you cards in minutes; create permanent memorial
> pages with guest books and live-streamed services; plan budgets together
> across countries; and order printing delivered anywhere in Ghana.

## Key pages
- [Funeral brochure designer](https://funeralpress.org/funeral-brochure-designer): print-ready funeral programmes with Ghanaian themes
- [Memorial page creator](https://funeralpress.org/memorial-page-creator): permanent online tributes with guest books and live streams
- [Funeral hymns library](https://funeralpress.org/hymns): funeral hymn lyrics in English and Twi
- [Budget planner](https://funeralpress.org/budget-planner): shared funeral budget tracking for families
- [Plan a funeral in Ghana from abroad](https://funeralpress.org/diaspora/plan-a-funeral-in-ghana-from-abroad): diaspora planning guide
- [Regional funeral services](https://funeralpress.org/funeral-services/greater-accra): venue and planning guides for all 16 Ghana regions
- [Blog](https://funeralpress.org/blog): funeral planning guides and cost breakdowns

## Facts
- Funerals in Ghana typically cost GHS 30,000–100,000+; design and printing is a small fraction of that.
- FuneralPress supports payment in Ghana cedis (mobile money via Paystack) and pounds/dollars (cards via Stripe).
- The platform is free to use; payment is only required to download watermark-free designs.
```

- [ ] **Step 2: Add Google-Extended to `public/robots.txt`** — append after the existing PerplexityBot block, mirroring its exact Allow/Disallow list (read the file; the bot blocks share one list):

```
User-agent: Google-Extended
Allow: /
# (same Disallow list as the other AI crawler blocks — copy it verbatim)
```

- [ ] **Step 3: Create `scripts/check-crawlers.mjs`** — verifies the EDGE actually serves these bots (robots.txt is meaningless if Cloudflare's bot config 403s them, as it did for the feeds):

```javascript
// scripts/check-crawlers.mjs
// Verifies AI/search crawlers can fetch production pages through Cloudflare.
// Run: node scripts/check-crawlers.mjs [base-url]
// Exit 0 = all pass; exit 1 = at least one blocked (fix via Cloudflare
// Configuration Rule, same as the feeds BIC fix).

const BASE = process.argv[2] || 'https://funeralpress.org'
const BOTS = {
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  ClaudeBot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'Google-Extended': 'Mozilla/5.0 (compatible; Google-Extended/1.0)',
  Googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
}
const PATHS = ['/', '/hymns', '/blog', '/funeral-services/greater-accra', '/diaspora/plan-a-funeral-in-ghana-from-abroad', '/sitemap.xml', '/rss.xml']

let failed = 0
for (const [bot, ua] of Object.entries(BOTS)) {
  for (const path of PATHS) {
    try {
      const res = await fetch(BASE + path, { headers: { 'User-Agent': ua }, redirect: 'follow' })
      const ok = res.status >= 200 && res.status < 400
      if (!ok) failed++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(res.status).padEnd(4)} ${bot.padEnd(16)} ${path}`)
    } catch (e) {
      failed++
      console.log(`FAIL  ERR  ${bot.padEnd(16)} ${path}  ${e.message}`)
    }
  }
}
console.log(failed ? `\n${failed} checks FAILED — add a Cloudflare Configuration Rule (disable Bot Fight Mode / browser integrity check) for these user agents or paths, as was done for the feed paths.` : '\nAll crawler checks passed.')
process.exit(failed ? 1 : 0)
```

- [ ] **Step 4: Run it against production**: `node scripts/check-crawlers.mjs` — record the results in your report. Failures are EXPECTED if the BIC config still blocks bots; the fix is an owner Cloudflare-dashboard action (documented in Task 16) — do not attempt it yourself.
- [ ] **Step 5: Commit**

```bash
git add public/llms.txt public/robots.txt scripts/check-crawlers.mjs
git commit -m "feat(seo): llms.txt, Google-Extended robots rule, crawler edge-access checker"
```

---

### Task 2: PageMeta extensions — speakable, HowTo, raw JSON-LD (TDD)

**Files:**
- Modify: `src/components/seo/PageMeta.jsx`
- Test: `src/components/seo/__tests__/PageMeta.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/seo/__tests__/PageMeta.test.jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import PageMeta from '../PageMeta.jsx'

function getJsonLdScripts(helmetContext) {
  const helmet = helmetContext.helmet
  // react-helmet-async exposes scripts via toString in tests
  return helmet.script.toString()
}

describe('PageMeta structured data extensions', () => {
  it('emits SpeakableSpecification when speakable selectors are given', () => {
    const ctx = {}
    render(
      <HelmetProvider context={ctx}>
        <PageMeta title="T" description="D" path="/x" speakable={['.intro', 'h1']} />
      </HelmetProvider>
    )
    const scripts = getJsonLdScripts(ctx)
    expect(scripts).toContain('SpeakableSpecification')
    expect(scripts).toContain('.intro')
  })

  it('emits HowTo schema when howTo is given', () => {
    const ctx = {}
    render(
      <HelmetProvider context={ctx}>
        <PageMeta
          title="T" description="D" path="/x"
          howTo={{ name: 'How to create a funeral brochure', steps: [
            { name: 'Choose a theme', text: 'Pick from Ghanaian themes like Kente Gold.' },
            { name: 'Add their story', text: 'Upload photos and write the biography.' },
          ] }}
        />
      </HelmetProvider>
    )
    const scripts = getJsonLdScripts(ctx)
    expect(scripts).toContain('"HowTo"')
    expect(scripts).toContain('HowToStep')
    expect(scripts).toContain('Choose a theme')
  })

  it('emits arbitrary jsonLd objects verbatim', () => {
    const ctx = {}
    render(
      <HelmetProvider context={ctx}>
        <PageMeta title="T" description="D" path="/x"
          jsonLd={{ '@context': 'https://schema.org', '@type': 'MusicComposition', name: 'Abide With Me' }} />
      </HelmetProvider>
    )
    const scripts = getJsonLdScripts(ctx)
    expect(scripts).toContain('MusicComposition')
    expect(scripts).toContain('Abide With Me')
  })

  it('emits none of the above when props are absent (no regressions)', () => {
    const ctx = {}
    render(
      <HelmetProvider context={ctx}>
        <PageMeta title="T" description="D" path="/x" />
      </HelmetProvider>
    )
    const scripts = getJsonLdScripts(ctx)
    expect(scripts).not.toContain('SpeakableSpecification')
    expect(scripts).not.toContain('"HowTo"')
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run src/components/seo/__tests__/PageMeta.test.jsx`)
- [ ] **Step 3: Extend `PageMeta.jsx`** — add three props (`speakable`, `howTo`, `jsonLd`) to the signature and three memoized schema builders following the file's existing pattern (see the `faqSchema` useMemo as the model):

```jsx
  const speakableSchema = useMemo(
    () =>
      speakable?.length
        ? JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            '@id': url,
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: speakable,
            },
          })
        : null,
    [speakable, url],
  )

  const howToSchema = useMemo(
    () =>
      howTo?.steps?.length
        ? JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: howTo.name,
            step: howTo.steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.name,
              text: s.text,
            })),
          })
        : null,
    [howTo],
  )

  const extraJsonLd = useMemo(
    () => (jsonLd ? JSON.stringify(jsonLd) : null),
    [jsonLd],
  )
```

And render them next to the existing schema script tags:

```jsx
      {speakableSchema && <script type="application/ld+json">{speakableSchema}</script>}
      {howToSchema && <script type="application/ld+json">{howToSchema}</script>}
      {extraJsonLd && <script type="application/ld+json">{extraJsonLd}</script>}
```

- [ ] **Step 4: Run — expect PASS (4 tests)**, then `npx vitest run` full suite (no regressions).
- [ ] **Step 5: Commit**

```bash
git add src/components/seo/PageMeta.jsx src/components/seo/__tests__/PageMeta.test.jsx
git commit -m "feat(seo): PageMeta speakable, HowTo, and raw JSON-LD support"
```

---

### Task 3: Hymn data upgrade — slugs, public-domain flags, category notes (TDD)

**Files:**
- Modify: `src/data/hymns.js` (all 25 records)
- Create: `src/data/hymnMeta.js`
- Test: `src/data/__tests__/hymns.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// src/data/__tests__/hymns.test.js
import { describe, it, expect } from 'vitest'
import { hymns } from '../hymns.js'
import { CATEGORY_NOTES, relatedHymns, hymnSlug } from '../hymnMeta.js'

describe('hymn data integrity', () => {
  it('every hymn has a unique, url-safe slug', () => {
    const slugs = hymns.map((h) => h.slug)
    expect(new Set(slugs).size).toBe(hymns.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
  it('every hymn declares publicDomain explicitly', () => {
    for (const h of hymns) expect(typeof h.publicDomain).toBe('boolean')
  })
  it('hymnSlug derives the stored slug shape', () => {
    expect(hymnSlug('Abide With Me')).toBe('abide-with-me')
    expect(hymnSlug('Onyame Ne Hene')).toBe('onyame-ne-hene')
  })
  it('every category has occasion notes', () => {
    const categories = [...new Set(hymns.map((h) => h.category))]
    for (const c of categories) {
      expect(CATEGORY_NOTES[c], `missing notes for ${c}`).toBeTruthy()
      expect(CATEGORY_NOTES[c].length).toBeGreaterThan(120)
    }
  })
  it('relatedHymns returns up to 5 same-category hymns, excluding self', () => {
    const target = hymns[0]
    const related = relatedHymns(target, hymns, 5)
    expect(related.length).toBeLessThanOrEqual(5)
    expect(related.every((h) => h.slug !== target.slug)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Create `src/data/hymnMeta.js`**

```javascript
// src/data/hymnMeta.js
// Per-category occasion context for hymn pages (anti-thin-content, spec §4.3)
// and helpers shared by the hymn page and sitemap/prerender collection.

export const CATEGORY_NOTES = {
  processional:
    'Processional hymns open the funeral service as the casket and family enter. In Ghanaian services they set a tone of solemn dignity — steady, familiar melodies the whole congregation can carry. They are usually printed first in the order of service, often alongside the opening prayer.',
  worship:
    'Worship and praise hymns lift the congregation in the thanksgiving portions of a Ghanaian funeral — especially the thanksgiving service and the one-week observance. Twi praise hymns are often sung unaccompanied with clapping, and many families choose at least one hymn in the language their loved one prayed in.',
  comfort:
    'Hymns of comfort speak directly to the bereaved — assurance, rest, and the hope of reunion. They are commonly sung after tributes, when grief in the room is at its heaviest, and are among the most requested hymns for funeral brochures in both English and Twi.',
  committal:
    'Committal hymns accompany the graveside service as the body is laid to rest. They are short, weighty, and traditionally sung as the family takes its final leave. Most orders of service print one or two committal hymns immediately before the benediction.',
  recessional:
    'Recessional hymns close the service as the congregation departs. Ghanaian services often choose a hopeful, forward-looking hymn here — grief gives way to gratitude for a life well lived, and the recessional carries that turn.',
}

export function hymnSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ɔɛ]/g, (c) => (c === 'ɔ' ? 'o' : 'e'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function relatedHymns(hymn, all, n = 5) {
  const same = all.filter((h) => h.slug !== hymn.slug && h.category === hymn.category)
  const others = all.filter((h) => h.slug !== hymn.slug && h.category !== hymn.category)
  return [...same, ...others].slice(0, n)
}
```

- [ ] **Step 4: Add `slug` and `publicDomain` to all 25 records in `src/data/hymns.js`.** For each record add `slug: '<hymnSlug(title)>'` (compute with the rule above and write the LITERAL string — data files carry literals, not function calls) and `publicDomain: true|false` per this rule: author died before 1956 (life + 70 years) or `author` is `'Traditional Ghanaian'`/traditional → `true`; any author you cannot verify or who died after 1955 → `false`. The current 25 are classic hymns (e.g., Henry Francis Lyte d. 1847, Fanny Crosby d. 1915) and traditional Ghanaian pieces — verify each author with your own knowledge and record your per-hymn determination in the commit body. When in doubt, `false` (the page then shows metadata + first line only, per Task 4).
- [ ] **Step 5: Run — expect PASS (5 tests)**, full suite green.
- [ ] **Step 6: Commit**

```bash
git add src/data/hymns.js src/data/hymnMeta.js src/data/__tests__/hymns.test.js
git commit -m "feat(hymns): slugs, public-domain flags, and category occasion notes"
```

---

### Task 4: Hymn detail page (TDD)

**Files:**
- Create: `src/pages/HymnPage.jsx`
- Modify: `src/App.jsx` (lazy import + route)
- Test: `src/pages/__tests__/HymnPage.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/__tests__/HymnPage.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HymnPage from '../HymnPage.jsx'
import { hymns } from '../../data/hymns.js'

function renderSlug(slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/hymns/${slug}`]}>
        <Routes><Route path="/hymns/:slug" element={<HymnPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('HymnPage', () => {
  const pd = hymns.find((h) => h.publicDomain)
  const nonPd = hymns.find((h) => !h.publicDomain)

  it('renders full lyrics for a public-domain hymn', () => {
    renderSlug(pd.slug)
    expect(screen.getByRole('heading', { level: 1, name: new RegExp(pd.title, 'i') })).toBeInTheDocument()
    // first line of the first verse is present
    expect(screen.getByText(new RegExp(pd.verses[0].split('\n')[0].slice(0, 20)))).toBeInTheDocument()
  })

  it('shows metadata-only for a non-public-domain hymn', () => {
    if (!nonPd) return // dataset may be all-PD; the gate is still covered by code review
    renderSlug(nonPd.slug)
    expect(screen.getByText(/available in the hymn library/i)).toBeInTheDocument()
  })

  it('links to the brochure designer CTA and related hymns', () => {
    renderSlug(pd.slug)
    expect(screen.getByRole('link', { name: /add this hymn to a funeral programme/i }))
      .toHaveAttribute('href', `/editor?hymn=${pd.slug}`)
    expect(screen.getByText(/related hymns/i)).toBeInTheDocument()
  })

  it('renders not-found for unknown slugs', () => {
    renderSlug('not-a-hymn')
    expect(screen.getByText(/hymn not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: The page**

```jsx
// src/pages/HymnPage.jsx
// Programmatic hymn pages (spec §4.3). Public-domain hymns get full lyrics;
// others get metadata + first line with the lyrics behind the in-app library
// (copyright gate). Schema: MusicComposition + breadcrumbs + speakable.
import { Link, useParams } from 'react-router-dom'
import { Music, ArrowRight, BookOpen } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'
import { hymns } from '../data/hymns'
import { CATEGORY_NOTES, relatedHymns } from '../data/hymnMeta'

const CATEGORY_LABELS = {
  processional: 'Processional', worship: 'Worship & Praise', comfort: 'Comfort',
  committal: 'Committal', recessional: 'Recessional',
}

export default function HymnPage() {
  const { slug } = useParams()
  const hymn = hymns.find((h) => h.slug === slug)

  if (!hymn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-semibold text-card-foreground mb-2">Hymn not found</h1>
          <Link to="/hymns" className="text-sm text-primary hover:underline">Browse the hymn library</Link>
        </div>
      </div>
    )
  }

  const related = relatedHymns(hymn, hymns, 5)
  const firstLine = hymn.verses[0]?.split('\n')[0] || ''
  const categoryLabel = CATEGORY_LABELS[hymn.category] || hymn.category

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={`${hymn.title} — Funeral Hymn Lyrics | FuneralPress`}
        description={`${hymn.title}${hymn.author ? ` by ${hymn.author}` : ''} — ${categoryLabel.toLowerCase()} funeral hymn${hymn.language === 'twi' ? ' in Twi' : ''}. ${hymn.publicDomain ? 'Full lyrics' : 'Details'} and how it is used in Ghanaian funeral services.`}
        path={`/hymns/${hymn.slug}`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Hymn Library', path: '/hymns' },
          { name: hymn.title, path: `/hymns/${hymn.slug}` },
        ]}
        speakable={['.hymn-context']}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'MusicComposition',
          name: hymn.title,
          ...(hymn.author ? { composer: { '@type': 'Person', name: hymn.author } } : {}),
          inLanguage: hymn.language === 'twi' ? 'tw' : 'en',
          genre: 'Hymn',
          ...(hymn.publicDomain ? { copyrightNotice: 'Public domain' } : {}),
        }}
      />

      <div className="max-w-2xl mx-auto px-4 pt-12 pb-16">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-6">
          <Link to="/hymns" className="hover:text-primary">Hymn Library</Link>
          <span className="mx-2">/</span>
          <span>{hymn.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-primary mb-2">
            <Music size={14} />
            {categoryLabel} hymn{hymn.language === 'twi' ? ' · Twi' : ''}
          </div>
          <h1 className="text-3xl font-bold text-card-foreground mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {hymn.title}
          </h1>
          {hymn.author && <p className="text-sm text-muted-foreground">{hymn.author}</p>}
        </div>

        {/* Occasion context (speakable) */}
        <p className="hymn-context text-sm text-muted-foreground leading-relaxed mb-8">
          {CATEGORY_NOTES[hymn.category]}
        </p>

        {/* Lyrics or copyright-gated metadata */}
        {hymn.publicDomain ? (
          <div className="space-y-6 mb-10">
            {hymn.verses.map((verse, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1">Verse {i + 1}</p>
                <p className="text-base text-card-foreground leading-relaxed whitespace-pre-line">{verse}</p>
                {hymn.chorus && i === 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-primary/30">
                    <p className="text-xs text-muted-foreground mb-1">Chorus</p>
                    <p className="text-base text-card-foreground leading-relaxed italic whitespace-pre-line">{hymn.chorus}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 mb-10">
            <p className="text-sm text-card-foreground mb-1 italic">"{firstLine}…"</p>
            <p className="text-xs text-muted-foreground">
              The full lyrics are available in the hymn library inside the app, where you can add them directly to a funeral programme.
            </p>
          </div>
        )}

        {/* CTA */}
        <Link
          to={`/editor?hymn=${hymn.slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors mb-12"
        >
          Add this hymn to a funeral programme
          <ArrowRight size={15} />
        </Link>

        {/* Related */}
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Related hymns</h2>
        <div className="space-y-2">
          {related.map((r) => (
            <Link
              key={r.slug}
              to={`/hymns/${r.slug}`}
              className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors"
            >
              <BookOpen size={15} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-card-foreground truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[r.category] || r.category}{r.author ? ` · ${r.author}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Route** — in `src/App.jsx`: `const HymnPage = lazy(() => import('./pages/HymnPage'))` with the other lazy imports, and `<Route path="/hymns/:slug" element={<HymnPage />} />` immediately after the existing `/hymns` route.
- [ ] **Step 5: Run — expect PASS (4 tests)**, full suite green.
- [ ] **Step 6: Commit**

```bash
git add src/pages/HymnPage.jsx src/pages/__tests__/HymnPage.test.jsx src/App.jsx
git commit -m "feat(hymns): programmatic hymn detail pages with copyright gate and MusicComposition schema"
```

---

### Task 5: Hymn pages — library links, sitemap, prerender

**Files:**
- Modify: `src/pages/HymnLibraryPage.jsx`, `vite-plugins/sitemap.js`, `vite-plugins/prerender-routes.js`

- [ ] **Step 1: Library links** — in `src/pages/HymnLibraryPage.jsx`, each hymn card/row gains a link to its page. Read the file; where each hymn renders (the card showing title/author), add alongside the existing actions:

```jsx
<Link to={`/hymns/${hymn.slug}`} className="text-xs text-primary hover:underline">
  View hymn page
</Link>
```

(add `Link` to the react-router-dom import if absent).

- [ ] **Step 2: Sitemap** — in `vite-plugins/sitemap.js`, import the hymns and emit an entry per PUBLIC hymn next to where regions/blog entries are generated (match the existing pattern exactly):

```javascript
import { hymns } from '../src/data/hymns.js'
// inside the entries assembly, after regions:
for (const hymn of hymns) {
  entries.push(urlEntry({ path: `/hymns/${hymn.slug}`, changefreq: 'yearly', priority: hymn.publicDomain ? 0.7 : 0.4 }))
}
```

(adapt variable names to the file's actual assembly loop — read it first; if it builds an array of route objects rather than calling `urlEntry` inline, push `{ path, changefreq: 'yearly', priority }` objects in its format.)

- [ ] **Step 3: Prerender** — in `vite-plugins/prerender-routes.js`, extend `collectPrerenderRoutes()` to include `/hymns/${slug}` for every hymn (import `hymns` the same way it imports blog posts/regions).
- [ ] **Step 4: Verify** — `npx vitest run` green; `npm run build` green and the prerender log shows ~83 routes (58 + 25 hymns). Spot-open `dist/hymns/abide-with-me/index.html` (or the first PD slug) and confirm the lyrics and `MusicComposition` JSON-LD are present in the static HTML.
- [ ] **Step 5: Commit**

```bash
git add src/pages/HymnLibraryPage.jsx vite-plugins/sitemap.js vite-plugins/prerender-routes.js
git commit -m "feat(hymns): hymn pages in library links, sitemap, and prerender pipeline"
```

---

### Task 6: Prerender parallelization

**Files:**
- Modify: `scripts/prerender.mjs`

- [ ] **Step 1:** The current loop renders routes serially with one Puppeteer page. Parallelize with a small worker pool so today's ~83 routes build faster and thousands of hymn routes stay feasible later. Replace the serial `for (const route of routes)` loop with:

```javascript
const CONCURRENCY = parseInt(process.env.PRERENDER_CONCURRENCY || '4', 10)

async function renderAll(browser, routes) {
  const queue = [...routes]
  let failures = 0
  async function workerLoop() {
    const page = await browser.newPage()
    for (;;) {
      const route = queue.shift()
      if (!route) break
      try {
        const html = await renderRoute(page, route)
        const out = outPathFor(route)
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(out, html, 'utf8')
        console.log(`prerendered ${route}`)
      } catch (e) {
        failures++
        console.error(`FAILED ${route}: ${e.message}`)
      }
    }
    await page.close()
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, workerLoop))
  return failures
}
```

Adapt to the script's actual structure (read it first — keep its existing `renderRoute`, output-path logic, and the final route-count log; extract the per-route output path into `outPathFor(route)` if it's currently inline). The script must exit non-zero if `failures > 0` (matching or adding to its current error behavior).

- [ ] **Step 2: Verify** — `npm run build` completes with all routes prerendered (count unchanged from Task 5) and is measurably faster; note before/after wall time in the commit body.
- [ ] **Step 3: Commit**

```bash
git add scripts/prerender.mjs
git commit -m "perf(seo): parallelize prerender with a 4-page puppeteer pool"
```

---

### Task 7: Obituary opt-in indexing — migration + worker

**Files:**
- Create: `workers/migrations/migration-obituary-indexing.sql`
- Modify: `workers/auth-api.js` (obituary create/get handlers + new toggle endpoint + obituary sitemap endpoint)

- [ ] **Step 1: Migration**

```sql
-- Opt-in search indexing for obituaries (spec §4.4).
-- Default 0: existing obituaries become noindex until the family opts in —
-- deliberate consent-first behavior change (plan correction #2).
ALTER TABLE obituary_pages ADD COLUMN search_indexable INTEGER DEFAULT 0;
```

- [ ] **Step 2: Worker — accept the flag at creation.** Find the obituary create handler (`grep -n "obituaries/create\|handleCreateObituary\|INSERT INTO obituary_pages" workers/auth-api.js`), read it, and: accept `searchIndexable` from the request body, sanitize to `0/1` (`const searchIndexable = body.searchIndexable ? 1 : 0`), and add the column + bind to the INSERT.
- [ ] **Step 3: Worker — return the flag on read.** In the public `GET /obituary/:slug` handler, include `search_indexable` in the SELECT and return `searchIndexable: !!row.search_indexable` in the JSON. Also include it in the user's obituary list endpoint (`GET /obituaries`).
- [ ] **Step 4: Worker — revocable toggle endpoint** (authenticated; owner-only):

```javascript
async function handleObituaryIndexingToggle(request, env, userId, slug) {
  const { indexable } = await request.json()
  const result = await env.DB.prepare(
    "UPDATE obituary_pages SET search_indexable = ?, updated_at = datetime('now') WHERE slug = ? AND user_id = ?"
  ).bind(indexable ? 1 : 0, slug, userId).run()
  if (!result.meta.changes) return error('Obituary not found', 404, request)
  return json({ ok: true, searchIndexable: !!indexable }, 200, request)
}
```

Route (authenticated block; match the file's parameterized-route regex style — see the existing memorial routes):

```javascript
      const obituaryIndexMatch = path.match(/^\/obituaries\/([^/]+)\/indexing$/)
      if (method === 'POST' && obituaryIndexMatch) return await handleObituaryIndexingToggle(request, env, userId, decodeURIComponent(obituaryIndexMatch[1]))
```

- [ ] **Step 5: Worker — obituary sitemap** (PUBLIC route):

```javascript
async function handleObituarySitemap(request, env) {
  const rows = await env.DB.prepare(
    "SELECT slug, updated_at FROM obituary_pages WHERE is_active = 1 AND search_indexable = 1 ORDER BY updated_at DESC LIMIT 5000"
  ).all()
  const urls = (rows.results || []).map((r) =>
    `  <url>\n    <loc>https://funeralpress.org/obituary/${encodeURIComponent(r.slug)}</loc>\n    <lastmod>${(r.updated_at || '').slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  ).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
```

Public route: `if (method === 'GET' && path === '/sitemap-obituaries.xml') return await handleObituarySitemap(request, env)`

- [ ] **Step 6: robots.txt cross-host sitemap declaration** — append to `public/robots.txt` (cross-host sitemap references in robots.txt are accepted by Google and Bing):

```
Sitemap: https://auth-api.funeralpress.org/sitemap-obituaries.xml
```

- [ ] **Step 7:** `npx vitest run` green; commit:

```bash
git add workers/migrations/migration-obituary-indexing.sql workers/auth-api.js public/robots.txt
git commit -m "feat(obituaries): opt-in search indexing flag, toggle endpoint, and worker-served sitemap"
```

---

### Task 8: Obituary opt-in indexing — frontend (TDD)

**Files:**
- Modify: `src/pages/ObituaryCreatorPage.jsx`, `src/pages/ObituaryPage.jsx`
- Test: `src/pages/__tests__/ObituaryPageIndexing.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/__tests__/ObituaryPageIndexing.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import ObituaryPage from '../ObituaryPage.jsx'

function mockObituary(searchIndexable) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      slug: 'kofi-mensah', deceasedName: 'Kofi Mensah', biography: 'A beloved father and teacher.',
      birthDate: '1950-01-01', deathDate: '2026-05-01', searchIndexable,
    }),
  })))
}

function renderPage(ctx) {
  return render(
    <HelmetProvider context={ctx}>
      <MemoryRouter initialEntries={['/obituary/kofi-mensah']}>
        <Routes><Route path="/obituary/:slug" element={<ObituaryPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('ObituaryPage indexing meta', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('emits noindex when the family has not opted in', async () => {
    mockObituary(false)
    const ctx = {}
    renderPage(ctx)
    await waitFor(() => expect(ctx.helmet.meta.toString()).toContain('noindex'))
  })

  it('omits noindex when the family opted in', async () => {
    mockObituary(true)
    const ctx = {}
    renderPage(ctx)
    await waitFor(() => expect(ctx.helmet.meta.toString()).toContain('Kofi Mensah'))
    expect(ctx.helmet.meta.toString()).not.toContain('noindex')
  })
})
```

(Adapt the mocked response shape to whatever `GET /obituary/:slug` actually returns — read `ObituaryPage.jsx`'s fetch/consume code first and mirror its real field names; the two assertions about `noindex` are the contract.)

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: ObituaryPage** — where the obituary data renders, add to the Helmet/PageMeta block:

```jsx
import { Helmet } from 'react-helmet-async'
// inside the loaded render, alongside the existing PageMeta:
{!data.searchIndexable && (
  <Helmet>
    <meta name="robots" content="noindex, nofollow" />
  </Helmet>
)}
```

And for opted-in obituaries add Person/Event schema via the existing PageMeta `jsonLd` prop (Task 2):

```jsx
jsonLd={data.searchIndexable ? {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: data.deceasedName,
  ...(data.birthDate ? { birthDate: data.birthDate } : {}),
  ...(data.deathDate ? { deathDate: data.deathDate } : {}),
  ...(data.funeralDate ? {
    subjectOf: {
      '@type': 'Event',
      name: `Funeral service for ${data.deceasedName}`,
      startDate: data.funeralDate,
      ...(data.funeralVenue ? { location: { '@type': 'Place', name: data.funeralVenue, ...(data.venueAddress ? { address: data.venueAddress } : {}) } } : {}),
    },
  } : {}),
} : undefined}
```

(If ObituaryPage uses raw Helmet rather than PageMeta, emit the same JSON-LD with a `<script type="application/ld+json">` inside its Helmet block instead — match the file's existing approach.)

- [ ] **Step 4: ObituaryCreatorPage** — add the opt-in checkbox to the form (default UNCHECKED), included in the create POST body as `searchIndexable`:

```jsx
<label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
  <input
    type="checkbox"
    checked={searchIndexable}
    onChange={(e) => setSearchIndexable(e.target.checked)}
    className="mt-0.5 w-4 h-4 accent-primary"
  />
  <span>
    Allow this announcement to be found on search engines (Google).
    <span className="block text-xs opacity-75 mt-0.5">
      Funeral announcements are traditionally public — this helps friends and distant family find the details. You can turn this off at any time.
    </span>
  </span>
</label>
```

Plus state `const [searchIndexable, setSearchIndexable] = useState(false)`, the field in the POST body, and — in the "my obituaries" list — a per-obituary toggle calling `POST /obituaries/{slug}/indexing` via `apiFetch` and updating local state.

- [ ] **Step 5: Run — expect PASS**, full suite green, `npm run build` green.
- [ ] **Step 6: Commit**

```bash
git add src/pages/ObituaryCreatorPage.jsx src/pages/ObituaryPage.jsx src/pages/__tests__/ObituaryPageIndexing.test.jsx
git commit -m "feat(obituaries): opt-in indexing checkbox, default noindex, Person/Event schema"
```

---

### Task 9: AEO sweep — HowTo on product pages, speakable on regional/diaspora pages

**Files:**
- Modify: `src/pages/landing/BrochureDesignerPage.jsx`, `src/pages/landing/PosterMakerPage.jsx`, `src/pages/landing/MemorialCreatorPage.jsx`, `src/pages/landing/ProgrammeBookletPage.jsx`, `src/pages/RegionPage.jsx`, `src/pages/landing/DiasporaPage.jsx`

- [ ] **Step 1: HowTo on the four product pages.** Each page's `PageMeta` gains a `howTo` prop. Content per page (final copy — use verbatim):

BrochureDesignerPage:
```jsx
howTo={{
  name: 'How to create a funeral brochure online',
  steps: [
    { name: 'Choose a theme', text: 'Pick a Ghanaian funeral theme — Black & Gold, Kente Gold, Burgundy, or Ivory.' },
    { name: 'Add photos and their story', text: 'Upload photographs and write the biography and tributes; the AI tribute writer helps when words are hard.' },
    { name: 'Add hymns and the order of service', text: 'Search the hymn library and add full lyrics, then set out the order of both services.' },
    { name: 'Download or print in Ghana', text: 'Export a print-ready PDF, or order printing delivered anywhere in Ghana.' },
  ],
}}
```

PosterMakerPage:
```jsx
howTo={{
  name: 'How to make a funeral poster',
  steps: [
    { name: 'Choose a poster template', text: 'Select a funeral announcement poster layout sized from A3 to A0.' },
    { name: 'Add the photo and details', text: 'Upload the portrait and enter the name, dates, and funeral arrangements.' },
    { name: 'Download or order prints', text: 'Export a print-ready file or order large-format printing delivered in Ghana.' },
  ],
}}
```

MemorialCreatorPage:
```jsx
howTo={{
  name: 'How to create an online memorial page',
  steps: [
    { name: 'Add their story and photos', text: 'Upload photographs and write the biography for a permanent tribute page.' },
    { name: 'Add the service details', text: 'Include funeral dates, venues, and a live-stream link for relatives abroad.' },
    { name: 'Share one link', text: 'Share on WhatsApp — friends worldwide can sign the guest book, light candles, and watch the service.' },
  ],
}}
```

ProgrammeBookletPage:
```jsx
howTo={{
  name: 'How to create a funeral programme booklet',
  steps: [
    { name: 'Pick a booklet format', text: 'Choose a multi-page programme layout for the full order of service.' },
    { name: 'Build the programme', text: 'Add the biography, tributes, hymns with lyrics, family tree, and acknowledgements.' },
    { name: 'Export print-ready pages', text: 'Download the booklet as a print-ready PDF with correct page imposition.' },
  ],
}}
```

- [ ] **Step 2: Speakable on RegionPage and DiasporaPage.** Both pages have an intro/hero paragraph; give that element a stable class and declare it:

RegionPage: add `className="... region-intro"` to the hero description paragraph and `speakable={['.region-intro', 'h1']}` to its PageMeta.
DiasporaPage: the intro paragraph already renders `{page.intro}` — add `diaspora-intro` to its className and `speakable={['.diaspora-intro', 'h1']}` to PageMeta.

- [ ] **Step 3:** `npx vitest run` + `npm run build` green. Validate one built page's JSON-LD: open `dist/funeral-brochure-designer/index.html` and confirm the HowTo block is present.
- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/ src/pages/RegionPage.jsx
git commit -m "feat(aeo): HowTo schema on product pages, speakable on regional and diaspora pages"
```

---

### Task 10: Blog D1 layer — migration + topic seed

**Files:**
- Create: `workers/migrations/migration-blog-pipeline.sql`

- [ ] **Step 1: Write the migration** (table + 50-topic seed; topics are final copy):

```sql
-- AI blog draft pipeline (spec §4.6). Drafts are AI-generated weekly, reviewed
-- by the owner in the admin dashboard, and served publicly once published.
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT DEFAULT '[]',          -- JSON array
  content TEXT NOT NULL,               -- JSON array of blocks {type, text|items|link}
  status TEXT DEFAULT 'draft',         -- draft | published | rejected
  source TEXT DEFAULT 'ai',
  topic TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS blog_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  used_at TEXT
);

INSERT INTO blog_topics (topic) VALUES
('How much does a funeral cost in Ghana in 2026 — a full breakdown by region'),
('What to write in a funeral tribute to your father'),
('What to write in a funeral tribute to your mother'),
('How to write an obituary for a Ghanaian funeral — structure and examples'),
('The order of service for a Ghanaian funeral, explained step by step'),
('What is a one-week celebration (observance) and how do families plan it'),
('Choosing funeral hymns: 15 beloved hymns for Ghanaian services and when to sing them'),
('Twi funeral hymns and their meanings'),
('What to wear to a Ghanaian funeral: colours, cloth, and what they signify'),
('Adinkra symbols at funerals: meanings families should know'),
('How to plan a funeral in Ghana from the UK: a practical checklist'),
('How to plan a funeral in Ghana from the US: a practical checklist'),
('Repatriation of remains to Ghana: process, costs, and timelines'),
('How families share funeral costs fairly — and keep the peace'),
('Funeral donations (nsawa): etiquette for givers and families'),
('How to organise a livestream of a funeral service for relatives abroad'),
('Writing a eulogy when grief makes words hard'),
('Funeral brochure vs programme booklet: what to choose and why'),
('How many funeral brochures should you print? A planning guide'),
('Choosing a funeral venue in Accra: questions to ask'),
('Choosing a funeral venue in Kumasi: questions to ask'),
('What does a funeral committee do? Roles and responsibilities'),
('Aseda (thanksgiving) cloth: tradition, design, and modern labels'),
('Funeral poster design: what must be on it and what to leave off'),
('How soon after death is a funeral held in Ghana? Timelines explained'),
('Mortuary and preservation costs in Ghana: what families should budget'),
('The family meeting: how funeral decisions get made in Ghanaian families'),
('Widow and widower rites in Ghana: tradition and modern practice'),
('How churches shape Ghanaian funeral services: what to coordinate with your pastor'),
('Muslim funerals in Ghana: timelines, rites, and announcements'),
('Memorial pages vs printed brochures: why families now do both'),
('QR codes on funeral brochures: how they connect mourners to memorials'),
('Digital guest books: collecting condolences from around the world'),
('Thank-you cards after a funeral: wording examples that feel right'),
('Acknowledgement messages for funeral brochures: 12 examples'),
('Funeral catering in Ghana: planning quantities and budgets'),
('One-year anniversary remembrance: how families mark it'),
('How to choose photographs for a funeral brochure'),
('Writing tributes from grandchildren: prompts and examples'),
('The biography section: turning a life into two pages'),
('Funeral invitation cards: who receives them and what they say'),
('Announcing a death on radio vs WhatsApp vs print: what works now'),
('How to budget a funeral with the FuneralPress planner: a walkthrough'),
('Printing funeral materials: paper, sizes, and finishes explained'),
('Wreath cards and flower tributes: what to write'),
('Keeping funeral costs down without losing dignity: 10 practical choices'),
('What happens at a Ghanaian wake-keeping'),
('Appellations and praise names in funeral programmes'),
('How diaspora families coordinate funerals across time zones'),
('Grief support in Ghana: where families find help after the funeral');
```

- [ ] **Step 2: Validate locally** (`npx wrangler d1 execute funeralpress-db --local --file=workers/migrations/migration-blog-pipeline.sql`; if local DB can't run, note and defer to staging as with prior migrations).
- [ ] **Step 3: Commit**

```bash
git add workers/migrations/migration-blog-pipeline.sql
git commit -m "feat(blog): D1 pipeline tables and 50-topic editorial seed"
```

---

### Task 11: Blog draft cron — generation worker logic (TDD for pure parts)

**Files:**
- Create: `workers/blogDraft.js`
- Modify: `workers/auth-api.js` (scheduled dispatch + generation glue), `workers/auth-api-wrangler.toml` (cron)
- Test: `workers/__tests__/blogDraft.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// workers/__tests__/blogDraft.test.js
import { describe, it, expect } from 'vitest'
import { draftPrompt, parseDraft, draftSlug } from '../blogDraft.js'

describe('draftPrompt', () => {
  it('embeds the topic and demands strict JSON', () => {
    const p = draftPrompt('How much does a funeral cost in Ghana')
    expect(p).toContain('How much does a funeral cost in Ghana')
    expect(p).toContain('JSON')
  })
})

describe('parseDraft', () => {
  const valid = JSON.stringify({
    title: 'Funeral Costs in Ghana',
    description: 'A complete breakdown of funeral costs across Ghana, from mortuary fees to catering, with region-by-region figures and ways families share the load.',
    keywords: ['funeral costs ghana', 'funeral budget'],
    content: [
      { type: 'paragraph', text: 'Funerals in Ghana are significant family undertakings.' },
      { type: 'heading', text: 'The major cost lines' },
      { type: 'list', items: ['Mortuary fees', 'Venue and canopies'] },
    ],
  })

  it('accepts a valid draft', () => {
    const d = parseDraft(valid)
    expect(d.title).toBe('Funeral Costs in Ghana')
    expect(d.content).toHaveLength(3)
  })
  it('strips markdown fences before parsing', () => {
    const d = parseDraft('```json\n' + valid + '\n```')
    expect(d.title).toBe('Funeral Costs in Ghana')
  })
  it('rejects missing fields and bad block types', () => {
    expect(() => parseDraft('{"title":"x"}')).toThrow()
    expect(() => parseDraft(JSON.stringify({ title: 'x', description: 'y'.repeat(60), keywords: [], content: [{ type: 'video', text: 'no' }] }))).toThrow()
    expect(() => parseDraft('not json')).toThrow()
  })
})

describe('draftSlug', () => {
  it('slugifies titles', () => {
    expect(draftSlug('Funeral Costs in Ghana: 2026 Guide')).toBe('funeral-costs-in-ghana-2026-guide')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement `workers/blogDraft.js`**

```javascript
// workers/blogDraft.js
// AI blog draft generation rules (spec §4.6). Pure functions — the cron glue
// in auth-api.js owns DB and AI bindings. Nothing here auto-publishes.

const ALLOWED_BLOCK_TYPES = ['paragraph', 'heading', 'list', 'cta']

export function draftPrompt(topic) {
  return [
    `Write a blog post for FuneralPress (funeralpress.org), a funeral design and memorial platform for Ghana and the diaspora, on this topic: "${topic}".`,
    'Voice: warm, practical, dignified. UK spelling. No exclamation marks. Assume the reader is planning or attending a Ghanaian funeral.',
    'Length: 900-1300 words across the content blocks.',
    'Respond with ONLY a JSON object (no markdown, no code fences) of this exact shape:',
    '{"title": string (50-70 chars, no clickbait), "description": string (140-160 chars), "keywords": string[] (4-7 search phrases), "content": [{"type": "paragraph", "text": string} | {"type": "heading", "text": string} | {"type": "list", "items": string[]} | {"type": "cta", "text": string, "link": "/budget-planner" | "/funeral-brochure-designer" | "/memorial-page-creator" | "/hymns"}]}',
    'Structure: opening paragraph answering the query directly in 40-60 words (featured-snippet style), then 4-6 heading sections with paragraphs/lists, ending with one cta block.',
  ].join('\n')
}

export function parseDraft(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let draft
  try {
    draft = JSON.parse(cleaned)
  } catch {
    throw new Error('Draft is not valid JSON')
  }
  if (!draft.title || typeof draft.title !== 'string') throw new Error('Draft missing title')
  if (!draft.description || draft.description.length < 50) throw new Error('Draft missing/short description')
  if (!Array.isArray(draft.keywords)) throw new Error('Draft keywords must be an array')
  if (!Array.isArray(draft.content) || draft.content.length < 3) throw new Error('Draft content too short')
  for (const block of draft.content) {
    if (!ALLOWED_BLOCK_TYPES.includes(block.type)) throw new Error(`Bad block type: ${block.type}`)
    if (block.type === 'list' && !Array.isArray(block.items)) throw new Error('List block missing items')
    if (block.type !== 'list' && typeof block.text !== 'string') throw new Error(`Block missing text: ${block.type}`)
  }
  return draft
}

export function draftSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run — expect PASS (6 tests)**
- [ ] **Step 5: Cron glue in `workers/auth-api.js`.** Read the existing `scheduled(event, ...)` dispatcher (it switches on `event.cron`). Add a Wednesday 06:00 UTC cron to `workers/auth-api-wrangler.toml`:

```toml
crons = ["0 3 * * *", "0 7 * * *", "0 8 * * *", "0 6 * * 3"]
```

(append `"0 6 * * 3"` to the existing array and extend the comment block: `#   06:00 UTC Wed  AI blog draft generation`). Then add the dispatch branch + generator:

```javascript
// in scheduled(): 
if (event.cron === '0 6 * * 3') {
  ctx.waitUntil(generateBlogDraft(env).catch((e) => { console.error('[blog-draft]', e); Sentry.captureException(e) }))
}

async function generateBlogDraft(env) {
  const topicRow = await env.DB.prepare(
    'SELECT id, topic FROM blog_topics WHERE used_at IS NULL ORDER BY id LIMIT 1'
  ).first()
  if (!topicRow) {
    notifyAdmin(env, 'blog_draft', 'Blog topic queue is empty — add topics', {})
    return
  }

  const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a compassionate funeral-industry content writer for a Ghanaian audience. You MUST respond with valid JSON only — no markdown, no code blocks, no extra text.' },
      { role: 'user', content: draftPrompt(topicRow.topic) },
    ],
    max_tokens: 3500,
  })

  let draft
  try {
    draft = parseDraft(result.response || '')
  } catch (e) {
    // One retry on malformed output, then surface to the owner
    const retry = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Respond with ONLY the corrected, valid JSON object. No other text.' },
        { role: 'user', content: `This JSON was invalid (${e.message}). Fix it:\n${(result.response || '').slice(0, 6000)}` },
      ],
      max_tokens: 3500,
    })
    draft = parseDraft(retry.response || '') // throws to scheduled()'s catch if still bad
  }

  const slug = draftSlug(draft.title)
  await env.DB.prepare(
    `INSERT INTO blog_posts (id, slug, title, description, keywords, content, status, source, topic)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', 'ai', ?)
     ON CONFLICT(slug) DO NOTHING`
  ).bind(generateId(), slug, draft.title, draft.description, JSON.stringify(draft.keywords), JSON.stringify(draft.content), topicRow.topic).run()
  await env.DB.prepare("UPDATE blog_topics SET used_at = datetime('now') WHERE id = ?").bind(topicRow.id).run()

  notifyAdmin(env, 'blog_draft', `Blog draft ready for review: ${draft.title}`, { slug, topic: topicRow.topic })
}
```

Import the helpers at the top of auth-api.js: `import { draftPrompt, parseDraft, draftSlug } from './blogDraft.js'`. Verify auth-api has the `[ai]` binding in its wrangler.toml (it does — the AI tribute writer uses it); if the binding name differs from `AI`, match it.

- [ ] **Step 6:** `npx vitest run` green. Commit:

```bash
git add workers/blogDraft.js workers/__tests__/blogDraft.test.js workers/auth-api.js workers/auth-api-wrangler.toml
git commit -m "feat(blog): weekly AI draft generation cron with strict JSON validation and admin notification"
```

---

### Task 12: Blog admin + public endpoints (worker)

**Files:**
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Admin endpoints** (all behind the existing `requireAdmin` helper — read an existing admin handler like `handleAdminPartners` for the exact guard pattern and copy it):

```javascript
async function handleAdminBlogDrafts(request, env) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error
  const rows = await env.DB.prepare(
    "SELECT id, slug, title, description, topic, status, created_at, published_at FROM blog_posts ORDER BY created_at DESC LIMIT 100"
  ).all()
  return json({ posts: rows.results || [] }, 200, request)
}

async function handleAdminBlogGet(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error
  const row = await env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first()
  if (!row) return error('Not found', 404, request)
  return json({ post: { ...row, keywords: JSON.parse(row.keywords || '[]'), content: JSON.parse(row.content || '[]') } }, 200, request)
}

async function handleAdminBlogUpdate(request, env, id) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error
  const { title, description, keywords, content } = await request.json()
  const existing = await env.DB.prepare('SELECT id FROM blog_posts WHERE id = ?').bind(id).first()
  if (!existing) return error('Not found', 404, request)
  await env.DB.prepare(
    'UPDATE blog_posts SET title = COALESCE(?, title), description = COALESCE(?, description), keywords = COALESCE(?, keywords), content = COALESCE(?, content) WHERE id = ?'
  ).bind(title || null, description || null, keywords ? JSON.stringify(keywords) : null, content ? JSON.stringify(content) : null, id).run()
  return json({ ok: true }, 200, request)
}

async function handleAdminBlogStatus(request, env, id, status) {
  const auth = await requireAdmin(request, env)
  if (auth.error) return auth.error
  if (!['published', 'rejected', 'draft'].includes(status)) return error('Bad status', 400, request)
  const publishedAt = status === 'published' ? "datetime('now')" : 'NULL'
  const result = await env.DB.prepare(
    `UPDATE blog_posts SET status = ?, published_at = ${publishedAt} WHERE id = ?`
  ).bind(status, id).run()
  if (!result.meta.changes) return error('Not found', 404, request)
  return json({ ok: true, status }, 200, request)
}
```

Routes (admin section — match the file's admin-route registration style):

```javascript
      if (method === 'GET' && path === '/admin/blog') return await handleAdminBlogDrafts(request, env)
      const adminBlogMatch = path.match(/^\/admin\/blog\/([^/]+)$/)
      if (method === 'GET' && adminBlogMatch) return await handleAdminBlogGet(request, env, adminBlogMatch[1])
      if (method === 'PUT' && adminBlogMatch) return await handleAdminBlogUpdate(request, env, adminBlogMatch[1])
      const adminBlogStatusMatch = path.match(/^\/admin\/blog\/([^/]+)\/(publish|reject)$/)
      if (method === 'POST' && adminBlogStatusMatch) {
        return await handleAdminBlogStatus(request, env, adminBlogStatusMatch[1], adminBlogStatusMatch[2] === 'publish' ? 'published' : 'rejected')
      }
```

- [ ] **Step 2: Public endpoints** (public routing section; cached 5 minutes):

```javascript
async function handlePublicBlogList(request, env) {
  const rows = await env.DB.prepare(
    "SELECT slug, title, description, keywords, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100"
  ).all()
  const posts = (rows.results || []).map((r) => ({ ...r, keywords: JSON.parse(r.keywords || '[]'), date: (r.published_at || '').slice(0, 10) }))
  const res = json({ posts }, 200, request)
  res.headers.set('Cache-Control', 'public, max-age=300')
  return res
}

async function handlePublicBlogPost(request, env, slug) {
  const row = await env.DB.prepare(
    "SELECT slug, title, description, keywords, content, published_at FROM blog_posts WHERE slug = ? AND status = 'published'"
  ).bind(slug).first()
  if (!row) return error('Not found', 404, request)
  const res = json({ post: { ...row, keywords: JSON.parse(row.keywords || '[]'), content: JSON.parse(row.content || '[]'), date: (row.published_at || '').slice(0, 10) } }, 200, request)
  res.headers.set('Cache-Control', 'public, max-age=300')
  return res
}
```

Routes (public section): `GET /blog/published` → list; `GET /blog/published/:slug` (regex match) → post.

(If `json()` returns an immutable Response, build the Response with the extra header instead — read `json()`'s implementation first and adapt.)

- [ ] **Step 3:** `npx vitest run` green; `node --check workers/auth-api.js` clean. Commit:

```bash
git add workers/auth-api.js
git commit -m "feat(blog): admin draft review endpoints and cached public published-post endpoints"
```

---

### Task 13: Blog admin tab (frontend)

**Files:**
- Create: `src/components/admin/BlogDraftsTab.jsx`
- Modify: `src/pages/AdminDashboardPage.jsx` (add tab)

- [ ] **Step 1: The tab component**

```jsx
// src/components/admin/BlogDraftsTab.jsx
// Owner review surface for AI blog drafts (spec §4.6): the single human
// touchpoint. Nothing publishes without the buttons below.
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, X, Eye } from 'lucide-react'
import { apiFetch } from '../../utils/apiClient'

const STATUS_STYLES = {
  draft: 'bg-amber-500/10 text-amber-500',
  published: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-400',
}

export default function BlogDraftsTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null) // full post object
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/admin/blog')
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id, action) => {
    setBusyId(id)
    try {
      await apiFetch(`/admin/blog/${id}/${action}`, { method: 'POST' })
      load()
      if (preview?.id === id) setPreview(null)
    } catch { /* surface stays unchanged; admin can retry */ } finally {
      setBusyId(null)
    }
  }

  const openPreview = async (id) => {
    try {
      const d = await apiFetch(`/admin/blog/${id}`)
      setPreview(d.post)
    } catch { /* ignore */ }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="animate-spin inline" size={20} /></div>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-card-foreground">Blog drafts</h2>
      {posts.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet — the Wednesday cron writes one per week.</p>}
      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[p.status] || ''}`}>{p.status}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-card-foreground truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground truncate">{p.topic || p.slug}</p>
            </div>
            <button type="button" onClick={() => openPreview(p.id)} aria-label="Preview" className="p-2 text-muted-foreground hover:text-primary"><Eye size={16} /></button>
            {p.status === 'draft' && (
              <>
                <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'publish')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg disabled:opacity-50">
                  <Check size={13} /> Publish
                </button>
                <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'reject')}
                  className="flex items-center gap-1 px-3 py-1.5 border border-border text-xs text-muted-foreground rounded-lg hover:border-red-400 hover:text-red-400 disabled:opacity-50">
                  <X size={13} /> Reject
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-card-foreground">{preview.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{preview.description}</p>
            </div>
            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="p-2 text-muted-foreground hover:text-primary shrink-0"><X size={16} /></button>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground max-h-96 overflow-y-auto">
            {(preview.content || []).map((block, i) => {
              if (block.type === 'heading') return <h4 key={i} className="text-card-foreground font-semibold pt-2">{block.text}</h4>
              if (block.type === 'list') return <ul key={i} className="list-disc pl-5 space-y-1">{block.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              if (block.type === 'cta') return <p key={i} className="text-primary">→ {block.text} ({block.link})</p>
              return <p key={i}>{block.text}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Register the tab** — in `src/pages/AdminDashboardPage.jsx`, read how the existing 8 tabs are declared (tab list + content switch), then add a ninth: label `Blog`, renders `<BlogDraftsTab />` (lazy-import it the way the other tabs are imported).
- [ ] **Step 3:** `npx vitest run` + `npm run build` green. Commit:

```bash
git add src/components/admin/BlogDraftsTab.jsx src/pages/AdminDashboardPage.jsx
git commit -m "feat(blog): admin Blog tab with draft preview, publish, and reject"
```

---

### Task 14: Blog frontend + feeds merge

**Files:**
- Modify: `src/pages/BlogIndexPage.jsx`, `src/pages/BlogPostPage.jsx`, `vite-plugins/feeds.js`, `vite-plugins/sitemap.js`

- [ ] **Step 1: BlogIndexPage merge.** Read the file; it maps over the static `blogPosts` import. Add a fetch of published D1 posts and merge (static posts win slug collisions):

```jsx
const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

const [dynamicPosts, setDynamicPosts] = useState([])
useEffect(() => {
  fetch(`${API_BASE}/blog/published`)
    .then((r) => r.json())
    .then((d) => setDynamicPosts(d.posts || []))
    .catch(() => {})
}, [])

const staticSlugs = new Set(blogPosts.map((p) => p.slug))
const allPosts = [...blogPosts, ...dynamicPosts.filter((p) => !staticSlugs.has(p.slug))]
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
```

Render from `allPosts` instead of `blogPosts` (keep the page's existing card markup).

- [ ] **Step 2: BlogPostPage fallback.** The page resolves a post from the static array by slug. When not found, fetch `${API_BASE}/blog/published/${slug}` before showing not-found; render the fetched post through the SAME content-block renderer the page already uses (the shapes are identical by design). Loading state: reuse the page's existing loading pattern (or a simple spinner if it has none).
- [ ] **Step 3: Feeds + sitemap build-time merge (fail-soft).** In `vite-plugins/feeds.js` and `vite-plugins/sitemap.js`, before assembling output, fetch published posts and merge with the static list:

```javascript
async function fetchPublishedPosts() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://funeralpress-auth-api.ghwmelite.workers.dev/blog/published', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return []
    const data = await res.json()
    return data.posts || []
  } catch {
    console.warn('[feeds/sitemap] could not fetch published D1 posts — building with static posts only')
    return []
  }
}
```

Make the `closeBundle` hooks `async`, call `fetchPublishedPosts()`, merge (static wins collisions), and pass the merged list through the existing item/entry builders. For feed items from D1 posts, the content blocks already match the static structure, so the existing `renderContentToHtml()` works unchanged — verify by reading `vite-plugins/blog-content-html.js` and confirm block types covered are `paragraph|heading|list|cta`.

- [ ] **Step 4:** `npx vitest run` + `npm run build` green (build logs the fail-soft warning locally since the endpoint may not exist yet — that warning is the designed behavior, not an error).
- [ ] **Step 5: Commit**

```bash
git add src/pages/BlogIndexPage.jsx src/pages/BlogPostPage.jsx vite-plugins/feeds.js vite-plugins/sitemap.js
git commit -m "feat(blog): merge D1-published posts into blog pages, feeds, and sitemap (fail-soft)"
```

---

### Task 15: Weekly growth report cron (§5.3)

**Files:**
- Create: `workers/utils/growthReport.js`
- Modify: `workers/auth-api.js` (scheduled dispatch), `workers/auth-api-wrangler.toml` (cron)
- Test: `workers/__tests__/growthReport.test.js`

- [ ] **Step 1: Write the failing test** (pure formatting only — SQL runs against D1 in production):

```javascript
// workers/__tests__/growthReport.test.js
import { describe, it, expect } from 'vitest'
import { formatDelta, reportHtml } from '../utils/growthReport.js'

describe('formatDelta', () => {
  it('formats week-over-week movement', () => {
    expect(formatDelta(12, 8)).toBe('+50%')
    expect(formatDelta(8, 12)).toBe('-33%')
    expect(formatDelta(5, 0)).toBe('new')
    expect(formatDelta(0, 0)).toBe('—')
  })
})

describe('reportHtml', () => {
  it('renders all metric sections', () => {
    const html = reportHtml({
      weekLabel: '2026-06-08 — 2026-06-14',
      signups: { current: 42, previous: 30 },
      loopSignups: { current: 9, previous: 4 },
      surfaces: [
        { surface: 'memorial_footer', impressions: 1200, clicks: 60, signups: 5 },
        { surface: 'post_condolence', impressions: 300, clicks: 40, signups: 4 },
      ],
      revenue: [
        { currency: 'GHS', total: 1250000 },
        { currency: 'USD', total: 14900 },
      ],
      referralRewards: { current: 3, previous: 1 },
      memorialsCreated: { current: 18, previous: 15 },
    })
    expect(html).toContain('memorial_footer')
    expect(html).toContain('+40%') // signups 42 vs 30
    expect(html).toContain('GHS 12,500')
    expect(html).toContain('$149')
    expect(html).toContain('K-factor')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement `workers/utils/growthReport.js`**

```javascript
// workers/utils/growthReport.js
// Weekly growth report (spec §5.3): D1-derived metrics emailed every Monday.
// "Top organic landing pages" is GA4/GSC-only — read those in their dashboards
// (plan correction #5); this report covers everything first-party.

const SYMBOLS = { GHS: 'GHS ', NGN: '₦', GBP: '£', USD: '$' }

export function formatDelta(current, previous) {
  if (!previous && !current) return '—'
  if (!previous) return 'new'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function money(minor, currency) {
  const amount = minor / 100
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${SYMBOLS[currency] || currency + ' '}${formatted}`
}

const row = (cells, bold = false) =>
  `<tr>${cells.map((c) => `<td style="padding:6px 12px;border-bottom:1px solid #eee;${bold ? 'font-weight:600;' : ''}">${c}</td>`).join('')}</tr>`

export function reportHtml(m) {
  const kFactor = m.memorialsCreated.current
    ? (m.loopSignups.current / m.memorialsCreated.current).toFixed(2)
    : '—'
  return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#222">
  <h2 style="margin-bottom:4px">FuneralPress weekly growth report</h2>
  <p style="color:#777;margin-top:0">${m.weekLabel}</p>

  <table style="border-collapse:collapse;width:100%">
    ${row(['<b>Metric</b>', '<b>This week</b>', '<b>WoW</b>'], true)}
    ${row(['Signups', m.signups.current, formatDelta(m.signups.current, m.signups.previous)])}
    ${row(['Loop-attributed signups', m.loopSignups.current, formatDelta(m.loopSignups.current, m.loopSignups.previous)])}
    ${row(['Memorials/funerals created', m.memorialsCreated.current, formatDelta(m.memorialsCreated.current, m.memorialsCreated.previous)])}
    ${row(['K-factor (loop signups ÷ funerals)', kFactor, ''])}
    ${row(['Referral rewards granted', m.referralRewards.current, formatDelta(m.referralRewards.current, m.referralRewards.previous)])}
  </table>

  <h3 style="margin-bottom:4px">Loop surfaces</h3>
  <table style="border-collapse:collapse;width:100%">
    ${row(['<b>Surface</b>', '<b>Impr.</b>', '<b>Clicks</b>', '<b>Signups</b>'], true)}
    ${m.surfaces.map((s) => row([s.surface, s.impressions, s.clicks, s.signups])).join('')}
  </table>

  <h3 style="margin-bottom:4px">Revenue (paid this week)</h3>
  <table style="border-collapse:collapse;width:100%">
    ${m.revenue.map((r) => row([r.currency, money(r.total, r.currency)])).join('')}
  </table>

  <p style="color:#777;font-size:12px">Organic search queries live in Google Search Console; GA4 has page-level traffic. This report is generated automatically every Monday.</p>
</div>`
}
```

- [ ] **Step 4: Run — expect PASS (2 tests)**
- [ ] **Step 5: Cron glue.** Add `"0 9 * * 1"` to the crons array in `workers/auth-api-wrangler.toml` (comment: `#   09:00 UTC Mon  Weekly growth report email`). In `scheduled()` add the branch calling `sendGrowthReport(env)`, and implement it in auth-api.js:

```javascript
import { formatDelta, reportHtml } from './utils/growthReport.js'

async function weekCounts(env, sql, binds = []) {
  const current = await env.DB.prepare(sql.replaceAll('{FROM}', "datetime('now','-7 days')").replaceAll('{TO}', "datetime('now')")).bind(...binds).first()
  const previous = await env.DB.prepare(sql.replaceAll('{FROM}', "datetime('now','-14 days')").replaceAll('{TO}', "datetime('now','-7 days')")).bind(...binds).first()
  return { current: current?.n || 0, previous: previous?.n || 0 }
}

async function sendGrowthReport(env) {
  const signups = await weekCounts(env, 'SELECT COUNT(*) as n FROM users WHERE created_at >= {FROM} AND created_at < {TO}')
  const loopSignups = await weekCounts(env, "SELECT COUNT(*) as n FROM analytics_events WHERE event_type = 'loop_signup' AND created_at >= {FROM} AND created_at < {TO}")
  const referralRewards = await weekCounts(env, "SELECT COUNT(*) as n FROM referrals WHERE type = 'family' AND reward_status = 'granted' AND reward_granted_at >= {FROM} AND reward_granted_at < {TO}")
  const memorialsCreated = await weekCounts(env, "SELECT COUNT(*) as n FROM analytics_events WHERE event_type = 'memorial_page_created' AND created_at >= {FROM} AND created_at < {TO}")

  const surfaceRows = await env.DB.prepare(
    `SELECT json_extract(metadata, '$.surface') as surface,
            SUM(CASE WHEN event_type = 'loop_impression' THEN 1 ELSE 0 END) as impressions,
            SUM(CASE WHEN event_type = 'loop_click' THEN 1 ELSE 0 END) as clicks,
            SUM(CASE WHEN event_type = 'loop_signup' THEN 1 ELSE 0 END) as signups
     FROM analytics_events
     WHERE event_type IN ('loop_impression','loop_click','loop_signup')
       AND created_at >= datetime('now','-7 days')
     GROUP BY surface ORDER BY impressions DESC`
  ).all()

  const revenueRows = await env.DB.prepare(
    `SELECT COALESCE(currency, 'GHS') as currency, COALESCE(SUM(amount_pesewas), 0) as total
     FROM orders WHERE status = 'success' AND paid_at >= datetime('now','-7 days')
     GROUP BY currency`
  ).all()

  const today = new Date()
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const html = reportHtml({
    weekLabel: `${weekAgo.toISOString().slice(0, 10)} — ${today.toISOString().slice(0, 10)}`,
    signups, loopSignups, referralRewards, memorialsCreated,
    surfaces: (surfaceRows.results || []).filter((s) => s.surface),
    revenue: revenueRows.results || [],
  })

  // Reuse the established Resend pattern — read workers/utils/dunning.js for
  // the exact send call (from-address, API shape) and mirror it here.
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'FuneralPress <reports@funeralpress.org>', // match dunning.js's verified from-address
      to: env.ADMIN_EMAIL || 'ohwpstudios@gmail.com',
      subject: `Weekly growth report — ${today.toISOString().slice(0, 10)}`,
      html,
    }),
  })
}
```

(Adapt the `from` address and any Resend wrapper to exactly what `workers/utils/dunning.js` uses — read it first. If an `ADMIN_EMAIL` var doesn't exist in wrangler.toml, add it under `[vars]` with the owner's email.)

- [ ] **Step 6:** `npx vitest run` green; `node --check workers/auth-api.js` clean. Commit:

```bash
git add workers/utils/growthReport.js workers/__tests__/growthReport.test.js workers/auth-api.js workers/auth-api-wrangler.toml
git commit -m "feat(growth): Monday weekly growth report email with loop funnel, K-factor, and revenue by currency"
```

---

### Task 16: Final verification + owner checklist

- [ ] **Step 1:** `npx vitest run` — ALL pass. `npm run build` — green; route count ≈ 83 prerendered; spot-check `dist/hymns/<first-pd-slug>/index.html` (lyrics + JSON-LD), `dist/funeral-brochure-designer/index.html` (HowTo).
- [ ] **Step 2:** `node scripts/check-crawlers.mjs` against production — record results.
- [ ] **Step 3: Deployment + owner checklist (do NOT run unattended):**

```bash
# 1. Migrations (staging then prod, in order, after Phase A & B migrations):
npx wrangler d1 execute funeralpress-db-staging --file=workers/migrations/migration-obituary-indexing.sql --remote
npx wrangler d1 execute funeralpress-db-staging --file=workers/migrations/migration-blog-pipeline.sql --remote
npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-obituary-indexing.sql --remote
npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-blog-pipeline.sql --remote
# 2. Owner — Cloudflare dashboard: if check-crawlers reports FAILs, add a
#    Configuration Rule allowing the AI/search bot user agents (same fix as feeds).
# 3. Owner — Google Search Console: verify funeralpress.org (DNS or meta tag),
#    submit sitemap.xml AND the cross-host sitemap-obituaries.xml.
# 4. Owner — add ADMIN_EMAIL var if not present; confirm RESEND_API_KEY secret exists.
# 5. auth-api deploys via CI on merge; the new crons activate automatically.
```

- [ ] **Step 4:** Report: per-task summary, crawler-check results, and the per-hymn public-domain determinations from Task 3.

---

## Spec coverage map (§ → Task)

| Spec requirement | Task |
|---|---|
| §4.1 AI-crawler pre-flight (robots, llms.txt, edge verification) | 1 (+ owner action in 16) |
| §4.2 regional/product pages + sitemap | already shipped (correction #3); enhanced by 9 |
| §4.3 hymn pages: slugs, lyrics, copyright gate, related, schema, CTA | 3, 4, 5 (infra; dataset expansion = separate initiative, correction #1) |
| §4.3 crawl-budget batching | 6 (parallel prerender; batching applies when the dataset grows) |
| §4.4 opt-in obituary indexing, revocable, Person/Event schema | 7, 8 |
| §4.5 AEO: speakable/HowTo/answer-format | 2, 9 (+ blog prompt enforces 40–60-word answer-first openings, 11) |
| §4.6 weekly AI blog drafts, owner one-click approve, feeds/sitemap flow | 10, 11, 12, 13, 14 |
| §5.3 weekly growth report | 15 |

Deliberate omission: spec §4.5 listed `QAPage` schema — omitted because `FAQPage` (already shipped on every relevant page) is the correct schema.org type for multi-question pages; `QAPage` is for single-question forum-style UGC, which FuneralPress has none of. Using it would be schema spam.

Out of scope: hymn dataset expansion (separate data-acquisition initiative), IndexNow (not in spec), GA4/GSC API integration (owner reads dashboards), memorial custom domains / multi-language (deferred per spec).
