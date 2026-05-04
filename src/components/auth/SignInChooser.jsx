import { useState } from 'react'
import GoogleLoginButton from './GoogleLoginButton.jsx'
import { PhoneAuthDialog } from './PhoneAuthDialog.jsx'

// Vite inlines this string at build time. To enable the phone-auth UI in
// production: set VITE_PHONE_AUTH_ENABLED=true in .env.production AND set
// PHONE_AUTH_ENABLED="true" in workers/auth-api-wrangler.toml. Both gates are
// required so the UI doesn't show before the SMS provider is configured.
const PHONE_AUTH_ENABLED = import.meta.env.VITE_PHONE_AUTH_ENABLED === 'true'

export function SignInChooser() {
  const [phoneOpen, setPhoneOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <GoogleLoginButton />
        {PHONE_AUTH_ENABLED && (
          <button
            onClick={() => setPhoneOpen(true)}
            className="w-full border border-input bg-card text-foreground font-medium py-3 rounded-lg hover:bg-muted transition-colors"
          >
            Continue with phone
          </button>
        )}
      </div>
      {PHONE_AUTH_ENABLED && (
        <PhoneAuthDialog
          open={phoneOpen}
          onOpenChange={setPhoneOpen}
          purpose="login"
        />
      )}
    </>
  )
}
