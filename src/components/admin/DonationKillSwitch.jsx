import { useState } from 'react'

// TODO: backend route POST /admin/donations/kill-switch does NOT exist yet.
// The worker reads DONATIONS_GLOBAL_PAUSED from wrangler vars (a static config
// value); flipping it via this UI requires a new backend route that writes to
// KV plus an update to the featureFlag reader to also check KV. Until that's
// added, this button calls the missing endpoint and the toggle is non-functional
// (a banner in the card warns admins of this).
export function DonationKillSwitch() {
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    if (!confirm(paused ? 'Resume all donations?' : 'Pause ALL donations globally? This stops every memorial.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/admin/donations/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !paused }),
      })
      if (!res.ok) throw new Error('Backend route not yet implemented')
      setPaused(!paused)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-destructive rounded-lg p-4 mt-6">
      <h3 className="text-lg font-semibold text-foreground">Donation kill switch</h3>
      <p className="text-muted-foreground text-sm mb-3">
        Globally pauses every donation. Use only in emergencies.
      </p>
      <div className="text-xs bg-amber-500/10 text-amber-700 rounded p-2 mb-3">
        ⚠ Backend route not yet implemented. To pause donations now, edit
        DONATIONS_GLOBAL_PAUSED in workers/donation-api-wrangler.toml and redeploy.
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
          paused ? 'bg-primary text-primary-foreground' : 'bg-destructive text-primary-foreground'
        }`}
      >
        {busy ? 'Working…' : paused ? 'Resume donations' : 'Pause all donations'}
      </button>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  )
}

export default DonationKillSwitch
