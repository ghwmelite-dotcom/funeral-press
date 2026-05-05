import { describe, it, expect } from 'vitest'
import { buildSitemap } from '../sitemap.js'

describe('buildSitemap', () => {
  it('produces valid XML with declaration and urlset', () => {
    const xml = buildSitemap()
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('</urlset>')
  })

  it('includes the homepage with priority 1.0', () => {
    const xml = buildSitemap()
    expect(xml).toContain('<loc>https://funeralpress.org/</loc>')
    expect(xml).toMatch(/<loc>https:\/\/funeralpress\.org\/<\/loc>[\s\S]*?<priority>1\.0<\/priority>/)
  })

  it('includes all 16 Ghana region pages', () => {
    const xml = buildSitemap()
    const regionMatches = xml.match(/\/funeral-services\/[a-z-]+/g) || []
    expect(regionMatches.length).toBeGreaterThanOrEqual(16)
  })

  it('includes the 4 product landing pages', () => {
    const xml = buildSitemap()
    expect(xml).toContain('/funeral-brochure-designer')
    expect(xml).toContain('/funeral-poster-maker')
    expect(xml).toContain('/memorial-page-creator')
    expect(xml).toContain('/funeral-programme-booklet')
  })

  it('includes the donation privacy page', () => {
    const xml = buildSitemap()
    expect(xml).toContain('/privacy/donations')
  })

  it('appends blog post entries when blogPosts is passed', () => {
    const xml = buildSitemap({
      blogPosts: [
        { slug: 'how-to-plan-a-funeral', date: '2025-12-01' },
        { slug: 'choosing-a-template', date: '2026-01-15' },
      ],
    })
    expect(xml).toContain('/blog/how-to-plan-a-funeral')
    expect(xml).toContain('/blog/choosing-a-template')
    expect(xml).toContain('<lastmod>2025-12-01</lastmod>')
  })

  it('escapes XML-special characters in URLs', () => {
    const xml = buildSitemap({
      blogPosts: [{ slug: 'cats-&-dogs', date: '2025-01-01' }],
    })
    expect(xml).toContain('cats-&amp;-dogs')
    expect(xml).not.toContain('cats-&-dogs</loc>')
  })

  it('skips blog posts without a slug', () => {
    const xml = buildSitemap({
      blogPosts: [{ slug: 'good-post' }, { date: '2025-01-01' }, { slug: '', date: '2025-01-01' }],
    })
    expect(xml).toContain('/blog/good-post')
    // The empty-slug entry and the no-slug entry should not produce /blog/<empty>
    const blogMatches = xml.match(/\/blog\/[a-zA-Z0-9-]+/g) || []
    expect(blogMatches.length).toBe(1)
  })

  it('excludes user-specific and dynamic routes', () => {
    const xml = buildSitemap()
    // These routes are gated, paginated, or per-user — they should never appear
    // as bare routes in the sitemap.
    expect(xml).not.toMatch(/<loc>[^<]*\/admin<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/memorial\/[^<]+<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/gallery\/[^<]+<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/guest-book\/[^<]+<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/family-head\/[^<]+<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/approve\/[^<]+<\/loc>/)
    expect(xml).not.toMatch(/<loc>[^<]*\/m\/[^<]+\/donate<\/loc>/)
  })

  it('emits today as lastmod for static routes', () => {
    const xml = buildSitemap()
    const today = new Date().toISOString().split('T')[0]
    expect(xml).toContain(`<lastmod>${today}</lastmod>`)
  })

  it('uses custom regions list when provided', () => {
    const xml = buildSitemap({ regions: ['atlantis', 'eldorado'] })
    expect(xml).toContain('/funeral-services/atlantis')
    expect(xml).toContain('/funeral-services/eldorado')
    expect(xml).not.toContain('/funeral-services/greater-accra')
  })
})
