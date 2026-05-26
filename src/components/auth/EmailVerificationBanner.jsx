import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore.js'
import { phonePinApi } from '../../utils/phonePinApi.js'

/**
 * Slim banner shown to authenticated users whose email is not verified yet.
 * Hidden when the user is anonymous, when they signed up via Google (always
 * pre-verified), or when `email_verified_at` is set.
 */
export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [resultMessage, setResultMessage] = useState(null)
  const [error, setError] = useState(null)

  // Only show when logged in AND email is not verified.
  if (!user) return null
  if (user.email_verified_at) return null
  if (dismissed) return null

  const handleResend = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await phonePinApi.resendVerification()
      // The backend no-ops (without sending) when the email is already
      // verified; surface its actual message instead of always claiming a send.
      setResultMessage(res?.message || null)
      setSent(true)
    } catch (e) {
      setError(e?.message || 'Could not resend. Try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="status"
      className="w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <span className="flex-1">
          {error
            ? error
            : sent
              ? resultMessage || "We've sent another verification email — check your inbox."
              : 'Please verify your email so we can help you recover your PIN if you forget it.'}
        </span>
        {!sent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={busy}
            className="underline disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="opacity-70 hover:opacity-100"
        >
          &#10005;
        </button>
      </div>
    </div>
  )
}

export default EmailVerificationBanner
