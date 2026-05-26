import { describe, it, expect } from 'vitest'
import { visibleGalleryPhotos, FREE_PHOTO_CAP } from '../memorialTiers.js'

const makePhotos = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, src: `img${i}.jpg`, caption: '', pageTitle: '' }))

describe('visibleGalleryPhotos', () => {
  it('returns all photos when features.unlimitedPhotos is true (premium)', () => {
    const photos = makePhotos(25)
    const result = visibleGalleryPhotos(photos, { unlimitedPhotos: true })
    expect(result).toHaveLength(25)
    expect(result).toBe(photos)
  })

  it('caps to FREE_PHOTO_CAP when features.unlimitedPhotos is falsy (free)', () => {
    const photos = makePhotos(20)
    const result = visibleGalleryPhotos(photos, { unlimitedPhotos: false })
    expect(result).toHaveLength(FREE_PHOTO_CAP)
    expect(result[0]).toEqual(photos[0])
    expect(result[FREE_PHOTO_CAP - 1]).toEqual(photos[FREE_PHOTO_CAP - 1])
  })

  it('caps when features.unlimitedPhotos is undefined (no feature object)', () => {
    const photos = makePhotos(15)
    const result = visibleGalleryPhotos(photos, {})
    expect(result).toHaveLength(FREE_PHOTO_CAP)
  })

  it('caps when features is null or undefined (treat as free)', () => {
    const photos = makePhotos(15)
    expect(visibleGalleryPhotos(photos, null)).toHaveLength(FREE_PHOTO_CAP)
    expect(visibleGalleryPhotos(photos, undefined)).toHaveLength(FREE_PHOTO_CAP)
  })

  it('returns all photos when count is under cap even on free tier', () => {
    const photos = makePhotos(7)
    const result = visibleGalleryPhotos(photos, { unlimitedPhotos: false })
    expect(result).toHaveLength(7)
  })

  it('handles null/undefined photos array gracefully', () => {
    expect(visibleGalleryPhotos(null, { unlimitedPhotos: false })).toEqual([])
    expect(visibleGalleryPhotos(undefined, { unlimitedPhotos: true })).toEqual([])
  })

  it('handles empty array', () => {
    expect(visibleGalleryPhotos([], { unlimitedPhotos: false })).toEqual([])
    expect(visibleGalleryPhotos([], { unlimitedPhotos: true })).toEqual([])
  })

  it('returns exact slice starting from index 0', () => {
    const photos = makePhotos(12)
    const result = visibleGalleryPhotos(photos, { unlimitedPhotos: false })
    expect(result).toHaveLength(FREE_PHOTO_CAP)
    for (let i = 0; i < FREE_PHOTO_CAP; i++) {
      expect(result[i]).toBe(photos[i])
    }
  })
})
