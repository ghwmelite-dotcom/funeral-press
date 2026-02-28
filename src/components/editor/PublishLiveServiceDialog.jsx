import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Loader2, Copy, Check, ExternalLink, Printer } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { publishLiveService } from '../../utils/liveServiceApi'
import { generateQRCodeDataUrl } from '../../utils/qrCode'

const HYMN_LYRICS = {
  'When I Survey': [
    "When I survey the wondrous cross\nOn which the Prince of glory died,\nMy richest gain I count but loss,\nAnd pour contempt on all my pride.",
    "Forbid it, Lord, that I should boast,\nSave in the death of Christ, my God!\nAll the vain things that charm me most,\nI sacrifice them to His blood.",
    "See, from His head, His hands, His feet,\nSorrow and love flow mingled down!\nDid e'er such love and sorrow meet,\nOr thorns compose so rich a crown?",
    "Were the whole realm of nature mine,\nThat were an offering far too small;\nLove so amazing, so divine,\nDemands my soul, my life, my all.",
  ],
  'Because He Lives': [
    "God sent His Son\nThey called Him Jesus;\nHe came to love, heal and forgive,\nHe lived and died to buy my pardon,\nAn empty grave is there to\nprove my Savior lives.",
    "Because He lives\nI can face tomorrow!\nBecause He lives\nAll fear is gone\nAnd now I know\nHe holds the future\nAnd life is worth the living\nJust because He lives.",
  ],
  'When Peace Like a River': [
    "When peace like a river\nAttendeth my way;\nWhen sorrows like sea-billows roll;\nWhatever my lot\nThou has taught me to say,\n\u201CIt is well, it is well, with my soul.\u201D\nIt is well (echo)\nWith my soul, (echo)\nIt is well, it is well with my soul.",
  ],
}

function buildServiceItems(churchService) {
  return churchService.map((item) => {
    const desc = item.description
    const time = item.time || ''

    // Detect hymns/songs with lyrics
    for (const [keyword, verses] of Object.entries(HYMN_LYRICS)) {
      if (desc.toLowerCase().includes(keyword.toLowerCase())) {
        return { type: 'hymn', title: desc, verses, time }
      }
    }

    // Detect scripture readings — extract reference from parentheses
    const scriptureMatch = desc.match(/^(Scripture Reading[^(]*)\(([^)]+)\)$/i)
    if (scriptureMatch) {
      return { type: 'scripture', text: scriptureMatch[1].trim(), reference: scriptureMatch[2].trim(), time }
    }
    if (/^scripture reading/i.test(desc)) {
      return { type: 'scripture', text: desc, reference: '', time }
    }

    return { type: 'action', text: desc, time }
  })
}

export default function PublishLiveServiceDialog({ open, onOpenChange }) {
  const store = useBrochureStore()
  const [step, setStep] = useState(store.liveServiceId ? 'published' : 'preview')
  const [publishing, setPublishing] = useState(false)
  const [serviceUrl, setServiceUrl] = useState(
    store.liveServiceId ? `https://funeralpress.org/live-service/${store.liveServiceId}` : ''
  )
  const [qrDataUrl, setQrDataUrl] = useState(store.liveServiceQrCode || '')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    try {
      const data = {
        liveServiceId: store.liveServiceId,
        fullName: `${store.title} ${store.fullName}`,
        birthDate: store.dateOfBirth,
        deathDate: store.dateOfDeath,
        coverPhoto: store.coverPhoto,
        theme: store.theme,
        serviceItems: buildServiceItems(store.orderOfService.churchService),
      }

      const result = await publishLiveService(data)
      const url = result.url || `https://funeralpress.org/live-service/${result.id}`
      setServiceUrl(url)

      const qr = await generateQRCodeDataUrl(url)
      setQrDataUrl(qr)

      store.updateField('liveServiceId', result.id)
      store.updateField('liveServiceQrCode', qr)

      setStep('published')
    } catch (err) {
      setError(err.message || 'Failed to publish. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serviceUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio size={18} className="text-primary" />
            Share Live Service
          </DialogTitle>
          <DialogDescription>
            Share the order of service with attendees so they can follow along on their phones
          </DialogDescription>
        </DialogHeader>

        {step === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="bg-card border border-input rounded-lg p-4">
              <p className="text-sm text-card-foreground mb-2">This will publish:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Full order of service ({store.orderOfService.churchService.length} items)</li>
                <li>- Hymn lyrics (expandable on phones)</li>
                <li>- Scripture references</li>
                <li>- A shareable URL and QR code</li>
              </ul>
            </div>

            <div className="bg-card border border-input rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Programme preview:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {buildServiceItems(store.orderOfService.churchService).map((item, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
                    <span className={`${item.type === 'hymn' ? 'text-primary font-medium' : 'text-card-foreground'}`}>
                      {item.type === 'hymn' ? item.title : item.text}
                      {item.type === 'scripture' && item.reference ? ` (${item.reference})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-sm font-medium rounded-lg transition-colors"
            >
              {publishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Radio size={16} />
                  {store.liveServiceId ? 'Update Live Service' : 'Publish Live Service'}
                </>
              )}
            </button>
          </div>
        )}

        {step === 'published' && (
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4 text-center">
              <Check size={24} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-medium">Live Service Published!</p>
              <p className="text-[11px] text-emerald-400/70 mt-1">Attendees can now follow along on their phones</p>
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Service URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serviceUrl}
                  readOnly
                  className="flex-1 bg-card border border-input rounded-md px-3 py-2 text-xs text-card-foreground focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-muted border border-input rounded-md text-card-foreground hover:bg-accent transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
                <a
                  href={serviceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-muted border border-input rounded-md text-card-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="text-center">
                <label className="block text-xs text-muted-foreground mb-2">QR Code for Attendees</label>
                <img
                  src={qrDataUrl}
                  alt="Live Service QR Code"
                  className="w-40 h-40 mx-auto rounded-lg border border-input bg-white p-2"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  Print or display this QR code at the venue entrance
                </p>
              </div>
            )}

            {/* Share on WhatsApp */}
            <button
              onClick={() => {
                const text = `Follow along with ${store.title} ${store.fullName}'s funeral service:\n${serviceUrl}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Share on WhatsApp
            </button>

            {/* Print QR Cards */}
            <Link
              to="/qr-cards"
              onClick={() => onOpenChange(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs border border-input hover:bg-accent text-card-foreground rounded-lg transition-colors"
            >
              <Printer size={14} /> Print QR Code Cards
            </Link>

            <button
              onClick={() => { setStep('preview') }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg transition-colors font-medium"
            >
              <Radio size={14} /> Update Live Service
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
