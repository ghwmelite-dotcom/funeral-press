// workers/__tests__/obituaryIndexing.test.js
import { describe, it, expect } from 'vitest'
import { obituarySitemapXml } from '../obituarySitemap.js'

describe('obituarySitemapXml', () => {
  it('produces a valid empty urlset for zero rows', () => {
    const xml = obituarySitemapXml([])
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<urlset')
    expect(xml).not.toContain('<loc>')
  })
  it('encodes slugs and emits one url per row', () => {
    const xml = obituarySitemapXml([
      { slug: 'kofi mensah', updated_at: '2026-06-01 10:00:00' },
      { slug: 'ama-owusu', updated_at: '2026-05-20 09:00:00' },
    ])
    expect(xml).toContain('/obituary/kofi%20mensah')
    expect(xml).toContain('<lastmod>2026-06-01</lastmod>')
    expect((xml.match(/<url>/g) || []).length).toBe(2)
  })
})
