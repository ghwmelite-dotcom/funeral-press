import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { loadPaystackInline, PAYSTACK_PUBLIC_KEY } from '../../utils/paystack'
import { initMemorialPremium, verifyMemorialPremium } from '../../utils/memorialApi'
import { useAuthStore } from '../../stores/authStore'
import { useNotification } from '../ui/notification.jsx'

const PRICE_LABEL = 'GHS 150'

// Dignified, non-aggressive upgrade surface for a memorial page. Renders the
// offer when the memorial isn't premium yet; a quiet "Forever Tribute" badge
// once it is. One-time Paystack payment (cards + mobile money) via the inline
// popup, then server-side verify.
export default function UpgradeTributeCard({ memorialId, deceasedName, premium, onUpgraded }) {
  const [busy, setBusy] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { notify } = useNotification()

  if (premium) {
    return (
      <div
        data-testid="premium-badge"
        className="mx-auto my-8 flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
      >
        <Check size={16} aria-hidden="true" />
        Forever Tribute
      </div>
    )
  }

  const handleUpgrade = async () => {
    if (busy) return
    if (!user) {
      notify('Please sign in to unlock the Forever Tribute.', 'info')
      return
    }
    setBusy(true)
    try {
      const PaystackPop = await loadPaystackInline()
      const init = await initMemorialPremium(memorialId)
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
            notify('Forever Tribute unlocked. Thank you.', 'success')
            onUpgraded?.()
          } catch (err) {
            notify(err.message || 'Payment received but confirmation failed — please contact support.', 'error')
          } finally {
            setBusy(false)
          }
        },
        onCancel: () => setBusy(false),
      })
    } catch (err) {
      notify(err.message || 'Could not start payment. Please try again.', 'error')
      setBusy(false)
    }
  }

  return (
    <div
      data-testid="upgrade-tribute-card"
      className="mx-auto my-10 max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Honor {deceasedName || 'their memory'} with a Forever Tribute
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Unlock premium themes, unlimited photos, an AI-crafted tribute video, and remove FuneralPress branding — kept online forever.
      </p>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={busy}
        aria-label={`Unlock Forever Tribute for ${PRICE_LABEL}`}
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {busy ? 'Processing…' : `Unlock Forever Tribute — ${PRICE_LABEL}`}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">One-time payment · Mobile money &amp; card</p>
    </div>
  )
}
