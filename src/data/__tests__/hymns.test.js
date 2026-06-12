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
