import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { donationApi } from '../utils/donationApi.js'
import { DonationThankYouCard } from '../components/donation/DonationThankYouCard.jsx'
import { PhoneAuthDialog } from '../components/auth/PhoneAuthDialog.jsx'
import GoogleLoginButton from '../components/auth/GoogleLoginButton.jsx'

// Same dual-gate as SignInChooser: phone-auth UI hidden until Hubtel SMS
// credentials are wired AND PHONE_AUTH_ENABLED worker var is true.
const PHONE_AUTH_ENABLED = import.meta.env.VITE_PHONE_AUTH_ENABLED === 'true'

// TODO: backend route GET /api/donation-by-ref/:reference does not exist
// yet. The donation-api worker stores donations by ID, not by Paystack
// reference, but it does have a webhook handler that records the reference.
// A small follow-up task should add a public lookup endpoint so this page
// can display the post-payment summary. For now this page degrades
// gracefully — if the fetch fails, the success heading + soft-capture
// CTAs still render; only the donation-specific details are missing.
const DONATION_BY_REF_URL = (ref) => `/api/donation-by-ref/${ref}`

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
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setDonation(data)
      })
      .catch((err) => {
        console.error('Failed to load donation by ref:', err)
      })
    return () => {
      cancelled = true
    }
  }, [reference])

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
        {PHONE_AUTH_ENABLED && (
          <button
            onClick={() => setPhoneOpen(true)}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Continue with phone
          </button>
        )}
        <GoogleLoginButton />
      </div>

      <p className="mt-6">
        <a href={`/m/${slug}`} className="text-muted-foreground underline hover:text-foreground transition-colors">
          No thanks
        </a>
      </p>

      {PHONE_AUTH_ENABLED && (
        <PhoneAuthDialog
          open={phoneOpen}
          onOpenChange={setPhoneOpen}
          purpose="login"
          onSuccess={async () => {
            if (donation) {
              try {
                await donationApi.claim(donation.id)
              } catch (err) {
                console.error('Donation claim failed:', err)
              }
            }
          }}
        />
      )}
    </main>
  )
}
