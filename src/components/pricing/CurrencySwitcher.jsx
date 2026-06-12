// src/components/pricing/CurrencySwitcher.jsx
// Manual currency override (spec §3.1) — shown next to pricing displays.
// Only enabled currencies are offered; NGN appears automatically once enabled.
import { useCurrencyStore } from '../../stores/currencyStore'
import { CURRENCIES } from '../../config/priceBook'

export default function CurrencySwitcher({ className = '' }) {
  const currency = useCurrencyStore((s) => s.currency)
  const setCurrency = useCurrencyStore((s) => s.setCurrency)
  const enabled = Object.keys(CURRENCIES).filter((c) => CURRENCIES[c].enabled)

  if (enabled.length < 2) return null

  return (
    <label className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      Prices in
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label="Display currency"
        className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {enabled.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  )
}
