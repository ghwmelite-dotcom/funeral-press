export default function DonationPrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Donation Privacy Notice</h1>
      <p className="text-muted-foreground mb-8">
        How we handle the personal data you share when donating to a memorial on FuneralPress.
      </p>

      <section className="space-y-6 text-foreground">
        <div>
          <h2 className="text-xl font-semibold mb-2">What we collect</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>The name you choose to display (or &quot;Anonymous&quot; if you opt out)</li>
            <li>Optional: email address (for receipts and the family&apos;s thank-you note)</li>
            <li>Optional: phone number (only if you sign in with phone OTP)</li>
            <li>The amount and time of your donation</li>
            <li>Your IP address (for fraud and security review only)</li>
            <li>Your country, to determine display currency and tax-relevant disclosures</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">What becomes public</h2>
          <p className="text-muted-foreground">
            What appears on the public donor wall depends on the family&apos;s chosen
            <strong> wall_mode</strong> setting:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li><strong>Full</strong> — your display name and donation amount</li>
            <li><strong>Names only</strong> — your display name, but not the amount</li>
            <li><strong>Private</strong> — nothing is shown publicly</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            If you choose to donate anonymously, your name is replaced by &quot;Anonymous&quot;
            regardless of wall_mode, and no amount is shown.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Who we share with</h2>
          <p className="text-muted-foreground">We share only what&apos;s necessary to process your donation:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li><strong>Paystack</strong> — to process your card or mobile-money payment</li>
            <li><strong>Hubtel</strong> (Ghana) and <strong>Twilio</strong> (international) — to send phone-OTP codes if you sign in with phone</li>
            <li><strong>Resend</strong> — to send your receipt by email</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            We do not sell, rent, or share your data for marketing or analytics with any third party.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Your right to erasure</h2>
          <p className="text-muted-foreground">
            You can request that we delete your personal data at any time. Email
            {' '}<a className="text-primary underline" href="mailto:privacy@funeralpress.org">privacy@funeralpress.org</a>{' '}
            with the donation reference (from your receipt) and we will:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>Replace your display name on the public wall with &quot;Anonymous&quot;</li>
            <li>Delete your email and phone number from our records</li>
            <li>Retain only the anonymised donation amount and timestamp, since the family has already received the funds</li>
          </ul>
          <p className="text-muted-foreground mt-2">We confirm in writing within 14 days.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Data retention</h2>
          <p className="text-muted-foreground">
            Donation records are retained for 7 years for accounting and tax compliance.
            Personal identifiers (email, phone, IP) are deleted on request per the right
            to erasure above.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Questions?</h2>
          <p className="text-muted-foreground">
            Contact{' '}
            <a className="text-primary underline" href="mailto:privacy@funeralpress.org">
              privacy@funeralpress.org
            </a>.
          </p>
        </div>
      </section>
    </main>
  )
}
