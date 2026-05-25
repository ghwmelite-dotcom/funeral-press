import { useState } from 'react'
import { Bell } from 'lucide-react'
import { followMemorial } from '../../utils/memorialApi'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Follow-a-memorial opt-in section.
 *
 * Props:
 *   memorialId    – string
 *   deceasedName  – string
 *   dateOfBirth   – ISO date string or ''
 *   dateOfDeath   – ISO date string or ''
 */
export default function FollowMemorial({ memorialId, deceasedName, dateOfBirth, dateOfDeath }) {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState('idle') // idle | loading | success | error
  const [errMsg, setErrMsg]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()

    if (!EMAIL_RE.test(trimmed)) {
      setErrMsg('Please enter a valid email address.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrMsg('')

    try {
      await followMemorial(memorialId, {
        email: trimmed,
        deceasedName,
        dateOfBirth: dateOfBirth || undefined,
        dateOfDeath: dateOfDeath || undefined,
      })
      setStatus('success')
    } catch (err) {
      setErrMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <section
        className="mt-10 mb-4 px-5 py-6 rounded-2xl bg-card border border-border text-center"
        aria-label="Follow memorial — confirmed"
      >
        <Bell size={24} className="mx-auto mb-3 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground mb-1">You&apos;re on the list</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We&apos;ll send a gentle reminder each year. Check your inbox to confirm.
        </p>
      </section>
    )
  }

  const name = deceasedName || 'your loved one'

  return (
    <section
      className="mt-10 mb-4 px-5 py-6 rounded-2xl bg-card border border-border"
      aria-label="Follow this memorial for yearly reminders"
    >
      <div className="flex items-start gap-3 mb-4">
        <Bell size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-foreground leading-snug">
            Get a yearly reminder to honour {name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            We&apos;ll send one gentle email on their birthday and anniversary.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="follow-email"
          className="block text-xs font-medium text-foreground mb-1.5"
        >
          Your email address
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="follow-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === 'error') { setStatus('idle'); setErrMsg('') }
            }}
            disabled={status === 'loading'}
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50"
            aria-invalid={status === 'error' ? 'true' : undefined}
            aria-describedby={status === 'error' ? 'follow-error' : undefined}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="min-h-[44px] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? 'Saving…' : 'Remind me'}
          </button>
        </div>

        {status === 'error' && errMsg && (
          <p
            id="follow-error"
            role="alert"
            className="mt-2 text-xs text-destructive leading-relaxed"
          >
            {errMsg}
          </p>
        )}
      </form>
    </section>
  )
}
