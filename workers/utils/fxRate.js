// FX rate fetch with KV cache (5 min TTL). Source: Open Exchange Rates.
// Cache key: fx:<CURRENCY>_GHS  →  JSON { rate, fetched_at }

const TTL_MS = 5 * 60 * 1000
const OXR_BASE = 'https://openexchangerates.org/api/latest.json'

export async function getFxRate(fromCurrency, kv, oxrAppId) {
  if (fromCurrency === 'GHS') return 1

  const cacheKey = `fx:${fromCurrency}_GHS`
  const cached = await kv.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.fetched_at < TTL_MS) {
        return parsed.rate
      }
    } catch { /* fall through to fetch */ }
  }

  // Open Exchange Rates free tier base is USD; we compute cross-rate
  try {
    const res = await fetch(`${OXR_BASE}?app_id=${oxrAppId}&symbols=${fromCurrency},GHS`)
    if (!res.ok) throw new Error(`OXR ${res.status}`)
    const data = await res.json()
    const fromUsd = data.rates[fromCurrency]
    const ghsUsd = data.rates.GHS
    if (!fromUsd || !ghsUsd) throw new Error('rates missing')
    const rate = ghsUsd / fromUsd
    await kv.put(cacheKey, JSON.stringify({ rate, fetched_at: Date.now() }), { expirationTtl: 600 })
    return rate
  } catch {
    return null
  }
}
