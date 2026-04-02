import { describe, it, expect } from 'vitest'

const RECOMMENDATIONS = {
  Catholic: { tags: ['cross', 'ornate', 'scripture'], templates: ['brochure-001', 'brochure-003', 'booklet-002'] },
  Protestant: { tags: ['cross', 'hymn-layout', 'scripture'], templates: ['brochure-001', 'brochure-003'] },
  Pentecostal: { tags: ['vibrant', 'praise', 'spirit'], templates: ['brochure-004', 'poster-002'] },
  Methodist: { tags: ['cross', 'traditional', 'hymn-layout'], templates: ['brochure-001', 'booklet-001'] },
  Muslim: { tags: ['geometric', 'crescent', 'green-accent'], templates: ['brochure-005', 'booklet-004'] },
  Traditional: { tags: ['kente', 'adinkra', 'gold-black', 'royal'], templates: ['brochure-002', 'poster-001', 'brochure-007'] },
}

function getRecommendations(denomination) {
  return RECOMMENDATIONS[denomination] || null
}

describe('getRecommendations', () => {
  it('returns templates for Catholic', () => {
    const result = getRecommendations('Catholic')
    expect(result).not.toBeNull()
    expect(result.tags).toContain('cross')
    expect(result.templates.length).toBeGreaterThan(0)
  })

  it('returns templates for Muslim', () => {
    const result = getRecommendations('Muslim')
    expect(result.tags).toContain('geometric')
  })

  it('returns templates for Traditional (Akan)', () => {
    const result = getRecommendations('Traditional')
    expect(result.tags).toContain('kente')
    expect(result.tags).toContain('adinkra')
  })

  it('returns null for unknown denomination', () => {
    expect(getRecommendations('Unknown')).toBeNull()
    expect(getRecommendations('')).toBeNull()
  })

  it('all recommendations have tags and templates', () => {
    for (const [key, value] of Object.entries(RECOMMENDATIONS)) {
      expect(value.tags.length, `${key} should have tags`).toBeGreaterThan(0)
      expect(value.templates.length, `${key} should have templates`).toBeGreaterThan(0)
    }
  })
})
