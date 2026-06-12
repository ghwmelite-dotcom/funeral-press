import { useState } from 'react'
import { Check, Loader2, Crown, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.jsx'
import { TIERS, FEATURE_MIN_RANK } from '../../config/memorialTiers.js'
import { loadPaystackInline, PAYSTACK_PUBLIC_KEY } from '../../utils/paystack'
import {
  initMemorialTierLifetime,
  subscribeMemorialTier,
  verifyMemorialPremium,
} from '../../utils/memorialApi'
import { useAuthStore } from '../../stores/authStore'
import { useNotification } from '../ui/notification.jsx'
import { useCurrencyStore } from '../../stores/currencyStore'
import { priceFor, providerFor, formatMoney } from '../../config/priceBook'
import CurrencySwitcher from '../pricing/CurrencySwitcher'
import { apiFetch } from '../../utils/apiClient'

// Human-readable labels for each feature key, ordered for display
const FEATURE_LABELS = [
  { key: 'unlimitedPhotos',  label: 'Unlimited photos' },
  { key: 'allThemes',        label: 'All premium themes' },
  { key: 'tributeVideo',     label: 'AI tribute video' },
  { key: 'removeBranding',   label: 'Remove FuneralPress branding' },
  { key: 'passwordProtect',  label: 'Password protection' },
  { key: 'customDomain',     label: 'Custom domain' },
  { key: 'multiLanguage',    label: 'Multi-language pages' },
]

function TierCard({ tierKey, selected, onSelect }) {
  const tier = TIERS[tierKey]
  const isPremium = tierKey === 'premium'
  const Icon = isPremium ? Star : Crown

  const features = FEATURE_LABELS.filter(
    ({ key }) => (FEATURE_MIN_RANK[key] ?? Infinity) <= tier.rank
  )

  return (
    <button
      type="button"
      onClick={() => onSelect(tierKey)}
      aria-pressed={selected}
      data-testid={`tier-card-${tierKey}`}
      className={[
        'flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            'flex h-8 w-8 items-center justify-center rounded-full',
            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          <Icon size={16} aria-hidden="true" />
        </div>
        <span className={['text-sm font-semibold', selected ? 'text-primary' : 'text-foreground'].join(' ')}>
          {tier.label}
        </span>
      </div>

      <ul className="space-y-1.5" aria-label={`${tier.label} features`}>
        {features.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-foreground">
            <Check
              size={12}
              className={selected ? 'text-primary' : 'text-muted-foreground'}
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </button>
  )
}

function PlanToggle({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Payment plan"
      className="flex gap-2"
    >
      {['lifetime', 'annual'].map((plan) => (
        <button
          key={plan}
          type="button"
          role="radio"
          aria-checked={value === plan}
          onClick={() => onChange(plan)}
          data-testid={`plan-toggle-${plan}`}
          className={[
            'flex-1 min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            value === plan
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
          ].join(' ')}
        >
          {plan === 'lifetime' ? 'Lifetime' : 'Annual'}
        </button>
      ))}
    </div>
  )
}

function PriceDisplay({ tierKey, planType }) {
  const tier = TIERS[tierKey]
  const currency = useCurrencyStore((s) => s.currency)
  if (!tier) return null

  const productKey = planType === 'lifetime'
    ? `memorial_${tierKey}_lifetime`
    : `memorial_${tierKey}_annual`

  const price = formatMoney(priceFor(productKey, currency), currency)

  if (planType === 'lifetime') {
    return (
      <p className="text-center text-sm text-foreground" data-testid="price-display">
        <span className="text-lg font-bold">{price}</span>
        {' '}
        <span className="text-muted-foreground">one-time</span>
      </p>
    )
  }

  return (
    <p className="text-center text-sm text-foreground" data-testid="price-display">
      <span className="text-lg font-bold">{price}</span>
      <span className="text-muted-foreground">/year</span>
      {' '}
      &mdash;{' '}
      <span className="text-xs text-muted-foreground">keeps premium features active</span>
    </p>
  )
}

export default function UpgradeDialog({ memorialId, open, onOpenChange, onSuccess }) {
  const [selectedTier, setSelectedTier] = useState('premium')
  const [planType, setPlanType] = useState('lifetime')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const user = useAuthStore((s) => s.user)
  const { notify } = useNotification()

  function handleClose(next) {
    if (busy) return
    onOpenChange(next)
    if (!next) {
      setTimeout(() => {
        setSelectedTier('premium')
        setPlanType('lifetime')
        setError('')
        setDone(false)
        setBusy(false)
      }, 200)
    }
  }

  const handleConfirm = async () => {
    if (busy) return
    setError('')

    if (!user) {
      notify('Please sign in to upgrade this memorial.', 'info')
      return
    }

    setBusy(true)

    try {
      const currentCurrency = useCurrencyStore.getState().currency
      const productKey = planType === 'lifetime'
        ? `memorial_${selectedTier}_lifetime`
        : `memorial_${selectedTier}_annual`

      if (providerFor(currentCurrency) === 'stripe') {
        const data = await apiFetch('/stripe/checkout', {
          method: 'POST',
          body: JSON.stringify({ productKey, currency: currentCurrency, memorialId }),
        })
        window.location.href = data.url
        return
      }

      if (planType === 'lifetime') {
        // Inline Paystack popup — mirrors LightCandleDialog exactly
        const PaystackPop = await loadPaystackInline()
        const init = await initMemorialTierLifetime(memorialId, selectedTier, currentCurrency)

        const popup = new PaystackPop()
        popup.newTransaction({
          key: PAYSTACK_PUBLIC_KEY,
          email: init.email,
          amount: init.amount,
          currency: init.currency,
          ref: init.reference,
          onSuccess: async (txn) => {
            try {
              await verifyMemorialPremium(txn.reference)
              setDone(true)
              onSuccess?.()
            } catch (err) {
              setError(
                err.message ||
                  'Payment received but confirmation failed — please contact support.'
              )
            } finally {
              setBusy(false)
            }
          },
          onCancel: () => setBusy(false),
        })
      } else {
        // Annual subscription — redirect to Paystack hosted checkout
        const result = await subscribeMemorialTier(memorialId, selectedTier, currentCurrency)
        window.location.href = result.authorization_url
        // No setBusy(false) — page is navigating away
      }
    } catch (err) {
      setError(err.message || 'Could not start payment. Please try again.')
      setBusy(false)
    }
  }

  const selectedTierConfig = TIERS[selectedTier]
  const currency = useCurrencyStore((s) => s.currency)
  const selectedProductKey = planType === 'lifetime'
    ? `memorial_${selectedTier}_lifetime`
    : `memorial_${selectedTier}_annual`
  const selectedPrice = formatMoney(priceFor(selectedProductKey, currency), currency)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" aria-describedby="upgrade-dialog-desc">
        {done ? (
          <div
            className="flex flex-col items-center gap-4 py-6 text-center"
            data-testid="upgrade-thank-you"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check size={28} aria-hidden="true" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {selectedTierConfig?.label} unlocked
              </DialogTitle>
              <DialogDescription id="upgrade-dialog-desc">
                Thank you. Your memorial has been upgraded. Premium features are now active.
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Upgrade this memorial</DialogTitle>
              <DialogDescription id="upgrade-dialog-desc">
                Choose a plan to unlock premium features and honour this memory.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Currency switcher */}
              <div className="flex justify-end">
                <CurrencySwitcher />
              </div>

              {/* Plan type toggle */}
              <PlanToggle value={planType} onChange={(p) => { setPlanType(p); setError('') }} />

              {/* Tier cards */}
              <div className="grid grid-cols-2 gap-3">
                <TierCard
                  tierKey="premium"
                  selected={selectedTier === 'premium'}
                  onSelect={setSelectedTier}
                />
                <TierCard
                  tierKey="heritage"
                  selected={selectedTier === 'heritage'}
                  onSelect={setSelectedTier}
                />
              </div>

              {/* Price */}
              <PriceDisplay tierKey={selectedTier} planType={planType} />

              {/* Annual note */}
              {planType === 'annual' && (
                <p className="text-center text-xs text-muted-foreground">
                  You will be redirected to Paystack to complete your subscription.
                </p>
              )}

              {/* Error */}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                data-testid="upgrade-confirm-btn"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy && (
                  <Loader2
                    size={18}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                {busy
                  ? 'Processing…'
                  : planType === 'lifetime'
                    ? `Unlock ${selectedTierConfig?.label} — ${selectedPrice}`
                    : `Subscribe ${selectedTierConfig?.label} — ${selectedPrice}/yr`}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {planType === 'lifetime'
                  ? 'One-time payment · Mobile money & card'
                  : 'Annual subscription · Renews automatically'}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
