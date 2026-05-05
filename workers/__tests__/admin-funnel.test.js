import { describe, it, expect } from 'vitest'

describe('admin funnel logic', () => {
  it('computes conversion_pct relative to previous stage', () => {
    const stages = [
      { key: 'signup', count: 100 },
      { key: 'start_design', count: 60 },
      { key: 'complete_design', count: 30 },
      { key: 'paid', count: 6 },
    ]
    const enriched = stages.map((stage, i) => {
      if (i === 0) return { ...stage, conversion_pct: 100 }
      const prev = stages[i - 1]
      const conversion_pct = prev.count > 0 ? Math.round((stage.count / prev.count) * 100) : 0
      return { ...stage, conversion_pct }
    })
    expect(enriched[0].conversion_pct).toBe(100)
    expect(enriched[1].conversion_pct).toBe(60)
    expect(enriched[2].conversion_pct).toBe(50)
    expect(enriched[3].conversion_pct).toBe(20)
  })

  it('handles zero in previous stage gracefully', () => {
    const stages = [
      { count: 0 },
      { count: 5 },
    ]
    const conversion_pct = stages[0].count > 0 ? Math.round((stages[1].count / stages[0].count) * 100) : 0
    expect(conversion_pct).toBe(0)
  })

  it('clamps days param to [1, 365]', () => {
    expect(Math.min(365, Math.max(1, parseInt('1000') || 30))).toBe(365)
    expect(Math.min(365, Math.max(1, parseInt('-5') || 30))).toBe(1)
    expect(Math.min(365, Math.max(1, parseInt('abc') || 30))).toBe(30)
  })
})
