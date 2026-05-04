import { useDonationStore } from '../../stores/donationStore.js'
import { formatMinor } from '../../utils/currency.js'

function maskMomo(num) {
  if (!num) return ''
  return num.slice(0, 4) + '****' + num.slice(-3)
}

function maskName(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map((p) => (p ? p[0] + '*****' : ''))
    .join(' ')
}

export function DonationReviewStep({ memorial, onBack, onPay, loading }) {
  const amount = useDonationStore((s) => s.amount)
  const tipMinor = Math.round(amount.tipPesewas / (memorial.donation?.fx_rate || 1))
  const totalMinor = amount.displayMinor + (amount.includeTip ? tipMinor : 0)

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-muted-foreground">In memory of</p>
        <p className="text-xl font-semibold text-foreground">{memorial.deceased_name}</p>
        <p className="text-muted-foreground text-sm">{memorial.dates}</p>
      </div>

      <div className="border border-border rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-foreground">
          <span>Donation</span>
          <span>{formatMinor(amount.displayMinor, amount.displayCurrency)}</span>
        </div>
        {amount.includeTip && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tip</span>
            <span>{formatMinor(tipMinor, amount.displayCurrency)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
          <span>Total</span>
          <span>{formatMinor(totalMinor, amount.displayCurrency)}</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Family receives via {memorial.donation.payout_momo_provider?.toUpperCase()} MoMo<br />
        Account: {maskName(memorial.donation.payout_account_name)}<br />
        Number: {maskMomo(memorial.donation.payout_momo_number)}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3 border border-border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          onClick={onPay}
          disabled={loading}
          className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Starting payment…' : 'Pay with Paystack →'}
        </button>
      </div>
    </div>
  )
}
