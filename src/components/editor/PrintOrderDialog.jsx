import { useEffect, useCallback } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { usePrintOrderStore, GHANA_REGIONS, MIN_QUANTITIES, PRODUCT_SIZES } from '../../stores/printOrderStore'
import { useAuthStore } from '../../stores/authStore'
import { apiFetch } from '../../utils/apiClient'
import { loadPaystackInline, PAYSTACK_PUBLIC_KEY } from '../../utils/paystack'
import { trackEvent } from '../../utils/trackEvent'

function FormField({ label, children, optional }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{optional && <span className="text-muted-foreground/50 ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50'

export default function PrintOrderDialog() {
  const dialogOpen = usePrintOrderStore(s => s.dialogOpen)
  const closeDialog = usePrintOrderStore(s => s.closeDialog)
  const currentDesign = usePrintOrderStore(s => s.currentDesign)
  const stage = usePrintOrderStore(s => s.stage)
  const setStage = usePrintOrderStore(s => s.setStage)
  const errorMsg = usePrintOrderStore(s => s.errorMsg)
  const setError = usePrintOrderStore(s => s.setError)
  const orderId = usePrintOrderStore(s => s.orderId)

  // Form fields
  const quantity = usePrintOrderStore(s => s.quantity)
  const size = usePrintOrderStore(s => s.size)
  const paperQuality = usePrintOrderStore(s => s.paperQuality)
  const recipientName = usePrintOrderStore(s => s.recipientName)
  const recipientPhone = usePrintOrderStore(s => s.recipientPhone)
  const deliveryCity = usePrintOrderStore(s => s.deliveryCity)
  const deliveryArea = usePrintOrderStore(s => s.deliveryArea)
  const deliveryLandmark = usePrintOrderStore(s => s.deliveryLandmark)
  const deliveryRegion = usePrintOrderStore(s => s.deliveryRegion)
  const setField = usePrintOrderStore(s => s.setField)

  // Pricing
  const pricing = usePrintOrderStore(s => s.pricing)
  const isPricingLoading = usePrintOrderStore(s => s.isPricingLoading)

  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  // Check login status when dialog opens
  useEffect(() => {
    if (dialogOpen && !isLoggedIn()) {
      setStage('not-logged-in')
    }
  }, [dialogOpen, isLoggedIn, setStage])

  const formatGHS = (pesewas) => `GHS ${(pesewas / 100).toFixed(2)}`

  const minQty = currentDesign ? (MIN_QUANTITIES[currentDesign.productType] || 10) : 10

  const isFormValid = recipientName.trim() && recipientPhone.trim() && deliveryCity.trim() && deliveryRegion && quantity >= minQty && pricing

  const handlePlaceOrder = useCallback(async () => {
    if (!isFormValid || !currentDesign) return

    setStage('loading')
    try {
      const PaystackPop = await loadPaystackInline()
      const initData = await apiFetch('/print-orders/create', {
        method: 'POST',
        body: JSON.stringify({
          productType: currentDesign.productType,
          designId: currentDesign.designId,
          designName: currentDesign.designName,
          designSnapshot: currentDesign.designSnapshot,
          quantity,
          size,
          paperQuality,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          deliveryCity: deliveryCity.trim(),
          deliveryArea: deliveryArea.trim() || null,
          deliveryLandmark: deliveryLandmark.trim() || null,
          deliveryRegion,
        }),
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
            const result = await apiFetch('/print-orders/verify', {
              method: 'POST',
              body: JSON.stringify({ reference: transaction.reference }),
            })
            trackEvent('print_order_placed', { orderId: result.orderId, productType: currentDesign.productType, quantity })
            usePrintOrderStore.setState({ orderId: result.orderId, stage: 'success' })
          } catch (err) {
            setError(err.message || 'Verification failed')
          }
        },
        onCancel: () => {
          setStage('form')
        },
      })
    } catch (err) {
      setError(err.message || 'Payment setup failed')
    }
  }, [isFormValid, currentDesign, quantity, size, paperQuality, recipientName, recipientPhone, deliveryCity, deliveryArea, deliveryLandmark, deliveryRegion, setStage, setError])

  const handleGoogleSignIn = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
    closeDialog()
  }, [closeDialog])

  const productLabel = currentDesign ? {
    brochure: 'Brochure', poster: 'Poster', invitation: 'Invitation Card',
    booklet: 'Programme Booklet', banner: 'Banner', thankYou: 'Thank You Card',
  }[currentDesign.productType] || 'Design' : 'Design'

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-w-md w-full p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">
            {stage === 'success' ? 'Order Placed!' :
             stage === 'not-logged-in' ? 'Sign In Required' :
             'Order Printed Copies'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {stage === 'success' ? "We'll start working on your prints right away." :
             stage === 'not-logged-in' ? 'Sign in to order printed copies of your design.' :
             `Get professional prints of your ${productLabel.toLowerCase()} delivered to your door in Ghana.`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Success */}
          {stage === 'success' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Check size={28} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-card-foreground font-medium">Your print order has been received!</p>
                {orderId && (
                  <p className="text-[10px] font-mono text-muted-foreground">Order: {orderId.slice(0, 8)}</p>
                )}
                <p className="text-xs text-muted-foreground max-w-xs">
                  We'll send your design to our printing partner. Expect delivery within 3-5 business days (Greater Accra) or 5-7 days (other regions).
                </p>
              </div>
              <button
                onClick={closeDialog}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors mt-2"
              >
                Done
              </button>
            </div>
          )}

          {/* Not logged in */}
          {stage === 'not-logged-in' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <p className="text-sm text-muted-foreground text-center">
                You need to sign in with Google before ordering prints.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {/* Loading / paying / verifying */}
          {(stage === 'loading' || stage === 'paying' || stage === 'verifying') && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {stage === 'loading' && 'Preparing your order...'}
                {stage === 'paying' && 'Complete payment in the popup...'}
                {stage === 'verifying' && 'Verifying payment...'}
              </p>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm text-red-400 text-center">{errorMsg}</p>
              <button
                onClick={() => setStage('form')}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Form */}
          {stage === 'form' && (
            <div className="space-y-4">
              {/* Product + Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Product">
                  <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground">
                    {productLabel}
                  </div>
                </FormField>
                <FormField label={`Quantity (min ${minQty})`}>
                  <input
                    type="number"
                    min={minQty}
                    max={9999}
                    value={quantity}
                    onChange={(e) => setField('quantity', Math.max(minQty, parseInt(e.target.value) || minQty))}
                    className={inputClass}
                  />
                </FormField>
              </div>

              {/* Print Size */}
              {currentDesign && PRODUCT_SIZES[currentDesign.productType] && (
                <FormField label="Print Size">
                  <div className="flex gap-2 flex-wrap">
                    {PRODUCT_SIZES[currentDesign.productType].sizes.map(s => {
                      const sizeLabels = PRODUCT_SIZES[currentDesign.productType].labels
                      return (
                        <button
                          key={s}
                          onClick={() => setField('size', s)}
                          className={`flex-1 min-w-[80px] p-2.5 rounded-lg border text-left transition-colors ${
                            size === s
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground">{s}</span>
                          <span className="block text-[10px] text-muted-foreground leading-tight">{sizeLabels[s]?.replace(`${s} `, '') || ''}</span>
                        </button>
                      )
                    })}
                  </div>
                </FormField>
              )}

              {/* Paper quality */}
              <FormField label="Paper Quality">
                <div className="flex gap-2">
                  {[
                    { value: 'standard', label: 'Standard', desc: 'Matte finish' },
                    { value: 'premium', label: 'Premium', desc: 'Glossy finish' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setField('paperQuality', opt.value)}
                      className={`flex-1 p-2.5 rounded-lg border text-left transition-colors ${
                        paperQuality === opt.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Delivery Details */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-border" />
                  Delivery Details
                  <span className="h-px flex-1 bg-border" />
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Recipient Name">
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setField('recipientName', e.target.value)}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Phone">
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setField('recipientPhone', e.target.value)}
                        placeholder="024 XXX XXXX"
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                  <FormField label="Region">
                    <select
                      value={deliveryRegion}
                      onChange={(e) => setField('deliveryRegion', e.target.value)}
                      className={inputClass}
                    >
                      {GHANA_REGIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="City / Town">
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setField('deliveryCity', e.target.value)}
                      placeholder="e.g. Accra, Kumasi, Takoradi"
                      className={inputClass}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Area / Suburb" optional>
                      <input
                        type="text"
                        value={deliveryArea}
                        onChange={(e) => setField('deliveryArea', e.target.value)}
                        placeholder="e.g. East Legon"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Landmark" optional>
                      <input
                        type="text"
                        value={deliveryLandmark}
                        onChange={(e) => setField('deliveryLandmark', e.target.value)}
                        placeholder="e.g. Near Total station"
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-border" />
                  Price Breakdown
                  <span className="h-px flex-1 bg-border" />
                </p>
                {isPricingLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                ) : pricing ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {quantity}x {productLabel} {size && `(${size})`} — {paperQuality === 'premium' ? 'Premium' : 'Standard'}
                      </span>
                      <span className="text-foreground">{formatGHS(pricing.printCost)}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Volume discount ({pricing.discount}%)</span>
                        <span>Included</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Delivery ({GHANA_REGIONS.find(r => r.value === deliveryRegion)?.label})
                      </span>
                      <span className="text-foreground">{formatGHS(pricing.deliveryFee)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">{formatGHS(pricing.total)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatGHS(pricing.perUnit)} per unit
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Enter quantity to see pricing
                  </p>
                )}
              </div>

              {/* Place Order button */}
              <button
                onClick={handlePlaceOrder}
                disabled={!isFormValid}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-muted disabled:text-muted-foreground text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {pricing ? `Place Order — ${formatGHS(pricing.total)}` : 'Place Order'}
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                MTN MoMo, Vodafone Cash, Visa & Mastercard accepted
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
