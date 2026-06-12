// workers/utils/growthReport.js
// Weekly growth report (spec §5.3): D1-derived metrics emailed every Monday.
// "Top organic landing pages" is GA4/GSC-only — read those in their dashboards
// (plan correction #5); this report covers everything first-party.

const SYMBOLS = { GHS: 'GHS ', NGN: '₦', GBP: '£', USD: '$' }

export function formatDelta(current, previous) {
  if (!previous && !current) return '—'
  if (!previous) return 'new'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function money(minor, currency) {
  const amount = minor / 100
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${SYMBOLS[currency] || currency + ' '}${formatted}`
}

const row = (cells, bold = false) =>
  `<tr>${cells.map((c) => `<td style="padding:6px 12px;border-bottom:1px solid #eee;${bold ? 'font-weight:600;' : ''}">${c}</td>`).join('')}</tr>`

export function reportHtml(m) {
  const kFactor = m.memorialsCreated.current
    ? (m.loopSignups.current / m.memorialsCreated.current).toFixed(2)
    : '—'
  return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#222">
  <h2 style="margin-bottom:4px">FuneralPress weekly growth report</h2>
  <p style="color:#777;margin-top:0">${m.weekLabel}</p>

  <table style="border-collapse:collapse;width:100%">
    ${row(['<b>Metric</b>', '<b>This week</b>', '<b>WoW</b>'], true)}
    ${row(['Signups', m.signups.current, formatDelta(m.signups.current, m.signups.previous)])}
    ${row(['Loop-attributed signups', m.loopSignups.current, formatDelta(m.loopSignups.current, m.loopSignups.previous)])}
    ${row(['Memorials/funerals created', m.memorialsCreated.current, formatDelta(m.memorialsCreated.current, m.memorialsCreated.previous)])}
    ${row(['K-factor (loop signups ÷ funerals)', kFactor, ''])}
    ${row(['Referral rewards granted', m.referralRewards.current, formatDelta(m.referralRewards.current, m.referralRewards.previous)])}
  </table>

  <h3 style="margin-bottom:4px">Loop surfaces</h3>
  <table style="border-collapse:collapse;width:100%">
    ${row(['<b>Surface</b>', '<b>Impr.</b>', '<b>Clicks</b>', '<b>Signups</b>'], true)}
    ${m.surfaces.map((s) => row([s.surface, s.impressions, s.clicks, s.signups])).join('')}
  </table>

  <h3 style="margin-bottom:4px">Revenue (paid this week)</h3>
  <table style="border-collapse:collapse;width:100%">
    ${m.revenue.map((r) => row([r.currency, money(r.total, r.currency)])).join('')}
  </table>

  <p style="color:#777;font-size:12px">Organic search queries live in Google Search Console; GA4 has page-level traffic. This report is generated automatically every Monday.</p>
</div>`
}
