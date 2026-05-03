import { useState } from 'react'
import GoogleLoginButton from './GoogleLoginButton.jsx'
import { PhoneAuthDialog } from './PhoneAuthDialog.jsx'

export function SignInChooser() {
  const [phoneOpen, setPhoneOpen] = useState(false)
  return (
    <>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <GoogleLoginButton />
        <button
          onClick={() => setPhoneOpen(true)}
          className="w-full border border-border text-foreground font-medium py-3 rounded-lg hover:bg-muted"
        >
          Continue with phone
        </button>
      </div>
      <PhoneAuthDialog
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        purpose="login"
      />
    </>
  )
}
