# Blog Syndication Feeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate three standards-compliant syndication feeds (RSS 2.0, Atom 1.0, JSON Feed 1.1) for the FuneralPress blog at build time, each carrying the full HTML of every guide.

**Architecture:** Pure builder functions plus a `closeBundle` Vite plugin that writes `dist/rss.xml`, `dist/atom.xml`, and `dist/feed.json` — mirroring the existing `vite-plugins/sitemap.js` pattern. Feeds are static assets served by Cloudflare Pages, regenerated on every build from `src/data/blogPosts.js`. A lower-level module (`blog-content-html.js`) owns the content→HTML serializer and the escaping/URL primitives shared by all three builders.

**Tech Stack:** Node ESM, Vite plugin API, Vitest. No new dependencies.

---

## File Structure

| File | Responsibility |
|---|---|
| `vite-plugins/blog-content-html.js` (new) | `renderContentToHtml()` + shared `escapeXml`, `absolutizeUrl`, `SITE_URL`. Lower layer — no Vite/Node deps. |
| `vite-plugins/feeds.js` (new) | `buildRssFeed()`, `buildAtomFeed()`, `buildJsonFeed()` + default `feedsPlugin()`. Imports from `blog-content-html.js`. |
| `vite-plugins/__tests__/blog-content-html.test.js` (new) | Tests for the serializer + primitives. |
| `vite-plugins/__tests__/feeds.test.js` (new) | Tests for the three builders. |
| `vite.config.js` (modify) | Register `feedsPlugin({ blogPosts })`. |
| `index.html` (modify) | Three `<link rel="alternate">` autodiscovery tags. |

Dependency direction: `feeds.js` → `blog-content-html.js` (one-way, no cycle).

---

### Task 1: Content-block → HTML serializer + shared primitives

**Files:**
- Create: `vite-plugins/blog-content-html.js`
- Test: `vite-plugins/__tests__/blog-content-html.test.js`

- [ ] **Step 1: Write the failing test**

Create `vite-plugins/__tests__/blog-content-html.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  renderContentToHtml,
  escapeXml,
  absolutizeUrl,
  SITE_URL,
} from '../blog-content-html.js'

describe('escapeXml', () => {
  it('escapes the five significant characters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &apos; f',
    )
  })
})

describe('absolutizeUrl', () => {
  it('prefixes site-relative paths with the site URL', () => {
    expect(absolutizeUrl('/editor')).toBe(`${SITE_URL}/editor`)
  })

  it('leaves absolute URLs untouched', () => {
    expect(absolutizeUrl('https://example.com/x')).toBe('https://example.com/x')
  })
})

describe('renderContentToHtml', () => {
  it('renders paragraphs, headings, lists, and CTAs', () => {
    const html = renderContentToHtml([
      { type: 'heading', text: 'Getting Started' },
      { type: 'paragraph', text: 'Hello world' },
      { type: 'list', items: ['One', 'Two'] },
      { type: 'cta', text: 'Open the editor', link: '/editor' },
    ])
    expect(html).toContain('<h2>Getting Started</h2>')
    expect(html).toContain('<p>Hello world</p>')
    expect(html).toContain('<ul><li>One</li><li>Two</li></ul>')
    expect(html).toContain(`<p><a href="${SITE_URL}/editor">Open the editor</a></p>`)
  })

  it('escapes HTML-significant characters in text', () => {
    const html = renderContentToHtml([{ type: 'paragraph', text: 'Tom & Jerry <fun>' }])
    expect(html).toContain('<p>Tom &amp; Jerry &lt;fun&gt;</p>')
  })

  it('skips unknown block types without throwing', () => {
    const html = renderContentToHtml([
      { type: 'video', src: 'x' },
      { type: 'paragraph', text: 'kept' },
    ])
    expect(html).toBe('<p>kept</p>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run vite-plugins/__tests__/blog-content-html.test.js`
Expected: FAIL — cannot resolve `../blog-content-html.js`.

- [ ] **Step 3: Write the implementation**

Create `vite-plugins/blog-content-html.js`:

```js
// Build-time helpers for turning a blog post's structured content blocks into
// HTML, plus the small escaping/URL primitives shared by the syndication-feed
// builders. Pure — no Vite or Node dependencies — so it is trivially testable.

export const SITE_URL = 'https://funeralpress.org'

// Escape the five XML/HTML-significant characters. Safe for XML text nodes and
// HTML attribute/body text alike.
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Turn a site-relative path ("/editor") into an absolute URL so links work
// inside a feed reader. Absolute http(s) URLs are returned unchanged.
export function absolutizeUrl(link) {
  if (!link) return SITE_URL
  if (/^https?:\/\//i.test(link)) return link
  return SITE_URL + (link.startsWith('/') ? link : `/${link}`)
}

// Serialize a post's content blocks into a single HTML string. Supported block
// types: paragraph, heading, list, cta. Unknown types are skipped so a future
// block type can never crash the build.
export function renderContentToHtml(content = []) {
  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    switch (block.type) {
      case 'paragraph':
        parts.push(`<p>${escapeXml(block.text)}</p>`)
        break
      case 'heading':
        parts.push(`<h2>${escapeXml(block.text)}</h2>`)
        break
      case 'list': {
        const items = (block.items || [])
          .map((item) => `<li>${escapeXml(item)}</li>`)
          .join('')
        parts.push(`<ul>${items}</ul>`)
        break
      }
      case 'cta':
        parts.push(
          `<p><a href="${escapeXml(absolutizeUrl(block.link))}">${escapeXml(block.text)}</a></p>`,
        )
        break
      default:
        break
    }
  }
  return parts.join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run vite-plugins/__tests__/blog-content-html.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/blog-content-html.js vite-plugins/__tests__/blog-content-html.test.js
git commit -m "feat(feeds): add blog content-to-HTML serializer and shared primitives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: RSS 2.0 builder + shared feed helpers

**Files:**
- Create: `vite-plugins/feeds.js`
- Test: `vite-plugins/__tests__/feeds.test.js`

- [ ] **Step 1: Write the failing test**

Create `vite-plugins/__tests__/feeds.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildRssFeed } from '../feeds.js'

// Two posts, deliberately given to the builder oldest-first so we can assert
// the builder re-orders them newest-first. The newer title carries XML-special
// characters to test escaping.
const SAMPLE = [
  {
    slug: 'older-post',
    title: 'Older Post',
    description: 'An older guide',
    date: '2026-01-10',
    keywords: ['planning'],
    content: [{ type: 'paragraph', text: 'Older body text marker' }],
  },
  {
    slug: 'newer-post',
    title: 'Newer & Better <Post>',
    description: 'A newer guide',
    date: '2026-03-11',
    keywords: ['costs', 'tips'],
    content: [{ type: 'paragraph', text: 'Newer body text marker' }],
  },
]

describe('buildRssFeed', () => {
  it('produces a well-formed RSS 2.0 document', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('</rss>')
  })

  it('includes every post with full content, not just the summary', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('https://funeralpress.org/blog/newer-post')
    expect(xml).toContain('https://funeralpress.org/blog/older-post')
    expect(xml).toContain('Newer body text marker')
    expect(xml).toContain('<content:encoded><![CDATA[')
  })

  it('orders items newest-first', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml.indexOf('older-post')).toBeGreaterThan(xml.indexOf('newer-post'))
  })

  it('uses RFC-822 publish dates', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('<pubDate>Wed, 11 Mar 2026 00:00:00 GMT</pubDate>')
  })

  it('escapes XML-special characters in titles', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('Newer &amp; Better &lt;Post&gt;')
  })

  it('maps keywords to categories', () => {
    const xml = buildRssFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('<category>costs</category>')
  })

  it('skips posts without a slug', () => {
    const xml = buildRssFeed({
      blogPosts: [...SAMPLE, { title: 'No slug', date: '2026-04-01' }],
    })
    const itemCount = (xml.match(/<item>/g) || []).length
    expect(itemCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: FAIL — cannot resolve `../feeds.js`.

- [ ] **Step 3: Write the implementation**

Create `vite-plugins/feeds.js`:

```js
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { SITE_URL, escapeXml, renderContentToHtml } from './blog-content-html.js'

const FEED_TITLE = 'FuneralPress Blog — Funeral Planning Guides'
const FEED_DESCRIPTION =
  'Expert guides on funeral planning in Ghana. Learn about costs, customs, ' +
  'brochure design tips, hymn selections, and how to honour your loved ones beautifully.'
const BLOG_URL = `${SITE_URL}/blog`
const FEED_IMAGE = `${SITE_URL}/og-image.png`
const FEED_ICON = `${SITE_URL}/icon-512.png`
const AUTHOR_NAME = 'FuneralPress'

// post.date is 'YYYY-MM-DD'; interpret it as midnight UTC.
function postDate(post) {
  return new Date(`${post.date}T00:00:00Z`)
}

// "Wed, 11 Mar 2026 00:00:00 GMT" — Date#toUTCString is exactly RFC-822/1123.
function toRfc822(date) {
  return date.toUTCString()
}

// "2026-03-11T00:00:00Z" — RFC-3339 without fractional seconds.
function toRfc3339(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function postUrl(slug) {
  return `${SITE_URL}/blog/${slug}`
}

// Posts with a slug, newest first. String compare is correct for ISO dates.
function orderedPosts(blogPosts) {
  return blogPosts
    .filter((post) => post && post.slug)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function buildRssFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const lastBuild = posts.length ? postDate(posts[0]) : new Date()
  const year = new Date().getFullYear()

  const items = posts.map((post) => {
    const url = postUrl(post.slug)
    const html = renderContentToHtml(post.content)
    const categories = (post.keywords || [])
      .map((kw) => `      <category>${escapeXml(kw)}</category>`)
      .join('\n')
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${toRfc822(postDate(post))}</pubDate>`,
      `      <description>${escapeXml(post.description)}</description>`,
      `      <content:encoded><![CDATA[${html}]]></content:encoded>`,
      categories,
      `      <dc:creator>${escapeXml(AUTHOR_NAME)}</dc:creator>`,
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" ' +
      'xmlns:atom="http://www.w3.org/2005/Atom" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(BLOG_URL)}</link>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    '    <generator>FuneralPress</generator>',
    `    <copyright>© ${year} ${escapeXml(AUTHOR_NAME)}</copyright>`,
    '    <image>',
    `      <url>${escapeXml(FEED_IMAGE)}</url>`,
    `      <title>${escapeXml(FEED_TITLE)}</title>`,
    `      <link>${escapeXml(BLOG_URL)}</link>`,
    '    </image>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: PASS — all 7 `buildRssFeed` tests green.

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/feeds.js vite-plugins/__tests__/feeds.test.js
git commit -m "feat(feeds): add RSS 2.0 builder with full-content items

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Atom 1.0 builder

**Files:**
- Modify: `vite-plugins/feeds.js` (add `buildAtomFeed`)
- Test: `vite-plugins/__tests__/feeds.test.js` (add `buildAtomFeed` block)

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `vite-plugins/__tests__/feeds.test.js` (and add `buildAtomFeed` to the existing import from `../feeds.js`):

```js
describe('buildAtomFeed', () => {
  it('produces a well-formed Atom 1.0 document', () => {
    const xml = buildAtomFeed({ blogPosts: SAMPLE })
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom"')
    expect(xml).toContain('</feed>')
  })

  it('uses RFC-3339 publish dates', () => {
    const xml = buildAtomFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('<published>2026-03-11T00:00:00Z</published>')
  })

  it('includes full content as type="html"', () => {
    const xml = buildAtomFeed({ blogPosts: SAMPLE })
    expect(xml).toContain('<content type="html"><![CDATA[')
    expect(xml).toContain('Newer body text marker')
  })

  it('orders entries newest-first', () => {
    const xml = buildAtomFeed({ blogPosts: SAMPLE })
    expect(xml.indexOf('older-post')).toBeGreaterThan(xml.indexOf('newer-post'))
  })
})
```

The import line at the top becomes:

```js
import { buildRssFeed, buildAtomFeed } from '../feeds.js'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: FAIL — `buildAtomFeed is not a function`.

- [ ] **Step 3: Write the implementation**

Add `buildAtomFeed` to `vite-plugins/feeds.js` (after `buildRssFeed`). It reuses the module-level helpers and constants already defined in Task 2:

```js
export function buildAtomFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const updated = posts.length ? postDate(posts[0]) : new Date()
  const year = new Date().getFullYear()

  const entries = posts.map((post) => {
    const url = postUrl(post.slug)
    const html = renderContentToHtml(post.content)
    const published = toRfc3339(postDate(post))
    const categories = (post.keywords || [])
      .map((kw) => `    <category term="${escapeXml(kw)}" />`)
      .join('\n')
    return [
      '  <entry>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link rel="alternate" href="${escapeXml(url)}" />`,
      `    <id>${escapeXml(url)}</id>`,
      `    <published>${published}</published>`,
      `    <updated>${published}</updated>`,
      `    <summary>${escapeXml(post.description)}</summary>`,
      `    <content type="html"><![CDATA[${html}]]></content>`,
      categories,
      `    <author><name>${escapeXml(AUTHOR_NAME)}</name></author>`,
      '  </entry>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
    `  <title>${escapeXml(FEED_TITLE)}</title>`,
    `  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>`,
    `  <link rel="alternate" href="${escapeXml(BLOG_URL)}" />`,
    `  <link rel="self" href="${escapeXml(`${SITE_URL}/atom.xml`)}" />`,
    `  <id>${escapeXml(BLOG_URL)}</id>`,
    `  <updated>${toRfc3339(updated)}</updated>`,
    `  <icon>${escapeXml(FEED_ICON)}</icon>`,
    `  <logo>${escapeXml(FEED_IMAGE)}</logo>`,
    `  <rights>© ${year} ${escapeXml(AUTHOR_NAME)}</rights>`,
    '  <generator>FuneralPress</generator>',
    `  <author><name>${escapeXml(AUTHOR_NAME)}</name></author>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: PASS — RSS + Atom blocks all green.

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/feeds.js vite-plugins/__tests__/feeds.test.js
git commit -m "feat(feeds): add Atom 1.0 builder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: JSON Feed 1.1 builder

**Files:**
- Modify: `vite-plugins/feeds.js` (add `buildJsonFeed`)
- Test: `vite-plugins/__tests__/feeds.test.js` (add `buildJsonFeed` block)

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `vite-plugins/__tests__/feeds.test.js` and extend the import to include `buildJsonFeed`:

```js
describe('buildJsonFeed', () => {
  it('produces valid JSON Feed 1.1', () => {
    const feed = JSON.parse(buildJsonFeed({ blogPosts: SAMPLE }))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(feed.items).toHaveLength(2)
  })

  it('orders items newest-first with full content', () => {
    const feed = JSON.parse(buildJsonFeed({ blogPosts: SAMPLE }))
    expect(feed.items[0].url).toBe('https://funeralpress.org/blog/newer-post')
    expect(feed.items[0].content_html).toContain('Newer body text marker')
    expect(feed.items[0].date_published).toBe('2026-03-11T00:00:00Z')
  })

  it('maps keywords to tags', () => {
    const feed = JSON.parse(buildJsonFeed({ blogPosts: SAMPLE }))
    expect(feed.items[0].tags).toEqual(['costs', 'tips'])
  })
})
```

The import line at the top becomes:

```js
import { buildRssFeed, buildAtomFeed, buildJsonFeed } from '../feeds.js'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: FAIL — `buildJsonFeed is not a function`.

- [ ] **Step 3: Write the implementation**

Add `buildJsonFeed` to `vite-plugins/feeds.js` (after `buildAtomFeed`):

```js
export function buildJsonFeed({ blogPosts = [] } = {}) {
  const posts = orderedPosts(blogPosts)
  const author = { name: AUTHOR_NAME, url: SITE_URL }

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: FEED_TITLE,
    home_page_url: BLOG_URL,
    feed_url: `${SITE_URL}/feed.json`,
    description: FEED_DESCRIPTION,
    language: 'en',
    icon: FEED_IMAGE,
    favicon: FEED_ICON,
    authors: [author],
    items: posts.map((post) => ({
      id: postUrl(post.slug),
      url: postUrl(post.slug),
      title: post.title,
      summary: post.description,
      content_html: renderContentToHtml(post.content),
      date_published: toRfc3339(postDate(post)),
      tags: post.keywords || [],
      authors: [author],
    })),
  }

  return `${JSON.stringify(feed, null, 2)}\n`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run vite-plugins/__tests__/feeds.test.js`
Expected: PASS — all three builder blocks green.

- [ ] **Step 5: Commit**

```bash
git add vite-plugins/feeds.js vite-plugins/__tests__/feeds.test.js
git commit -m "feat(feeds): add JSON Feed 1.1 builder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Vite plugin + build wiring

**Files:**
- Modify: `vite-plugins/feeds.js` (add default `feedsPlugin` export)
- Modify: `vite.config.js:6-7,57` (import and register the plugin)

This task wires the builders into the build. There is no unit test for the plugin's file-writing side effect; it is verified by the build run in Task 7. (`sitemap.js` follows the same convention — its plugin wrapper is untested, only `buildSitemap` is.)

- [ ] **Step 1: Add the plugin export**

Append to `vite-plugins/feeds.js`:

```js
/**
 * Vite plugin that emits dist/rss.xml, dist/atom.xml, and dist/feed.json after
 * the build completes. Runs on closeBundle so it executes after Vite copies
 * public/ assets, mirroring funeralpress-sitemap.
 *
 * @param {object} [opts]
 * @param {Array<{slug: string, title?: string, description?: string, date?: string, keywords?: string[], content?: object[]}>} [opts.blogPosts]
 * @param {string} [opts.outDir='dist']
 */
export default function feedsPlugin(opts = {}) {
  return {
    name: 'funeralpress-feeds',
    apply: 'build',
    closeBundle() {
      const outDir = opts.outDir || 'dist'
      const files = [
        ['rss.xml', buildRssFeed(opts)],
        ['atom.xml', buildAtomFeed(opts)],
        ['feed.json', buildJsonFeed(opts)],
      ]
      for (const [name, content] of files) {
        const outPath = resolve(outDir, name)
        writeFileSync(outPath, content, 'utf8')
        console.log(`[feeds] wrote ${outPath}`)
      }
    },
  }
}
```

- [ ] **Step 2: Register the plugin in `vite.config.js`**

Add the import alongside the existing `sitemapPlugin` import (currently `vite.config.js:6`):

```js
import sitemapPlugin from './vite-plugins/sitemap.js'
import feedsPlugin from './vite-plugins/feeds.js'
import blogPosts from './src/data/blogPosts.js'
```

Then register it immediately after the `sitemapPlugin({ blogPosts })` line (currently `vite.config.js:57`):

```js
    sitemapPlugin({ blogPosts }),
    // Generate dist/rss.xml, dist/atom.xml, and dist/feed.json at build time so
    // the blog's syndication feeds stay in sync with src/data/blogPosts.js.
    feedsPlugin({ blogPosts }),
```

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — existing suites plus the two new feed suites, no regressions.

- [ ] **Step 4: Commit**

```bash
git add vite-plugins/feeds.js vite.config.js
git commit -m "feat(feeds): emit rss.xml, atom.xml, feed.json via build plugin

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Feed autodiscovery in index.html

**Files:**
- Modify: `index.html:11` (insert after the favicon `<link>`)

- [ ] **Step 1: Add the autodiscovery link tags**

In `index.html`, immediately after the favicon line (`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`), insert:

```html
    <!-- Blog syndication feeds (autodiscovery) -->
    <link rel="alternate" type="application/rss+xml" title="FuneralPress Blog (RSS)" href="/rss.xml" />
    <link rel="alternate" type="application/atom+xml" title="FuneralPress Blog (Atom)" href="/atom.xml" />
    <link rel="alternate" type="application/feed+json" title="FuneralPress Blog (JSON Feed)" href="/feed.json" />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(feeds): add feed autodiscovery link tags to index.html

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: build succeeds; console shows a `[feeds] wrote …rss.xml`, `…atom.xml`, and `…feed.json` line, plus the existing `[sitemap] wrote …` line.

- [ ] **Step 2: Confirm the three files exist in dist/**

Run (PowerShell): `Get-ChildItem dist/rss.xml, dist/atom.xml, dist/feed.json | Select-Object Name, Length`
Expected: all three files listed with non-zero `Length`.

- [ ] **Step 3: Validate the feeds parse**

Run (PowerShell), validating XML well-formedness and JSON parse + item count:

```powershell
[xml](Get-Content dist/rss.xml -Raw) | Out-Null; "rss.xml: well-formed XML"
[xml](Get-Content dist/atom.xml -Raw) | Out-Null; "atom.xml: well-formed XML"
$j = Get-Content dist/feed.json -Raw | ConvertFrom-Json
"feed.json: $($j.items.Count) items, version $($j.version)"
```

Expected: both XML files report "well-formed XML" (no parse exception); `feed.json` reports the full post count (24 at time of writing) and version `https://jsonfeed.org/version/1.1`.

- [ ] **Step 4: Spot-check a real post appears with full content**

Run: `Select-String -Path dist/rss.xml -Pattern 'content:encoded' | Select-Object -First 1`
Expected: at least one `<content:encoded>` match, confirming full article HTML is embedded (not just summaries).

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

If steps 1–4 all pass with no changes, no commit is needed — the feature is complete. If a fix was required, commit it:

```bash
git add -A
git commit -m "fix(feeds): address build verification findings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the Implementer

- **Date math:** `new Date('2026-03-11T00:00:00Z').toUTCString()` yields `Wed, 11 Mar 2026 00:00:00 GMT` (RFC-822). `.toISOString()` yields `2026-03-11T00:00:00.000Z`; the `toRfc3339` helper strips the `.000` to give `2026-03-11T00:00:00Z`. If a future post's weekday differs, that is expected — the format, not the literal weekday, is what matters.
- **Why CDATA for content:** full post HTML contains `<p>`, `<a>`, etc. Wrapping it in `<![CDATA[ ]]>` keeps it from being double-escaped in the XML feeds. JSON Feed needs no CDATA — `JSON.stringify` escapes the string correctly.
- **Author via `dc:creator`:** RSS 2.0's `<author>` element requires an email address. We use `<dc:creator>` (Dublin Core) instead to attribute "FuneralPress" without fabricating an email.
- **No new dependencies, no app/runtime code** — everything is build-time, mirroring `sitemap.js`.
