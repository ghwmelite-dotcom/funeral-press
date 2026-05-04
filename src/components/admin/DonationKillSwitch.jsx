import { useState } from 'react'
import { apiFetch } from '../../utils/apiClient'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'

export function DonationKillSwitch() {
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    if (!confirm(paused ? 'Resume all donations?' : 'Pause ALL donations globally? This stops every memorial.')) return
    setBusy(true)
    setError(null)
    try {
      const data = await apiFetch(`${DONATION_API}/admin/donations/kill-switch`, {
        method: 'POST',
        body: JSON.stringify({ paused: !paused }),
      })
      // Reflect server state, not the local toggle, so the UI never lies.
      setPaused(!!data.paused)
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
