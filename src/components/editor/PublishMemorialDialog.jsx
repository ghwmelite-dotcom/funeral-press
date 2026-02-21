import { useState } from 'react'
import { Globe, Loader2, Copy, Check, QrCode, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { publishMemorial } from '../../utils/memorialApi'
import { generateQRCodeDataUrl } from '../../utils/qrCode'

export default function PublishMemorialDialog({ open, onOpenChange }) {
  const store = useBrochureStore()
  const [step, setStep] = useState(store.memorialId ? 'published' : 'preview')
  const [publishing, setPublishing] = useState(false)
  const [memorialUrl, setMemorialUrl] = useState(
    store.memorialId ? `https://funeral-brochure-app.pages.dev/memorial/${store.memorialId}` : ''
  )
  const [qrDataUrl, setQrDataUrl] = useState(store.memorialQrCode || '')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    try {
      const data = {
        memorialId: store.memorialId,
        title: store.title,
        fullName: store.fullName,
        dateOfBirth: store.dateOfBirth,
        dateOfDeath: store.dateOfDeath,
        funeralDate: store.funeralDate,
        funeralTime: store.funeralTime,
        funeralVenue: store.funeralVenue,
        burialLocation: store.burialLocation,
        theme: store.theme,
        coverPhoto: store.coverPhoto,
        coverVerse: store.coverVerse,
        biography: store.biography,
        tributes: store.tributes,
        acknowledgements: store.acknowledgements,
        familySignature: store.familySignature,
      }

      const result = await publishMemorial(data)
      const url = result.url || `https://funeral-brochure-app.pages.dev/memorial/${result.id}`
      setMemorialUrl(url)

      // Generate QR code
      const qr = await generateQRCodeDataUrl(url)
      setQrDataUrl(qr)

      // Save to store
      store.updateField('memorialId', result.id)
      store.updateField('memorialQrCode', qr)

      setStep('published')
    } catch (err) {
      setError(err.message || 'Failed to publish. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memorialUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            Online Memorial Page
          </DialogTitle>
          <DialogDescription>
            Publish a beautiful online memorial page and generate a QR code
          </DialogDescription>
        </DialogHeader>

        {step === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="bg-card border border-input rounded-lg p-4">
              <p className="text-sm text-card-foreground mb-2">This will publish:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- Name, dates, and venue information</li>
                <li>- Cover photo and biography</li>
                <li>- Tributes and acknowledgements</li>
                <li>- A shareable URL and QR code</li>
              </ul>
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
                  <Globe size={16} />
                  {store.memorialId ? 'Update Memorial Page' : 'Publish Memorial Page'}
                </>
              )}
            </button>
          </div>
        )}

        {step === 'published' && (
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4 text-center">
              <Check size={24} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-medium">Memorial Page Published!</p>
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Memorial URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={memorialUrl}
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
                  href={memorialUrl}
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
                <label className="block text-xs text-muted-foreground mb-2">QR Code</label>
                <img
                  src={qrDataUrl}
                  alt="Memorial QR Code"
                  className="w-40 h-40 mx-auto rounded-lg border border-input bg-white p-2"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  This QR code is automatically added to your brochure's back cover
                </p>
              </div>
            )}

            {/* Share on WhatsApp */}
            <button
              onClick={() => {
                const text = `Memorial Page for ${store.title} ${store.fullName}\n${memorialUrl}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Share on WhatsApp
            </button>

            <button
              onClick={() => { setStep('preview') }}
              className="w-full text-xs text-muted-foreground hover:text-card-foreground transition-colors"
            >
              Update memorial data
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
