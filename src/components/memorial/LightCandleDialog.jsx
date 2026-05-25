import { useState } from 'react'
import { Flame, Flower2, Feather, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.jsx'
import { CANDLE_PRODUCTS } from '../../config/candleProducts.js'
import { loadPaystackInline, PAYSTACK_PUBLIC_KEY } from '../../utils/paystack'
import { initTribute, verifyTribute } from '../../utils/memorialApi'

const PRODUCT_ICONS = {
  candle: Flame,
  flower: Flower2,
  feather: Feather,
}

function formatGHS(pesewas) {
  return `GHS ${(pesewas / 100).toFixed(2).replace(/\.00$/, '')}`
}

export default function LightCandleDialog({ memorialId, open, onOpenChange, onSuccess }) {
  const [selectedType, setSelectedType] = useState('candle')
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const product = CANDLE_PRODUCTS[selectedType]
  const remaining = product.maxMessage - message.length

  function handleTypeChange(type) {
    setSelectedType(type)
    // Trim message if it exceeds the new product's limit
    setMessage((prev) => prev.slice(0, CANDLE_PRODUCTS[type].maxMessage))
    setError('')
  }

  function handleClose(next) {
    if (busy) return
    onOpenChange(next)
    if (!next) {
      // Reset on close
      setTimeout(() => {
        setSelectedType('candle')
        setAuthorName('')
        setEmail('')
        setMessage('')
        setError('')
        setDone(false)
      }, 200)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return

    setError('')
    const trimmedName = authorName.trim()
    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName) {
      setError('Your name is required.')
      return
    }
    if (!trimmedEmail) {
      setError('Your email is required.')
      return
    }

    setBusy(true)
    try {
      const PaystackPop = await loadPaystackInline()
      const init = await initTribute(memorialId, {
        type: selectedType,
        authorName: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
      })

      const popup = new PaystackPop()
      popup.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: trimmedEmail,
        amount: product.pesewas,
        currency: 'GHS',
        ref: init.reference,
        onSuccess: async (txn) => {
          try {
            const result = await verifyTribute(txn.reference)
            if (result.paid) {
              setDone(true)
              onSuccess?.()
            } else {
              setError('Payment received but not confirmed yet — please refresh in a moment.')
            }
          } catch (err) {
            setError(err.message || 'Payment received but confirmation failed — please contact support.')
          } finally {
            setBusy(false)
          }
        },
        onCancel: () => setBusy(false),
      })
    } catch (err) {
      setError(err.message || 'Could not start payment. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby="light-candle-desc">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center" data-testid="thank-you-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check size={28} aria-hidden="true" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-foreground">Thank you</DialogTitle>
              <DialogDescription id="light-candle-desc">
                Your {product.label.toLowerCase()} has been added to the tribute wall.
                May it bring light and comfort to all who visit.
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Light a candle</DialogTitle>
              <DialogDescription id="light-candle-desc">
                Choose how you would like to pay your respects.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} noValidate>
              {/* Product picker */}
              <fieldset className="mb-5">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Choose a tribute
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CANDLE_PRODUCTS).map(([type, prod]) => {
                    const Icon = PRODUCT_ICONS[prod.icon] ?? Flame
                    const isSelected = selectedType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        aria-pressed={isSelected}
                        className={[
                          'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
                        ].join(' ')}
                      >
                        <Icon size={20} aria-hidden="true" />
                        <span className="text-xs font-medium leading-tight">{prod.label}</span>
                        <span className="text-xs opacity-80">{formatGHS(prod.pesewas)}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* Author name */}
              <div className="mb-3">
                <label htmlFor="lc-author" className="mb-1 block text-sm font-medium text-foreground">
                  Your name <span aria-hidden="true" className="text-destructive">*</span>
                </label>
                <input
                  id="lc-author"
                  type="text"
                  required
                  maxLength={60}
                  autoComplete="name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Abena Mensah"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Email */}
              <div className="mb-3">
                <label htmlFor="lc-email" className="mb-1 block text-sm font-medium text-foreground">
                  Email address <span aria-hidden="true" className="text-destructive">*</span>
                </label>
                <input
                  id="lc-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Optional message */}
              <div className="mb-4">
                <label htmlFor="lc-message" className="mb-1 block text-sm font-medium text-foreground">
                  Message{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="lc-message"
                  rows={3}
                  maxLength={product.maxMessage}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share a memory or a word of comfort…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <p className={`mt-1 text-right text-xs ${remaining <= 10 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {remaining} character{remaining !== 1 ? 's' : ''} remaining
                </p>
              </div>

              {/* Error */}
              {error && (
                <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {busy ? 'Processing…' : `${product.label} — ${formatGHS(product.pesewas)}`}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                One-time payment · Mobile money &amp; card
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
