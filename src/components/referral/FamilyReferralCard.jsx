// src/components/referral/FamilyReferralCard.jsx
// Family referral share surface (spec §2.5). Mounted on the dashboard and the
// post-export success screen — never on memorial/grief pages.
import { useState, useEffect } from 'react'
import { Gift, Copy, Check } from 'lucide-react'
import { apiFetch } from '../../utils/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { recordLoopEvent } from '../../utils/loopAnalytics'
import { events } from '../../utils/analytics'

export default function FamilyReferralCard({ surface = 'referral_dashboard', compact = false }) {
  const user = useAuthStore((s) => s.user)
  const [code, setCode] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    apiFetch('/referrals/my-code')
      .then((d) => {
        setCode(d.code)
        recordLoopEvent('loop_impression', surface)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user || !code) return null
  const link = `https://funeralpress.org/?ref=${code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      return // clipboard unavailable (insecure context / permission denied)
    }
    setCopied(true)
    events.referralLinkShared('copy')
    recordLoopEvent('loop_click', surface)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-card border border-border rounded-xl ${compact ? 'p-4' : 'p-5'} w-full`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Gift size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">
            Know a family who needs this?
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Share your link — they receive a free design, and you receive GHS 20
            toward your next order.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 min-w-0 px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground truncate"
            />
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Referral link copied to clipboard' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
