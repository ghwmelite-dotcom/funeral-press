import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PhoneInput } from './PhoneInput.jsx'
import { PinInput } from './PinInput.jsx'
import { phonePinApi } from '../../utils/phonePinApi.js'
import { events } from '../../utils/analytics.js'

const PIN_LENGTH = 4

export function PhonePinSignupDialog({ open, onOpenChange, onSwitchToLogin }) {
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('GH')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) {
      // Reset form on close so reopening is clean.
      setPhone(''); setEmail(''); setName(''); setPin(''); setConfirmPin('')
      setError(null); setSuccess(false); setLoading(false)
    }
  }, [open])

  // Auto-close on success after 3s.
  useEffect(() => {
    if (!success) return
    const id = setTimeout(() => onOpenChange?.(false), 3000)
    return () => clearTimeout(id)
  }, [success, onOpenChange])

  const updateField = (setter) => (val) => {
    setError(null)
    setter(val)
  }

  const isValid =
    phone &&
    /\S+@\S+\.\S+/.test(email) &&
    name.trim().length > 0 &&
    pin.length === PIN_LENGTH &&
    confirmPin.length === PIN_LENGTH

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (loading) return
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits')
      return
    }
    setLoading(true); setError(null)
    try {
      await phonePinApi.signup({ phone, email, pin, name: name.trim() })
      // Phone+PIN is the primary local signup path; without this it was
      // invisible to both GA4 and the funnel.
      events.signupCompleted('phone')
      setSuccess(true)
    } catch (err) {
      if (err.status === 409) {
        setError('That phone or email is already registered.')
      } else if (err.status === 429) {
        setError('Too many sign-ups from this device. Try again later.')
      } else if (err.status === 400) {
        setError(err.message || 'Please check your details and try again.')
      } else {
        setError(err.message || 'Sign-up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-lg z-50">
          {!success && (
            <form onSubmit={handleSubmit}>
              <Dialog.Title className="text-xl font-semibold text-foreground mb-1">
                Create your account
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm mb-4">
                Sign up with phone, email, and a 4-digit PIN.
              </Dialog.Description>

              <div className="space-y-3">
                <div>
                  <label htmlFor="signup-name" className="block text-sm text-foreground mb-1">Full name</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => updateField(setName)(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-lg bg-background border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-foreground mb-1">Phone number</label>
                  <PhoneInput
                    value={phone}
                    onChange={updateField(setPhone)}
                    country={country}
                    onCountryChange={setCountry}
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm text-foreground mb-1">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => updateField(setEmail)(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-lg bg-background border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to recover your PIN if you forget it.
                  </p>
                </div>

                <div>
                  <span className="block text-sm text-foreground mb-1">Choose a 4-digit PIN</span>
                  <PinInput value={pin} onChange={updateField(setPin)} disabled={loading} ariaLabel="PIN" />
                </div>

                <div>
                  <span className="block text-sm text-foreground mb-1">Confirm PIN</span>
                  <PinInput
                    value={confirmPin}
                    onChange={updateField(setConfirmPin)}
                    disabled={loading}
                    ariaLabel="Confirm PIN"
                  />
                </div>

                {error && <p className="text-destructive text-sm" role="alert">{error}</p>}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>

                {onSwitchToLogin && (
                  <p className="text-sm text-muted-foreground text-center">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { onOpenChange?.(false); onSwitchToLogin() }}
                      className="underline text-foreground"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {success && (
            <div className="text-center py-4">
              <Dialog.Title className="text-xl font-semibold text-foreground mb-2">
                Almost there
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground">
                Check your email to verify your account. You can log in right away.
              </Dialog.Description>
              <div className="text-emerald-500 text-3xl mt-4" aria-hidden="true">&#10003;</div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default PhonePinSignupDialog
