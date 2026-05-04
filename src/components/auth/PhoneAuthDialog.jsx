import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PhoneInput } from './PhoneInput.jsx'
import { OtpCodeInput } from './OtpCodeInput.jsx'
import { usePhoneAuthStore } from '../../stores/phoneAuthStore.js'

export function PhoneAuthDialog({ open, onOpenChange, purpose = 'login', onSuccess }) {
  const store = usePhoneAuthStore()
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)
  // Track the previous `open` value so we only reset on the rising edge
  // (closed -> open transition), not on the initial mount when callers may
  // have already seeded the store. Initialize to the initial `open` so the
  // first render is never treated as a transition.
  const prevOpen = useRef(open)

  useEffect(() => {
    if (open && !prevOpen.current) {
      store.reset()
      store.setPurpose(purpose)
    }
    prevOpen.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purpose])

  useEffect(() => {
    if (store.step !== 'code') return
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((store.resendAvailableAt - Date.now()) / 1000))
      setResendIn(remaining)
    }, 500)
    return () => clearInterval(id)
  }, [store.step, store.resendAvailableAt])

  const handleSend = async () => {
    await store.sendOtp()
  }

  const handleVerify = async () => {
    try {
      const res = await store.verify(code)
      onSuccess?.(res)
      onOpenChange(false)
    } catch (err) {
      console.error('PhoneAuthDialog verify failed:', err)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-lg z-50">
          {store.step === 'phone' && (
            <>
              <Dialog.Title className="text-xl font-semibold text-foreground mb-2">
                Sign in with phone
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mb-4">
                We&apos;ll send a 6-digit code by SMS.
              </Dialog.Description>
              <PhoneInput
                value={store.phone}
                onChange={store.setPhone}
                country={store.countryCode}
                onCountryChange={store.setCountryCode}
                autoFocus
              />
              {store.error && <p className="text-destructive text-sm mt-2">{store.error}</p>}
              <button
                onClick={handleSend}
                disabled={!store.phone || store.loading}
                className="mt-4 w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {store.loading ? 'Sending…' : 'Send code'}
              </button>
            </>
          )}

          {store.step === 'code' && (
            <>
              <Dialog.Title className="text-xl font-semibold text-foreground mb-2">
                Enter your code
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mb-4">
                We sent a code to {store.phone}
              </Dialog.Description>
              <OtpCodeInput value={code} onChange={setCode} autoFocus />
              {store.error && <p className="text-destructive text-sm mt-3 text-center">{store.error}</p>}
              <div className="flex justify-between text-sm text-muted-foreground mt-4">
                {resendIn > 0
                  ? <span>Resend in {resendIn}s</span>
                  : <button onClick={handleSend} className="underline">Resend code</button>
                }
                <button onClick={() => usePhoneAuthStore.setState({ step: 'phone' })} className="underline">
                  Wrong number?
                </button>
              </div>
              <button
                onClick={handleVerify}
                disabled={code.length < 6 || store.loading}
                className="mt-4 w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg disabled:opacity-50"
              >
                {store.loading ? 'Verifying…' : 'Verify'}
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
