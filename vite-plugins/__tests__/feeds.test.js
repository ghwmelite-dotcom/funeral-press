import { describe, it, expect } from 'vitest'
import { buildRssFeed, buildAtomFeed, buildJsonFeed } from '../feeds.js'

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

  it('emits no blank category line for a post with no keywords', () => {
    const xml = buildRssFeed({
      blogPosts: [
        {
          slug: 'no-keywords',
          title: 'No Keywords',
          description: 'A guide with no keywords',
          date: '2026-02-01',
          content: [{ type: 'paragraph', text: 'body' }],
        },
      ],
    })
    // The keyword-less item still appears, and the filter(Boolean) chain must
    // not leave an empty line where the <category> block would have been.
    expect(xml).toContain('/blog/no-keywords')
    expect(xml).not.toContain('<category></category>')
    expect(xml).not.toMatch(/\n\n\s*<dc:creator>/)
  })
})

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

  it('uses a square icon and a small square favicon', () => {
    // JSON Feed 1.1: `icon` is the large square image, `favicon` the small one.
    // The wide OG banner must not be used for either.
    const feed = JSON.parse(buildJsonFeed({ blogPosts: SAMPLE }))
    expect(feed.icon).toBe('https://funeralpress.org/icon-512.png')
    expect(feed.favicon).toBe('https://funeralpress.org/favicon.svg')
    expect(feed.icon).not.toContain('og-image')
    expect(feed.favicon).not.toContain('og-image')
  })
})
