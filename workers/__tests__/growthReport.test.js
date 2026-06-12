import { describe, it, expect } from 'vitest'
import { formatDelta, reportHtml } from '../utils/growthReport.js'

describe('formatDelta', () => {
  it('formats week-over-week movement', () => {
    expect(formatDelta(12, 8)).toBe('+50%')
    expect(formatDelta(8, 12)).toBe('-33%')
    expect(formatDelta(5, 0)).toBe('new')
    expect(formatDelta(0, 0)).toBe('—')
  })
})

describe('reportHtml', () => {
  it('renders all metric sections', () => {
    const html = reportHtml({
      weekLabel: '2026-06-08 — 2026-06-14',
      signups: { current: 42, previous: 30 },
      loopSignups: { current: 9, previous: 4 },
      surfaces: [
        { surface: 'memorial_footer', impressions: 1200, clicks: 60, signups: 5 },
        { surface: 'post_condolence', impressions: 300, clicks: 40, signups: 4 },
      ],
      revenue: [
        { currency: 'GHS', total: 1250000 },
        { currency: 'USD', total: 14900 },
      ],
      referralRewards: { current: 3, previous: 1 },
      memorialsCreated: { current: 18, previous: 15 },
    })
    expect(html).toContain('memorial_footer')
    expect(html).toContain('+40%') // signups 42 vs 30
    expect(html).toContain('GHS 12,500')
    expect(html).toContain('$149')
    expect(html).toContain('K-factor')
  })
})
