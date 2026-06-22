import { describe, it, expect } from 'vitest'
import { stripDuplicateShellMeta } from './stripShellMeta.mjs'

// Mirrors what puppeteer captures from a prerendered route: the static shell
// tags from index.html (no data-rh) PLUS react-helmet-async's per-page tags
// (data-rh="true"). Before this fix both sets survived → duplicate title /
// description / og:title.
const CAPTURED = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title data-rh="true">Per-Page Title — FuneralPress</title>
    <title>FuneralPress — Ghana's All-in-One Funeral Design Platform</title>
    <meta name="description" content="Static shell description." />
    <meta data-rh="true" name="description" content="Per-page description." />
    <meta property="og:title" content="Static OG title" />
    <meta data-rh="true" property="og:title" content="Per-page OG title" />
    <meta property="og:description" content="Static OG description" />
    <meta data-rh="true" property="og:description" content="Per-page OG description" />
    <meta name="twitter:title" content="Static twitter title" />
    <meta data-rh="true" name="twitter:title" content="Per-page twitter title" />
    <link rel="canonical" data-rh="true" href="https://funeralpress.org/blog/x" />
    <script type="application/ld+json">{"@type":"Article"}</script>
  </head>
  <body><div id="root">content</div></body>
</html>`

const count = (html, re) => (html.match(re) || []).length

describe('stripDuplicateShellMeta', () => {
  const out = stripDuplicateShellMeta(CAPTURED)

  it('leaves exactly one <title> (Helmet per-page)', () => {
    expect(count(out, /<title\b/gi)).toBe(1)
    expect(out).toContain('Per-Page Title — FuneralPress')
    expect(out).not.toContain("FuneralPress — Ghana's All-in-One Funeral Design Platform")
  })

  it('leaves exactly one meta description (Helmet per-page)', () => {
    expect(count(out, /<meta\b[^>]*name=("|')description\1/gi)).toBe(1)
    expect(out).toContain('Per-page description.')
    expect(out).not.toContain('Static shell description.')
  })

  it('strips the static og:title / og:description, keeps the Helmet ones', () => {
    expect(count(out, /property=("|')og:title\1/gi)).toBe(1)
    expect(count(out, /property=("|')og:description\1/gi)).toBe(1)
    expect(out).toContain('Per-page OG title')
    expect(out).not.toContain('Static OG title')
  })

  it('strips the static twitter:title, keeps the Helmet one', () => {
    expect(count(out, /name=("|')twitter:title\1/gi)).toBe(1)
    expect(out).toContain('Per-page twitter title')
    expect(out).not.toContain('Static twitter title')
  })

  it('preserves JSON-LD and other head content', () => {
    expect(out).toContain('application/ld+json')
    expect(out).toContain('rel="canonical"')
    expect(out).toContain('charset="UTF-8"')
    expect(out).toContain('<div id="root">content</div>')
  })

  it('is idempotent', () => {
    expect(stripDuplicateShellMeta(out)).toBe(out)
  })
})
