import { useState } from 'react'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { useShareBrochure } from '../../hooks/useShareBrochure'

export default function LoadSharedDialog({ open, onOpenChange, initialCode = '' }) {
  const store = useBrochureStore()
  const { loadShared, loading, error } = useShareBrochure()
  const [code, setCode] = useState(initialCode)
  const [loaded, setLoaded] = useState(false)

  const handleLoad = async () => {
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length !== 6) return

    try {
      const data = await loadShared(cleanCode)
      // Remove metadata fields before applying
      const { sharedAt, updatedAt, ...brochureData } = data
      store.createSnapshot('Before loading shared brochure')
      store.applyImport(brochureData)
      setLoaded(true)
    } catch {
      // error handled by hook
    }
  }

  const handleCodeInput = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(val)
  }

  const handleClose = () => {
    onOpenChange(false)
    setCode('')
    setLoaded(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} className="text-primary" />
            Load Shared Brochure
          </DialogTitle>
          <DialogDescription>
            Enter the 6-character share code to load a brochure
          </DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <div className="space-y-4 mt-2">
            {/* Code input */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Share Code</label>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-9 h-11 sm:w-10 sm:h-12 bg-card border rounded-lg flex items-center justify-center text-xl font-bold ${
                      code[i] ? 'border-primary/30 text-primary' : 'border-input text-muted-foreground/60'
                    }`}
                  >
                    {code[i] || '\u00B7'}
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={code}
                onChange={handleCodeInput}
                placeholder="Enter code..."
                className="w-full mt-2 bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground text-center tracking-[0.3em] uppercase focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="bg-card/50 border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">
                Loading a shared brochure will replace your current work. A snapshot will be created automatically so you can restore it later.
              </p>
            </div>

            <button
              onClick={handleLoad}
              disabled={code.length !== 6 || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Load Brochure
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-2 text-center">
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-6">
              <p className="text-lg text-emerald-400 font-medium mb-1">Brochure Loaded!</p>
              <p className="text-xs text-muted-foreground">
                The shared brochure has been loaded into the editor
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Open Editor
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
