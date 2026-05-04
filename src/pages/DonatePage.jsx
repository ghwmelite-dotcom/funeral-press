import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDonationStore } from '../stores/donationStore.js'
import { DonationAmountStep } from '../components/donation/DonationAmountStep.jsx'
import { DonationDonorStep } from '../components/donation/DonationDonorStep.jsx'
import { DonationReviewStep } from '../components/donation/DonationReviewStep.jsx'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'
const MEMORIAL_BY_SLUG_URL = (slug) => `${DONATION_API}/memorials/by-slug/${encodeURIComponent(slug)}`

export default function DonatePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [memorial, setMemorial] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const chargeStep = useDonationStore((s) => s.chargeStep)
  const setStep = useDonationStore((s) => s.setStep)
  const initiateCharge = useDonationStore((s) => s.initiateCharge)
  const chargeError = useDonationStore((s) => s.chargeError)
  const chargeLoading = useDonationStore((s) => s.chargeLoading)

  useEffect(() => {
    let cancelled = false
    fetch(MEMORIAL_BY_SLUG_URL(slug))
      .then(async (r) => {
        if (!r.ok) throw new Error('Memorial not found')
        // Guard against the SPA fallback returning HTML when the backend route
        // doesn't exist — JSON.parse on '<!doctype html>' produces a confusing
        // user-facing error otherwise.
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('application/json')) {
          throw new Error('Memorial not found')
        }
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setMemorial(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Memorial not found')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loadError) {
    return <p className="p-8 text-center text-muted-foreground">{loadError}</p>
  }
  if (!memorial) {
    return <p className="p-8 text-center text-muted-foreground">Loading…</p>
  }
  if (!memorial.donation?.enabled || memorial.donation.approval_status !== 'approved') {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Donations are not available for this memorial.
      </p>
    )
  }

  const handlePay = async () => {
    try {
      const res = await initiateCharge(memorial.id)
      if (res?.authorization_url) {
        window.location.href = res.authorization_url
      }
    } catch (err) {
      // Error surfaces via chargeError in the store; nothing further to do here.
      console.error('initiateCharge failed:', err)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        ← Back to memorial
      </button>

      <div className="bg-background border border-border rounded-2xl p-6">
        {chargeStep === 'amount' && (
          <DonationAmountStep
            tipDefaultPercent={5}
            fxRate={memorial.donation.fx_rate || 1}
            onContinue={() => setStep('donor')}
          />
        )}
        {chargeStep === 'donor' && (
          <DonationDonorStep
            wallMode={memorial.donation.wall_mode}
            onBack={() => setStep('amount')}
            onContinue={() => setStep('review')}
          />
        )}
        {(chargeStep === 'review' || chargeStep === 'redirecting') && (
          <DonationReviewStep
            memorial={memorial}
            onBack={() => setStep('donor')}
            onPay={handlePay}
            loading={chargeLoading || chargeStep === 'redirecting'}
          />
        )}
        {chargeError && (
          <p className="text-destructive text-sm mt-3">{chargeError}</p>
        )}
      </div>
    </main>
  )
}
