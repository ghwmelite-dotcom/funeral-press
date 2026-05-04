import { formatMinor } from '../../utils/currency.js'

export function DonationTipToggle({ checked, onCheckedChange, baseAmountMinor, currency, percent = 5 }) {
  const tipMinor = Math.round(baseAmountMinor * percent / 100)
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="w-4 h-4 accent-primary"
          aria-label={`Add ${percent}% tip to support FuneralPress`}
        />
        <span className="text-foreground">Add {percent}% to support FuneralPress</span>
      </label>
      <span className="text-muted-foreground tabular-nums">{formatMinor(tipMinor, currency)}</span>
    </div>
  )
}
