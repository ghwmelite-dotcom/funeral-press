import { useState, useRef } from 'react'
import { Share2, Copy, Check, Download, MessageCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { buildWhatsAppMessage, getWhatsAppShareUrl, generateShareCard } from '../../utils/shareUtils'
import ShareCardPreview from './ShareCardPreview'

export default function ShareWhatsAppDialog({ open, onOpenChange }) {
  const store = useBrochureStore()
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef(null)

  const memorialUrl = store.memorialId
    ? `https://funeral-brochure-app.pages.dev/memorial/${store.memorialId}`
    : null

  const message = buildWhatsAppMessage(store, memorialUrl)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleWhatsApp = () => {
    window.open(getWhatsAppShareUrl(message), '_blank')
  }

  const handleDownloadCard = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await generateShareCard(cardRef.current)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${store.fullName?.replace(/\s+/g, '-') || 'Memorial'}-Share-Card.png`
      a.click()
    } catch (err) {
      console.error('Failed to generate share card:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            Share via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Share funeral details with family and friends
          </DialogDescription>
        </DialogHeader>

        {/* Message preview */}
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message Preview</label>
            <div className="bg-card border border-input rounded-lg p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-card-foreground whitespace-pre-wrap font-sans">{message}</pre>
            </div>
          </div>

          {/* Share card */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Share Card</label>
            <div className="rounded-lg overflow-hidden border border-input">
              <div className="transform scale-[0.4] origin-top-left" style={{ width: '250%', height: 0, paddingBottom: '52.5%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0 }}>
                  <ShareCardPreview ref={cardRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-muted border border-input rounded-lg text-card-foreground hover:bg-accent transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownloadCard}
              disabled={downloading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-muted border border-input rounded-lg text-card-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? 'Saving...' : 'Save Card'}
            </button>
          </div>

          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <MessageCircle size={16} />
            Send via WhatsApp
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
