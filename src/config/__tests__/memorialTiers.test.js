import { describe, it, expect } from 'vitest'
import * as frontend from '../memorialTiers.js'
import * as worker from '../../../workers/tierConfig.js'

describe('memorialTiers drift guard', () => {
  it('TIERS are identical', () => {
    expect(frontend.TIERS).toEqual(worker.TIERS)
  })

  it('FEATURE_MIN_RANK is identical', () => {
    expect(frontend.FEATURE_MIN_RANK).toEqual(worker.FEATURE_MIN_RANK)
  })

  it('FREE_PHOTO_CAP is identical', () => {
    expect(frontend.FREE_PHOTO_CAP).toBe(worker.FREE_PHOTO_CAP)
  })

  it('LIVESTREAM_RETENTION_DAYS is identical', () => {
    expect(frontend.LIVESTREAM_RETENTION_DAYS).toEqual(worker.LIVESTREAM_RETENTION_DAYS)
  })

  describe('tierHasFeature — frontend', () => {
    it('premium can removeBranding', () => {
      expect(frontend.tierHasFeature('premium', 'removeBranding')).toBe(true)
    })
    it('premium cannot customDomain', () => {
      expect(frontend.tierHasFeature('premium', 'customDomain')).toBe(false)
    })
    it('heritage can customDomain', () => {
      expect(frontend.tierHasFeature('heritage', 'customDomain')).toBe(true)
    })
    it('free cannot allThemes', () => {
      expect(frontend.tierHasFeature('free', 'allThemes')).toBe(false)
    })
  })

  describe('tierHasFeature — worker', () => {
    it('premium can removeBranding', () => {
      expect(worker.tierHasFeature('premium', 'removeBranding')).toBe(true)
    })
    it('premium cannot customDomain', () => {
      expect(worker.tierHasFeature('premium', 'customDomain')).toBe(false)
    })
    it('heritage can customDomain', () => {
      expect(worker.tierHasFeature('heritage', 'customDomain')).toBe(true)
    })
    it('free cannot allThemes', () => {
      expect(worker.tierHasFeature('free', 'allThemes')).toBe(false)
    })
  })

  // Safe-fail fallbacks (the access-control-relevant branches).
  describe('tierHasFeature — unknown inputs degrade safely', () => {
    for (const mod of [['frontend', frontend], ['worker', worker]]) {
      const [name, m] = mod
      it(`${name}: unknown tier is denied (degrades to free)`, () => {
        expect(m.tierHasFeature('gold', 'removeBranding')).toBe(false)
      })
      it(`${name}: unknown feature is never granted, even for heritage`, () => {
        expect(m.tierHasFeature('heritage', 'nonExistentFeature')).toBe(false)
      })
    }
  })
})
