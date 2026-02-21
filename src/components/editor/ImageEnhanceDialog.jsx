import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Undo2, Scissors } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { applyFilter, FILTER_PRESETS } from '../../utils/imageFilters'

export default function ImageEnhanceDialog({ open, onOpenChange, imageSrc, onApply }) {
  const [preview, setPreview] = useState(imageSrc)
  const [activeFilter, setActiveFilter] = useState(null)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [applying, setApplying] = useState(false)
  const [removingBg, setRemovingBg] = useState(false)
  const [bgProgress, setBgProgress] = useState(0)

  useEffect(() => {
    if (open) {
      setPreview(imageSrc)
      setActiveFilter(null)
      setBrightness(0)
      setContrast(0)
    }
  }, [open, imageSrc])

  const handlePreset = async (filterKey) => {
    setApplying(true)
    setActiveFilter(filterKey)
    try {
      const result = await applyFilter(imageSrc, filterKey)
      setPreview(result)
    } catch (err) {
      console.error('Filter failed:', err)
    } finally {
      setApplying(false)
    }
  }

  const handleBrightnessChange = async (value) => {
    setBrightness(value)
    setApplying(true)
    try {
      const base = activeFilter ? await applyFilter(imageSrc, activeFilter) : imageSrc
      const result = await applyFilter(base, 'brightness', { amount: parseInt(value) })
      setPreview(result)
    } catch (err) {
      console.error('Brightness failed:', err)
    } finally {
      setApplying(false)
    }
  }

  const handleContrastChange = async (value) => {
    setContrast(value)
    setApplying(true)
    try {
      const base = activeFilter ? await applyFilter(imageSrc, activeFilter) : imageSrc
      const result = await applyFilter(base, 'contrast', { amount: parseInt(value) })
      setPreview(result)
    } catch (err) {
      console.error('Contrast failed:', err)
    } finally {
      setApplying(false)
    }
  }

  const handleRemoveBackground = async () => {
    setRemovingBg(true)
    setBgProgress(0)
    try {
      const { removeImageBackground } = await import('../../utils/backgroundRemoval')
      const result = await removeImageBackground(preview, (progress) => {
        setBgProgress(progress)
      })
      setPreview(result)
    } catch (err) {
      console.error('Background removal failed:', err)
      alert('Background removal failed. This feature requires a modern browser with WebAssembly support.')
    } finally {
      setRemovingBg(false)
    }
  }

  const handleReset = () => {
    setPreview(imageSrc)
    setActiveFilter(null)
    setBrightness(0)
    setContrast(0)
  }

  const handleApply = () => {
    onApply(preview)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Photo Enhance
          </DialogTitle>
          <DialogDescription>
            Apply filters and adjustments to your photo
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="relative aspect-[4/3] bg-card rounded-lg overflow-hidden border border-input">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
          {(applying || removingBg) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={24} className="text-primary animate-spin mx-auto" />
                <p className="text-xs text-card-foreground mt-2">
                  {removingBg ? `Removing background... ${bgProgress}%` : 'Applying...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filter presets */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePreset(preset.key)}
              disabled={applying || removingBg}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                activeFilter === preset.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input text-muted-foreground hover:border-input hover:text-card-foreground'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Brightness</label>
              <span className="text-[10px] text-muted-foreground">{brightness}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={brightness}
              onChange={(e) => handleBrightnessChange(e.target.value)}
              className="w-full accent-primary"
              disabled={applying || removingBg}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Contrast</label>
              <span className="text-[10px] text-muted-foreground">{contrast}</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={contrast}
              onChange={(e) => handleContrastChange(e.target.value)}
              className="w-full accent-primary"
              disabled={applying || removingBg}
            />
          </div>
        </div>

        {/* Background removal */}
        <button
          onClick={handleRemoveBackground}
          disabled={applying || removingBg}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs bg-muted border border-input rounded-lg text-card-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Scissors size={14} />
          {removingBg ? `Removing Background... ${bgProgress}%` : 'Remove Background'}
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={applying || removingBg}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-muted text-card-foreground rounded-lg hover:bg-accent transition-colors"
          >
            <Undo2 size={14} /> Reset
          </button>
          <button
            onClick={handleApply}
            disabled={applying || removingBg}
            className="flex-1 px-4 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
