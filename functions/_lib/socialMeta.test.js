import { describe, it, expect } from 'vitest'
import { escapeHtml, buildMetaTags, injectMeta } from './socialMeta.js'

const SHELL = `<!doctype html><html lang="en"><head>
<title>FuneralPress — Ghana's All-in-One Funeral Design Platform</title>
<meta name="description" content="Design funeral brochures online.">
<meta property="og:title" content="FuneralPress">
<meta property="og:image" content="https://funeralpress.org/og-image.png">
<meta property="og:image:width" content="1200">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="FuneralPress">
<script type="application/ld+json">{"@type":"Organization"}</script>
</head><body><div id="root"></div></body></html>`

describe('escapeHtml', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHtml(`Tom & "Jerry" <b> 'x'`)).toBe('Tom &amp; &quot;Jerry&quot; &lt;b&gt; &#39;x&#39;')
  })
  it('coerces null/undefined to empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('buildMetaTags', () => {
  it('includes title, og and twitter tags with escaped values', () => {
    const block = buildMetaTags({
      title: 'Ama "Queen" Mensah — Memorial | FuneralPress',
      description: 'In loving memory of Ama.',
      image: 'https://img/x.jpg',
      url: 'https://funeralpress.org/memorial/abc',
    })
    expect(block).toContain('<title>Ama &quot;Queen&quot; Mensah — Memorial | FuneralPress</title>')
    expect(block).toContain('<meta property="og:title" content="Ama &quot;Queen&quot; Mensah — Memorial | FuneralPress">')
    expect(block).toContain('<meta property="og:description" content="In loving memory of Ama.">')
    expect(block).toContain('<meta property="og:image" content="https://img/x.jpg">')
    expect(block).toContain('<meta property="og:url" content="https://funeralpress.org/memorial/abc">')
    expect(block).toContain('<meta name="twitter:card" content="summary_large_image">')
  })
  it('uses summary card and omits image tags when no image', () => {
    const block = buildMetaTags({ title: 'T', description: 'D', url: 'https://x' })
    expect(block).toContain('<meta name="twitter:card" content="summary">')
    expect(block).not.toContain('og:image')
    expect(block).not.toContain('twitter:image')
  })
  it('truncates long descriptions', () => {
    const long = 'x'.repeat(300)
    const block = buildMetaTags({ title: 'T', description: long })
    const m = block.match(/og:description" content="([^"]*)"/)
    expect(m[1].length).toBeLessThanOrEqual(200)
  })
})

describe('injectMeta', () => {
  const out = injectMeta(SHELL, {
    title: 'Kofi Mensah — Memorial | FuneralPress',
    description: 'A celebration of life.',
    image: 'https://img/kofi.jpg',
    url: 'https://funeralpress.org/memorial/xyz',
  })

  it('replaces the homepage <title> with the entity title (exactly one title)', () => {
    expect(out).toContain('<title>Kofi Mensah — Memorial | FuneralPress</title>')
    expect(out).not.toContain("FuneralPress — Ghana's All-in-One Funeral Design Platform")
    expect((out.match(/<title>/g) || []).length).toBe(1)
  })

  it('removes the homepage og/twitter/description defaults (no duplicates)', () => {
    expect((out.match(/property="og:title"/g) || []).length).toBe(1)
    expect(out).not.toContain('https://funeralpress.org/og-image.png')
    expect(out).not.toContain('og:image:width')
    expect(out).not.toContain('content="Design funeral brochures online."')
    expect((out.match(/name="twitter:title"/g) || []).length).toBe(1)
  })

  it('injects the entity image + url', () => {
    expect(out).toContain('content="https://img/kofi.jpg"')
    expect(out).toContain('content="https://funeralpress.org/memorial/xyz"')
  })

  it('preserves non-meta head content (JSON-LD) and the app root', () => {
    expect(out).toContain('<script type="application/ld+json">{"@type":"Organization"}</script>')
    expect(out).toContain('<div id="root"></div>')
  })
})
