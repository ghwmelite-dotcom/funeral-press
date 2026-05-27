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
