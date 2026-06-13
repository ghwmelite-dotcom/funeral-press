import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Mail, ShieldCheck, Phone, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore.js'
import { phonePinApi } from '../utils/phonePinApi.js'
import ChangePinSection from '../components/account/ChangePinSection.jsx'

/**
 * User account / settings page. Single home for the things a logged-in user
 * needs to manage about their account:
 *   - profile basics (name, email, phone)
 *   - email verification status + resend (phone+PIN users who haven't verified)
 *   - change PIN (phone+PIN users only — Google users have no PIN)
 *
 * Reached via the "Account" item in UserMenu. Google-only accounts are always
 * email-verified and have no PIN, so they see just the profile + a verified badge.
 */
export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const navigate = useNavigate()

  const [resendBusy, setResendBusy] = useState(false)
  const [resendResult, setResendResult] = useState(null)
  const [resendError, setResendError] = useState(null)

  // Pull fresh status on mount so verification done in another tab/device shows.
  useEffect(() => {
    refreshUser?.()
  }, [refreshUser])

  if (!user) return <Navigate to="/" replace />

  // Phone+PIN accounts can change their PIN; Google-only accounts cannot.
  const isPhonePin = !!(user.authMethods?.includes('phone-pin') || user.phone)
  const emailVerified = !!user.email_verified_at

  const handleResend = async () => {
    if (resendBusy) return
    setResendBusy(true)
    setResendError(null)
    try {
      const res = await phonePinApi.resendVerification()
      setResendResult(res?.message || "We've sent another verification email — check your inbox.")
    } catch (e) {
      setResendError(e?.message || 'Could not resend right now. Please try again later.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Account · FuneralPress</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 min-h-[44px]"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-semibold mb-1">Account</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Manage your profile and sign-in security.
        </p>

        <div className="space-y-5">
          {/* Profile */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <UserIcon size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <dt className="sr-only">Name</dt>
                <dd className="text-foreground">{user.name || '—'}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <dt className="sr-only">Email</dt>
                <dd className="text-foreground break-all">{user.email || '—'}</dd>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                  <dt className="sr-only">Phone</dt>
                  <dd className="text-foreground">{user.phone}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Email verification */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Email verification</h2>
            {emailVerified ? (
              <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                <ShieldCheck size={16} aria-hidden="true" />
                Your email is verified.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground text-sm mb-4">
                  Your email isn&apos;t verified yet. Verifying lets us help you recover
                  your PIN if you ever forget it.
                </p>
                {resendError && (
                  <p className="text-destructive text-sm mb-3" role="alert">{resendError}</p>
                )}
                {resendResult ? (
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm" role="status">
                    {resendResult}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendBusy}
                    className="bg-primary text-primary-foreground font-medium py-2 px-5 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    {resendBusy ? 'Sending…' : 'Send verification email'}
                  </button>
                )}
              </>
            )}
          </section>

          {/* Change PIN — phone+PIN accounts only */}
          {isPhonePin && <ChangePinSection />}
        </div>
      </div>
    </div>
  )
}
