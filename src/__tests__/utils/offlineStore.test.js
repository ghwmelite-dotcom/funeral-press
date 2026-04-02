import { describe, it, expect } from 'vitest'

describe('offline draft structure', () => {
  function createDraft(productType, templateId, data) {
    return {
      id: `${productType}-${Date.now()}`,
      productType,
      templateId,
      data,
      createdAt: Date.now(),
      synced: false,
    }
  }

  it('creates a draft with correct structure', () => {
    const draft = createDraft('brochure', 'template-001', { name: 'Test' })
    expect(draft.id).toMatch(/^brochure-\d+$/)
    expect(draft.productType).toBe('brochure')
    expect(draft.templateId).toBe('template-001')
    expect(draft.data).toEqual({ name: 'Test' })
    expect(draft.synced).toBe(false)
    expect(typeof draft.createdAt).toBe('number')
  })
})

describe('draft limit enforcement', () => {
  const MAX_DRAFTS = 10

  function enforceDraftLimit(drafts) {
    if (drafts.length <= MAX_DRAFTS) return drafts
    const sorted = [...drafts].sort((a, b) => a.createdAt - b.createdAt)
    return sorted.slice(sorted.length - MAX_DRAFTS)
  }

  it('keeps all drafts under the limit', () => {
    const drafts = Array.from({ length: 5 }, (_, i) => ({ createdAt: i }))
    expect(enforceDraftLimit(drafts)).toHaveLength(5)
  })

  it('trims oldest when over limit', () => {
    const drafts = Array.from({ length: 12 }, (_, i) => ({ createdAt: i, id: `d-${i}` }))
    const result = enforceDraftLimit(drafts)
    expect(result).toHaveLength(10)
    expect(result[0].id).toBe('d-2')
  })

  it('keeps newest drafts', () => {
    const drafts = Array.from({ length: 11 }, (_, i) => ({ createdAt: i, id: `d-${i}` }))
    const result = enforceDraftLimit(drafts)
    expect(result[result.length - 1].id).toBe('d-10')
  })
})

describe('sync status tracking', () => {
  it('marks draft as synced', () => {
    const draft = { id: 'd-1', synced: false }
    draft.synced = true
    expect(draft.synced).toBe(true)
  })

  it('filters unsynced drafts', () => {
    const drafts = [
      { id: 'd-1', synced: true },
      { id: 'd-2', synced: false },
      { id: 'd-3', synced: false },
    ]
    const unsynced = drafts.filter(d => !d.synced)
    expect(unsynced).toHaveLength(2)
  })
})
