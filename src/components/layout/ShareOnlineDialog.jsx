import { useState } from 'react'
import { Share2, Copy, Check, Loader2, MessageCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { useShareBrochure } from '../../hooks/useShareBrochure'

export default function ShareOnlineDialog({ open, onOpenChange }) {
  const store = useBrochureStore()
  const { shareBrochure, loading, error } = useShareBrochure()
  const [shareCode, setShareCode] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    try {
      // Extract brochure data
      const json = store.exportJSON()
      const data = JSON.parse(json)
      const result = await shareBrochure(data)
      setShareCode(result.code)
      setShareUrl(result.url)
      setShared(true)
    } catch {
      // error handled by hook
    }
  }

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleWhatsApp = () => {
    const message = `Here's the funeral brochure I've been working on. Open this link to view and edit:\n\n${shareUrl}\n\nShare code: ${shareCode}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleClose = () => {
    onOpenChange(false)
    // Don't reset state so they can see the code again
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            Share Brochure Online
          </DialogTitle>
          <DialogDescription>
            Share your brochure with a unique code. Anyone with the code can view and edit.
          </DialogDescription>
        </DialogHeader>

        {!shared ? (
          <div className="space-y-4 mt-2">
            <div className="bg-card border border-input rounded-lg p-4">
              <p className="text-sm text-card-foreground mb-2">How it works:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Click "Share" to upload your brochure</li>
                <li>2. You'll receive a 6-character share code</li>
                <li>3. Share the code with family members</li>
                <li>4. They can load and edit the brochure</li>
              </ul>
              <p className="text-[10px] text-muted-foreground mt-3">
                Shared brochures expire after 30 days. Last edit wins.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleShare}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  Share Brochure
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-4 text-center">
              <Check size={24} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-medium">Brochure Shared!</p>
            </div>

            {/* Share Code */}
            <div className="text-center">
              <label className="block text-xs text-muted-foreground mb-2">Share Code</label>
              <div className="flex items-center justify-center gap-1">
                {shareCode.split('').map((char, i) => (
                  <span
                    key={i}
                    className="w-10 h-12 bg-card border border-input rounded-lg flex items-center justify-center text-xl font-bold text-primary"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>

            {/* Share URL */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-card border border-input rounded-md px-3 py-2 text-xs text-card-foreground focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(shareUrl)}
                  className="px-3 py-2 bg-muted border border-input rounded-md text-card-foreground hover:bg-accent transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* WhatsApp share */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <MessageCircle size={14} />
              Share via WhatsApp
            </button>

            <p className="text-[10px] text-muted-foreground text-center">
              This brochure will be available for 30 days
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
