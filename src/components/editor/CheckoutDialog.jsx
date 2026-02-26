import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, X, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { usePurchaseStore } from '../../stores/purchaseStore'
import { useAuthStore } from '../../stores/authStore'
import { apiFetch } from '../../utils/apiClient'
import { loadPaystackInline, PAYSTACK_PUBLIC_KEY } from '../../utils/paystack'

const PLANS = [
  { key: 'single', name: 'Single', price: 35, credits: '1 design', desc: 'Perfect for one project' },
  { key: 'bundle', name: 'Bundle', price: 75, credits: '3 designs', desc: 'Best value for families', badge: 'Best Value' },
  { key: 'suite', name: 'Suite', price: 120, credits: 'Unlimited', desc: 'All products, forever' },
]

export default function CheckoutDialog() {
  const checkoutOpen = usePurchaseStore(s => s.checkoutOpen)
  const pendingDownload = usePurchaseStore(s => s.pendingDownload)
  const closeCheckout = usePurchaseStore(s => s.closeCheckout)
  const credits = usePurchaseStore(s => s.credits)
  const isUnlimited = usePurchaseStore(s => s.isUnlimited)
  const handlePaymentSuccess = usePurchaseStore(s => s.handlePaymentSuccess)
  const unlockDesign = usePurchaseStore(s => s.unlockDesign)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const [stage, setStage] = useState('idle') // idle | has-credits | loading | paying | verifying | success | error | not-logged-in
  const [errorMsg, setErrorMsg] = useState('')

  // Determine initial stage when dialog opens
  useEffect(() => {
    if (!checkoutOpen) {
      setStage('idle')
      setErrorMsg('')
      return
    }
    if (!isLoggedIn()) {
      setStage('not-logged-in')
    } else if (isUnlimited || credits > 0) {
      setStage('has-credits')
    } else {
      setStage('idle')
    }
  }, [checkoutOpen, credits, isUnlimited, isLoggedIn])

  const handleUseCredit = useCallback(async () => {
    if (!pendingDownload) return
    setStage('verifying')
    try {
      await unlockDesign(pendingDownload.designId, pendingDownload.productType)
      setStage('success')
      setTimeout(() => {
        closeCheckout()
      }, 1500)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to unlock design')
      setStage('error')
    }
  }, [pendingDownload, unlockDesign, closeCheckout])

  const handleSelectPlan = useCallback(async (planKey) => {
    setStage('loading')
    try {
      const PaystackPop = await loadPaystackInline()
      const initData = await apiFetch('/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ plan: planKey }),
      })

      setStage('paying')

      const popup = new PaystackPop()
      popup.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: initData.email,
        amount: initData.amount,
        currency: initData.currency,
        ref: initData.reference,
        onSuccess: async (transaction) => {
          setStage('verifying')
          try {
            await handlePaymentSuccess(transaction.reference)
            // Now unlock the pending design
            if (pendingDownload) {
              await unlockDesign(pendingDownload.designId, pendingDownload.productType)
            }
            setStage('success')
            setTimeout(() => {
              closeCheckout()
            }, 1500)
          } catch (err) {
            setErrorMsg(err.message || 'Verification failed')
            setStage('error')
          }
        },
        onCancel: () => {
          setStage('idle')
        },
      })
    } catch (err) {
      setErrorMsg(err.message || 'Payment setup failed')
      setStage('error')
    }
  }, [handlePaymentSuccess, unlockDesign, pendingDownload, closeCheckout])

  const handleGoogleSignIn = useCallback(() => {
    // Trigger Google One Tap / sign-in flow
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
    closeCheckout()
  }, [closeCheckout])

  return (
    <Dialog open={checkoutOpen} onOpenChange={(open) => !open && closeCheckout()}>
      <DialogContent className="max-w-md w-full p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">
            {stage === 'success' ? 'Download Ready' :
             stage === 'not-logged-in' ? 'Sign In Required' :
             stage === 'has-credits' ? 'Unlock This Design' :
             'Choose a Plan'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {stage === 'success' ? 'Your design has been unlocked.' :
             stage === 'not-logged-in' ? 'Sign in to purchase and download designs.' :
             stage === 'has-credits' ? `You have ${isUnlimited ? 'unlimited' : credits} credit${credits !== 1 && !isUnlimited ? 's' : ''} remaining.` :
             'Build for free, pay only when you download.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Success state */}
          {stage === 'success' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Check size={24} />
              </div>
              <p className="text-sm text-card-foreground">Download starting...</p>
            </div>
          )}

          {/* Not logged in */}
          {stage === 'not-logged-in' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <p className="text-sm text-muted-foreground text-center">
                You need to sign in with Google before purchasing.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {/* Has credits - use one */}
          {stage === 'has-credits' && (
            <div className="flex flex-col items-center py-4 gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Use 1 credit to unlock this design for download?
              </p>
              <button
                onClick={handleUseCredit}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Unlock & Download
              </button>
            </div>
          )}

          {/* Loading / paying / verifying spinners */}
          {(stage === 'loading' || stage === 'paying' || stage === 'verifying') && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {stage === 'loading' && 'Preparing payment...'}
                {stage === 'paying' && 'Complete payment in the popup...'}
                {stage === 'verifying' && 'Verifying payment...'}
              </p>
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm text-red-400 text-center">{errorMsg}</p>
              <button
                onClick={() => setStage(credits > 0 || isUnlimited ? 'has-credits' : 'idle')}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Pricing cards (idle state) */}
          {stage === 'idle' && (
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => handleSelectPlan(plan.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left hover:border-primary/50 hover:bg-card/50 ${
                    plan.badge ? 'border-primary/30 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-card-foreground">{plan.name}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-primary/20 text-primary rounded-full">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                    <p className="text-xs text-muted-foreground">{plan.credits}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-card-foreground">GHS {plan.price}</span>
                  </div>
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                MTN MoMo, Vodafone Cash, Visa & Mastercard accepted
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
