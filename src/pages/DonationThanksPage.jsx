import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { donationApi } from '../utils/donationApi.js'
import { events } from '../utils/analytics.js'
import { DonationThankYouCard } from '../components/donation/DonationThankYouCard.jsx'
import { PhonePinLoginDialog } from '../components/auth/PhonePinLoginDialog.jsx'
import GoogleLoginButton from '../components/auth/GoogleLoginButton.jsx'

const DONATION_API = import.meta.env.VITE_DONATION_API_URL || 'https://donation-api.funeralpress.org'
const DONATION_BY_REF_URL = (ref) => `${DONATION_API}/donations/by-ref/${encodeURIComponent(ref)}`

export default function DonationThanksPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const reference = params.get('ref')
  const [donation, setDonation] = useState(null)
  const [phoneOpen, setPhoneOpen] = useState(false)

  useEffect(() => {
    if (!reference) return
    let cancelled = false
    fetch(DONATION_BY_REF_URL(reference))
      .then(async (r) => {
        if (!r.ok) return null
        // Guard against SPA fallback returning HTML when backend route is missing
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('application/json')) return null
        return r.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        setDonation(data)
        // This is the post-payment success page — loading the donation means a
        // completed donation. Fire once per reference so a refresh/back doesn't
        // double-count. Donations previously fired no conversion event at all.
        try {
          const key = `fp-donation-tracked-${reference}`
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1')
            events.donationCompleted({
              reference,
              amount_minor: data.display_amount_minor,
              currency: data.display_currency,
            })
          }
        } catch { /* analytics best-effort */ }
      })
      .catch((err) => {
        console.error('Failed to load donation by ref:', err)
      })
    return () => {
      cancelled = true
    }
  }, [reference])

  const onLoginSuccess = async () => {
    setPhoneOpen(false)
    if (donation) {
      try {
        await donationApi.claim(donation.id)
      } catch (err) {
        console.error('Donation claim failed:', err)
      }
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">✓</div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Your donation was successful
      </h1>
      {donation && (
        <p className="text-muted-foreground mb-6">
          Thank you for honouring {donation.deceased_name}&apos;s memory with {donation.amount_display}.
          <br /><br />
          The family will receive your donation through {donation.momo_provider?.toUpperCase()} MoMo within 24 hours.
        </p>
      )}

      {donation && (
        <DonationThankYouCard
          memorial={{ deceased_name: donation.deceased_name, dates: donation.dates }}
          donor={{ display_name: donation.donor_display_name }}
          amountMinor={donation.display_amount_minor}
          currency={donation.display_currency}
        />
      )}

      <hr className="my-8 border-border" />

      <h2 className="text-lg font-semibold text-foreground mb-2">
        Save this donation to your profile
      </h2>
      <p className="text-muted-foreground mb-4">
        Get reminded of one-week and 40-day observances. View all your tributes in one place.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setPhoneOpen(true)}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Continue with phone
        </button>
        <GoogleLoginButton />
      </div>

      <p className="mt-6">
        <a href={`/m/${slug}`} className="text-muted-foreground underline hover:text-foreground transition-colors">
          No thanks
        </a>
      </p>

      <PhonePinLoginDialog
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        onSuccess={onLoginSuccess}
      />
    </main>
  )
}
