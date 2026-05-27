# Blog Syndication Feeds (RSS 2.0 + Atom 1.0 + JSON Feed) — Design

**Date:** 2026-05-27
**Status:** Approved, ready for implementation plan
**Owner:** FuneralPress

## Goal

Generate three high-quality, standards-compliant syndication feeds for the FuneralPress
blog (`https://funeralpress.org/blog`) so that feed readers, aggregators, and AI answer
engines can consume the full catalogue of funeral-planning guides:

- `https://funeralpress.org/rss.xml` — RSS 2.0
- `https://funeralpress.org/atom.xml` — Atom 1.0
- `https://funeralpress.org/feed.json` — JSON Feed 1.1

Each feed carries the **full article content** (not just a summary) so readers get the
complete guide without leaving their reader, and AI engines can index the whole text.

## Context

- The site is a React SPA built with Vite and deployed to Cloudflare Pages, then
  prerendered to static HTML via Puppeteer (`scripts/prerender.mjs`).
- Blog posts live in `src/data/blogPosts.js` as a structured array. Each post:
  - `slug` (string) — used for the URL `/blog/{slug}`
  - `title` (string)
  - `description` (string) — used as the item summary
  - `date` (string, `YYYY-MM-DD`)
  - `keywords` (string[]) — mapped to feed categories
  - `content` (block[]) — blocks of type `paragraph`, `heading`, `list`, `cta`
  - There is **no** per-post author or image field. Author is the site-level "FuneralPress".
- An established, tested pattern already exists for build-time XML generation:
  `vite-plugins/sitemap.js` exposes a pure `buildSitemap()` builder wrapped in a
  `closeBundle` Vite plugin that writes `dist/sitemap.xml`, with unit tests in
  `vite-plugins/__tests__/sitemap.test.js`. The feeds mirror this pattern exactly.

## Approach

**Build-time Vite plugin.** Pure builder functions plus a `closeBundle` plugin that
writes the three files into `dist/`. Cloudflare Pages serves them as static assets:
zero runtime cost, fully cacheable, and regenerated on every build so they never drift
from `blogPosts.js`.

Rejected alternatives:
- **Pages Function / Worker at request time** — the blog is fully static, so dynamic
  generation only adds a runtime, edge cold-start, and a duplicate copy of the post data
  for no benefit.
- **Hand-maintained files in `public/`** — go stale the moment a post is added.

## Module Structure

All new code is build-time only (under `vite-plugins/`) — feeds never ship in the JS bundle.

| File | Purpose |
|---|---|
| `vite-plugins/blog-content-html.js` | Pure `renderContentToHtml(content)` — serializes a post's content blocks into clean, escaped HTML. Shared by all three feeds. |
| `vite-plugins/feeds.js` | Pure `buildRssFeed(opts)`, `buildAtomFeed(opts)`, `buildJsonFeed(opts)` + default export `feedsPlugin({ blogPosts, outDir })` that emits all three files on `closeBundle`. |
| `vite-plugins/__tests__/feeds.test.js` | Vitest suite for the three builders. |
| `vite-plugins/__tests__/blog-content-html.test.js` | Vitest suite for the HTML serializer. |

Edits:
- `vite.config.js` — import and register `feedsPlugin({ blogPosts })` next to `sitemapPlugin`.
- `index.html` — add three `<link rel="alternate">` autodiscovery tags in `<head>`.

No new dependencies. No app/runtime code changes.

## Content-Block → HTML Serialization

`renderContentToHtml(content)` returns a single HTML string by mapping each block:

- `paragraph` → `<p>{escaped text}</p>`
- `heading` → `<h2>{escaped text}</h2>`
- `list` → `<ul><li>{escaped item}</li>…</ul>`
- `cta` → `<p><a href="{absolutized link}">{escaped text}</a></p>`

Rules:
- All human text is HTML-escaped (`&`, `<`, `>`, `"`, `'`).
- CTA `link` values are absolutized: a leading-slash path like `/editor` becomes
  `https://funeralpress.org/editor` so links work inside a feed reader. Absolute URLs are
  left untouched.
- Unknown block types are skipped defensively (no throw).
- The function is pure and has no Vite/Node dependencies, so it is trivially unit-testable.

## Feed Contents

All feeds include **all** posts that have a `slug`, sorted **newest-first** by `date`.
Posts without a slug are skipped (mirrors sitemap behaviour).

### Channel / feed-level metadata

- **Title:** `FuneralPress Blog — Funeral Planning Guides`
- **Site link:** `https://funeralpress.org/blog`
- **Description:** `Expert guides on funeral planning in Ghana. Learn about costs, customs, brochure design tips, hymn selections, and how to honour your loved ones beautifully.`
- **Language:** `en`
- **lastBuildDate / updated:** the newest post `date` (falling back to build time)
- **Self link:** `atom:link rel="self"` (RSS), `link rel="self"` (Atom), `feed_url` (JSON)
- **Generator:** `FuneralPress`
- **Image / icon:** `https://funeralpress.org/og-image.png` (channel image) and
  `https://funeralpress.org/icon-512.png` (icon/favicon for JSON Feed)
- **Copyright:** `© {year} FuneralPress`
- **Author:** `FuneralPress`

### Item-level fields

| Field | RSS 2.0 | Atom 1.0 | JSON Feed 1.1 |
|---|---|---|---|
| Title | `<title>` | `<title>` | `title` |
| Link | `<link>` | `<link rel="alternate">` | `url` |
| Unique ID | `<guid isPermaLink="true">` | `<id>` | `id` |
| Publish date | `<pubDate>` RFC-822 | `<published>`/`<updated>` RFC-3339 | `date_published` RFC-3339 |
| Summary | `<description>` | `<summary>` | `summary` |
| Full content | `<content:encoded>` (CDATA) | `<content type="html">` (CDATA) | `content_html` |
| Categories | `<category>` per keyword | `<category term="…">` per keyword | `tags[]` |
| Author | `FuneralPress` | `<author><name>` | `authors[].name` |

Item link/guid/id = `https://funeralpress.org/blog/{slug}`.

### Format correctness

- **RSS 2.0:** `<rss version="2.0">` with `xmlns:content` and `xmlns:atom` namespaces;
  dates in RFC-822 (`date` + `00:00:00 GMT`, e.g. `Wed, 11 Mar 2026 00:00:00 GMT`).
- **Atom 1.0:** `<feed xmlns="http://www.w3.org/2005/Atom">`; dates in RFC-3339
  (`2026-03-11T00:00:00Z`).
- **JSON Feed 1.1:** top-level `"version": "https://jsonfeed.org/version/1.1"`; valid
  JSON via `JSON.stringify`; dates in RFC-3339.
- A single shared `escapeXml` helper escapes `&`, `<`, `>`, `"`, `'` for all XML text
  nodes. Full HTML content goes inside CDATA so it is not double-escaped. JSON content is
  a plain string (escaping handled by `JSON.stringify`).

## Autodiscovery

Add to `index.html` `<head>` (present on every prerendered page):

```html
<link rel="alternate" type="application/rss+xml" title="FuneralPress Blog (RSS)" href="/rss.xml" />
<link rel="alternate" type="application/atom+xml" title="FuneralPress Blog (Atom)" href="/atom.xml" />
<link rel="alternate" type="application/feed+json" title="FuneralPress Blog (JSON Feed)" href="/feed.json" />
```

## Testing

`blog-content-html.test.js`:
- Each block type renders to the expected tag.
- Text is HTML-escaped.
- CTA relative links are absolutized; absolute links are left alone.
- Unknown block types are skipped without throwing.

`feeds.test.js`:
- **Well-formedness:** RSS/Atom start with the XML declaration and correct root element;
  JSON Feed parses via `JSON.parse` and has `version` `https://jsonfeed.org/version/1.1`.
- **Completeness:** every passed post appears in each feed; full content present
  (a content-only phrase appears, proving it is not summary-only).
- **Ordering:** items are reverse-chronological by `date`.
- **Date formats:** RSS uses RFC-822, Atom/JSON use RFC-3339, for the same post.
- **Escaping:** `&`/`<`/`>` in a post title are escaped in XML feeds.
- **Categories:** keywords appear as categories/tags.
- **Robustness:** posts without a slug are skipped.

## Files Touched

New:
- `vite-plugins/blog-content-html.js`
- `vite-plugins/feeds.js`
- `vite-plugins/__tests__/blog-content-html.test.js`
- `vite-plugins/__tests__/feeds.test.js`

Edited:
- `vite.config.js` (register `feedsPlugin`)
- `index.html` (autodiscovery `<link>` tags)

## Out of Scope (YAGNI)

- Per-category / per-tag feeds (posts use freeform `keywords`, not a fixed taxonomy).
- Per-post author or image fields (data model has none).
- Pagination / RSS cloud / WebSub.
- Runtime/dynamic feed generation.
