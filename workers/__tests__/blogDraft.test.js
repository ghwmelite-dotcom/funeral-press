import { describe, it, expect } from 'vitest'
import { draftPrompt, parseDraft, draftSlug } from '../blogDraft.js'

describe('draftPrompt', () => {
  it('embeds the topic and demands strict JSON', () => {
    const p = draftPrompt('How much does a funeral cost in Ghana')
    expect(p).toContain('How much does a funeral cost in Ghana')
    expect(p).toContain('JSON')
  })
})

describe('parseDraft', () => {
  const valid = JSON.stringify({
    title: 'Funeral Costs in Ghana',
    description: 'A complete breakdown of funeral costs across Ghana, from mortuary fees to catering, with region-by-region figures and ways families share the load.',
    keywords: ['funeral costs ghana', 'funeral budget'],
    content: [
      { type: 'paragraph', text: 'Funerals in Ghana are significant family undertakings.' },
      { type: 'heading', text: 'The major cost lines' },
      { type: 'list', items: ['Mortuary fees', 'Venue and canopies'] },
    ],
  })

  it('accepts a valid draft', () => {
    const d = parseDraft(valid)
    expect(d.title).toBe('Funeral Costs in Ghana')
    expect(d.content).toHaveLength(3)
  })
  it('strips markdown fences before parsing', () => {
    const d = parseDraft('```json\n' + valid + '\n```')
    expect(d.title).toBe('Funeral Costs in Ghana')
  })
  it('rejects missing fields and bad block types', () => {
    expect(() => parseDraft('{"title":"x"}')).toThrow()
    expect(() => parseDraft(JSON.stringify({ title: 'x', description: 'y'.repeat(60), keywords: [], content: [{ type: 'video', text: 'no' }] }))).toThrow()
    expect(() => parseDraft('not json')).toThrow()
  })
  it('rejects cta blocks with missing or off-allowlist links', () => {
    const withBadCta = (cta) => JSON.stringify({
      title: 'x', description: 'y'.repeat(60), keywords: [],
      content: [
        { type: 'paragraph', text: 'a' }, { type: 'paragraph', text: 'b' }, cta,
      ],
    })
    expect(() => parseDraft(withBadCta({ type: 'cta', text: 'Go' }))).toThrow(/cta link/i)
    expect(() => parseDraft(withBadCta({ type: 'cta', text: 'Go', link: 'https://evil.example' }))).toThrow(/cta link/i)
    expect(parseDraft(withBadCta({ type: 'cta', text: 'Go', link: '/hymns' })).content).toHaveLength(3)
  })
})

describe('draftSlug', () => {
  it('slugifies titles', () => {
    expect(draftSlug('Funeral Costs in Ghana: 2026 Guide')).toBe('funeral-costs-in-ghana-2026-guide')
  })
})
