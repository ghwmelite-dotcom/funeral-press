import { useState } from 'react'
import { Copy, Check, MessageSquare } from 'lucide-react'

const CHURCH_TEMPLATES = [
  'Dear church family, we now offer beautiful funeral programme booklets and memorial brochures through FuneralPress. If you\'re planning a funeral service, we can help create professional materials in minutes. Visit: {link}',
  'Planning a memorial service? Our church partners with FuneralPress to provide elegant funeral brochures, obituary posters, and order of service booklets. Get started here: {link}',
  'Need funeral stationery for a loved one? FuneralPress helps you create beautiful memorial materials \u2014 brochures, posters, invitations, and more. Designed with love: {link}',
]

const FUNERAL_HOME_TEMPLATES = [
  'We now offer premium memorial brochures, obituary posters, and funeral programmes through FuneralPress. Professional designs ready in minutes. Learn more: {link}',
  'Need funeral materials for your loved one? We provide beautifully designed brochures, posters, thank-you cards, and memorial booklets. Start here: {link}',
  'Professional funeral stationery \u2014 brochures, banners, invitation cards, and more. Created in minutes with elegant themes. Visit: {link}',
]

export default function WhatsAppTemplates({ partnerType, referralUrl }) {
  const [copiedIdx, setCopiedIdx] = useState(null)

  const templates = partnerType === 'funeral_home' ? FUNERAL_HOME_TEMPLATES : CHURCH_TEMPLATES

  const addUtm = (url) => {
    if (!url) return ''
    const utm = 'utm_source=whatsapp&utm_medium=partner&utm_campaign=referral'
    return url.includes('?') ? `${url}&${utm}` : `${url}?${utm}`
  }

  const handleCopy = async (template, idx) => {
    const message = template.replace('{link}', addUtm(referralUrl))
    try {
      await navigator.clipboard.writeText(message)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-emerald-500" />
        <h2 className="text-sm font-semibold text-foreground">WhatsApp Broadcast Templates</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Copy a pre-written message and share it on WhatsApp. Your referral link is automatically included.
      </p>

      <div className="space-y-3">
        {templates.map((template, idx) => {
          const isCopied = copiedIdx === idx
          const displayText = template.replace('{link}', addUtm(referralUrl) || 'your-link')
          return (
            <div
              key={idx}
              className="bg-muted/30 border border-border rounded-lg p-4"
            >
              <p className="text-sm text-foreground/80 leading-relaxed mb-3 whitespace-pre-wrap">
                {displayText}
              </p>
              <button
                onClick={() => handleCopy(template, idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isCopied
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                    : 'bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check size={12} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy Message
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
