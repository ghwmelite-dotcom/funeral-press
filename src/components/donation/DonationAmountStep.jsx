import { useState, useEffect } from 'react'
import { useDonationStore } from '../../stores/donationStore.js'
import { detectCurrency, formatMinor, quickAmounts, majorToMinor } from '../../utils/currency.js'
import { DonationTipToggle } from './DonationTipToggle.jsx'

export function DonationAmountStep({ tipDefaultPercent = 5, fxRate = 1, onContinue }) {
  const amount = useDonationStore((s) => s.amount)
  const setAmount = useDonationStore((s) => s.setAmount)
  const [custom, setCustom] = useState('')
  const currency = amount.displayCurrency || detectCurrency()

  useEffect(() => {
    if (!amount.displayCurrency) {
      setAmount({ displayCurrency: currency })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setAmountMinor = (minor) => {
    const tipPesewas = Math.round(minor * fxRate * tipDefaultPercent / 100)
    setAmount({ displayMinor: minor, tipPesewas, includeTip: amount.includeTip })
  }

  const handleQuick = (major) => {
    setCustom(String(major))
    setAmountMinor(majorToMinor(major, currency))
  }

  const handleCustom = (v) => {
    setCustom(v)
    setAmountMinor(majorToMinor(v || '0', currency))
  }

  const totalMinor = amount.displayMinor + (amount.includeTip ? Math.round(amount.tipPesewas / fxRate) : 0)
  const ghsTotalPesewas = Math.round(totalMinor * fxRate)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">How much would you like to donate?</h3>

      <div className="grid grid-cols-4 gap-2">
        {quickAmounts(currency).map((v) => (
          <button
            key={v}
            onClick={() => handleQuick(v)}
            className={`py-3 border rounded-lg transition-colors ${
              custom === String(v) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
          >
            {formatMinor(v * 100, currency)}
          </button>
        ))}
      </div>

      <input
        type="number"
        inputMode="decimal"
        placeholder="Custom amount"
        value={custom}
        onChange={(e) => handleCustom(e.target.value)}
        className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <DonationTipToggle
        checked={amount.includeTip}
        onCheckedChange={(v) => setAmount({ includeTip: v })}
        baseAmountMinor={amount.displayMinor}
        currency={currency}
        percent={tipDefaultPercent}
      />

      <div className="border-t border-border pt-4 space-y-1">
        <div className="flex justify-between text-foreground font-semibold">
          <span>Total</span>
          <span>{formatMinor(totalMinor, currency)}</span>
        </div>
        {currency !== 'GHS' && (
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>In Ghana cedis</span>
            <span>{formatMinor(ghsTotalPesewas, 'GHS')}</span>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={amount.displayMinor < 100}
        className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}
