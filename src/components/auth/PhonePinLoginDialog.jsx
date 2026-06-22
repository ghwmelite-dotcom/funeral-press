import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PhoneInput } from './PhoneInput.jsx'
import { PinInput } from './PinInput.jsx'
import { phonePinApi } from '../../utils/phonePinApi.js'
import { useAuthStore } from '../../stores/authStore.js'

const PIN_LENGTH = 4

export function PhonePinLoginDialog({
  open,
  onOpenChange,
  onForgotPin,
  onSwitchToSignup,
  onSuccess,
}) {
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('GH')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryAfterMs, setRetryAfterMs] = useState(0)

  useEffect(() => {
    if (!open) {
      setPhone(''); setPin(''); setError(null); setRetryAfterMs(0); setLoading(false)
    }
  }, [open])

  const updatePhone = (val) => { setError(null); setPhone(val) }
  const updatePin = (val) => { setError(null); setPin(val) }

  const isValid = phone && pin.length === PIN_LENGTH

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (loading || !isValid) return
    setLoading(true); setError(null); setRetryAfterMs(0)
    try {
      const data = await phonePinApi.login({ phone, pin })
      useAuthStore.getState().setSession(data)
      onSuccess?.(data)
      onOpenChange?.(false)
    } catch (err) {
      if (err.status === 423) {
        const ms = Number(err.body?.retry_after_ms) || 60 * 60 * 1000
        setRetryAfterMs(ms)
        setError('Too many wrong attempts. This account is locked temporarily.')
      } else if (err.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else if (err.status === 401) {
        setError('Wrong phone or PIN.')
      } else {
        setError(err.message || 'Sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const lockoutMinutes = Math.max(1, Math.ceil(retryAfterMs / 60000))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-lg z-50">
          <form onSubmit={handleSubmit}>
            <Dialog.Title className="text-xl font-semibold text-foreground mb-1">
              Sign in with phone
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground text-sm mb-4">
              Enter your phone number and 4-digit PIN.
            </Dialog.Description>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-foreground mb-1">Phone number</label>
                <PhoneInput
                  value={phone}
                  onChange={updatePhone}
                  country={country}
                  onCountryChange={setCountry}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">PIN</label>
                <PinInput value={pin} onChange={updatePin} disabled={loading} ariaLabel="PIN" />
              </div>

              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                  {retryAfterMs > 0 && (
                    <span className="block text-muted-foreground text-xs mt-1">
                      Try again in about {lockoutMinutes} minute{lockoutMinutes === 1 ? '' : 's'}.
                    </span>
                  )}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { onOpenChange?.(false); onForgotPin?.() }}
                  className="underline text-muted-foreground hover:text-foreground"
                >
                  Forgot PIN?
                </button>
                {onSwitchToSignup && (
                  <button
                    type="button"
                    onClick={() => { onOpenChange?.(false); onSwitchToSignup() }}
                    className="underline text-muted-foreground hover:text-foreground"
                  >
                    Create account
                  </button>
                )}
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default PhonePinLoginDialog
