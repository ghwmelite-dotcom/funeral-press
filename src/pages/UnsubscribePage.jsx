import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { unsubscribeReminders } from '../utils/memorialApi'

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [status, setStatus] = useState(token ? 'loading' : 'no-token')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        await unsubscribeReminders(token)
        if (!cancelled) setStatus('success')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-sm text-center">

        {status === 'loading' && (
          <>
            <div
              className="mx-auto h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold text-foreground mb-1">Unsubscribing…</h1>
            <p className="text-muted-foreground text-sm">Hang on for just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-emerald-500 text-4xl mb-3" aria-hidden="true">&#10003;</div>
            <h1 className="text-xl font-semibold text-foreground mb-1">You&apos;ve been unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-5">
              You won&apos;t receive reminders for this memorial.
            </p>
            <Link
              to="/"
              className="inline-block bg-primary text-primary-foreground font-medium py-2 px-5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Visit FuneralPress
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-destructive text-4xl mb-3" aria-hidden="true">&#10005;</div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Something went wrong</h1>
            <p className="text-muted-foreground text-sm mb-5" role="alert">
              We couldn&apos;t process your unsubscribe request. If this keeps happening,
              please{' '}
              <a
                href="mailto:help@funeralpress.org"
                className="text-primary hover:underline"
              >
                contact support
              </a>
              .
            </p>
            <Link
              to="/"
              className="inline-block bg-primary text-primary-foreground font-medium py-2 px-5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Visit FuneralPress
            </Link>
          </>
        )}

        {status === 'no-token' && (
          <>
            <div className="text-muted-foreground text-4xl mb-3" aria-hidden="true">&#10005;</div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Invalid link</h1>
            <p className="text-muted-foreground text-sm mb-5" role="alert">
              This unsubscribe link is missing a token. Please use the link from your
              reminder email. If you need help,{' '}
              <a
                href="mailto:help@funeralpress.org"
                className="text-primary hover:underline"
              >
                contact support
              </a>
              .
            </p>
            <Link
              to="/"
              className="inline-block bg-primary text-primary-foreground font-medium py-2 px-5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Visit FuneralPress
            </Link>
          </>
        )}

      </div>
    </div>
  )
}
