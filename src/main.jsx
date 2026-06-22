import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { captureAttribution } from './utils/attribution.js'
import { events } from './utils/analytics.js'

// Capture marketing attribution (UTMs, click ids, referral codes) from the
// landing URL before anything else fires, then record one session_started —
// the top-of-funnel "visit" signal the acquisition→activation funnel needs.
captureAttribution()
try {
  if (typeof window !== 'undefined' && !sessionStorage.getItem('fp-session-started')) {
    sessionStorage.setItem('fp-session-started', '1')
    events.sessionStarted()
  }
} catch { /* analytics must never block boot */ }

// Init Sentry whenever a DSN is present and we're not on a local dev host.
// Previously this was PROD-only, leaving staging/preview deploys with no error
// visibility.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || ''
const isLocalDev = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
if (sentryDsn && !isLocalDev) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    environment: import.meta.env.MODE,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
