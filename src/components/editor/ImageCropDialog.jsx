import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { cropImage } from '../../utils/imageUtils'

const MIN_CROP_SIZE = 10 // Minimum crop size in percentage

export default function ImageCropDialog({ open, onOpenChange, imageSrc, aspectRatio = 3 / 4, onCrop }) {
  const containerRef = useRef(null)
  const [cropRegion, setCropRegion] = useState({ x: 10, y: 10, width: 80, height: 80 })
  const [dragState, setDragState] = useState(null) // null | { type: 'move' | 'nw' | 'ne' | 'sw' | 'se', startX, startY, startRegion }
  const [isApplying, setIsApplying] = useState(false)

  // Initialize crop region centered with correct aspect ratio when dialog opens
  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image()
      img.onload = () => {
        const imgAspect = img.width / img.height
        const cropAspect = aspectRatio

        let cropW, cropH
        if (cropAspect > imgAspect) {
          // Crop is wider relative to image
          cropW = 80
          cropH = (cropW / cropAspect) * imgAspect
          if (cropH > 90) {
            cropH = 90
            cropW = (cropH * cropAspect) / imgAspect
          }
        } else {
          // Crop is taller relative to image
          cropH = 80
          cropW = (cropH * cropAspect) / imgAspect
          if (cropW > 90) {
            cropW = 90
            cropH = (cropW / cropAspect) * imgAspect
          }
        }

        setCropRegion({
          x: (100 - cropW) / 2,
          y: (100 - cropH) / 2,
          width: cropW,
          height: cropH,
        })
      }
      img.src = imageSrc
    }
  }, [open, imageSrc, aspectRatio])

  const getPointerPosition = useCallback((e) => {
    const container = containerRef.current
    if (!container) return { px: 0, py: 0 }
    const rect = container.getBoundingClientRect()
    return {
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const constrainRegion = useCallback((region) => {
    let { x, y, width, height } = region
    width = Math.max(MIN_CROP_SIZE, Math.min(100, width))
    height = Math.max(MIN_CROP_SIZE, Math.min(100, height))
    x = Math.max(0, Math.min(100 - width, x))
    y = Math.max(0, Math.min(100 - height, y))
    return { x, y, width, height }
  }, [])

  const handlePointerDown = useCallback((e, type) => {
    e.preventDefault()
    e.stopPropagation()
    const { px, py } = getPointerPosition(e)
    setDragState({
      type,
      startX: px,
      startY: py,
      startRegion: { ...cropRegion },
    })
    e.target.setPointerCapture(e.pointerId)
  }, [cropRegion, getPointerPosition])

  const handlePointerMove = useCallback((e) => {
    if (!dragState) return
    e.preventDefault()
    const { px, py } = getPointerPosition(e)
    const dx = px - dragState.startX
    const dy = py - dragState.startY
    const sr = dragState.startRegion

    if (dragState.type === 'move') {
      setCropRegion(constrainRegion({
        x: sr.x + dx,
        y: sr.y + dy,
        width: sr.width,
        height: sr.height,
      }))
      return
    }

    // Corner resize - maintain aspect ratio
    // Get image dimensions to convert aspect ratio properly
    const container = containerRef.current
    if (!container) return
    const imgEl = container.querySelector('img')
    if (!imgEl) return
    const imgAspect = imgEl.naturalWidth / imgEl.naturalHeight
    const cropAspect = aspectRatio

    let newRegion = { ...sr }

    if (dragState.type === 'se') {
      let newW = sr.width + dx
      let newH = (newW / cropAspect) * imgAspect
      newW = Math.max(MIN_CROP_SIZE, newW)
      newH = Math.max(MIN_CROP_SIZE, newH)
      newRegion = { x: sr.x, y: sr.y, width: newW, height: newH }
    } else if (dragState.type === 'sw') {
      let newW = sr.width - dx
      let newH = (newW / cropAspect) * imgAspect
      newW = Math.max(MIN_CROP_SIZE, newW)
      newH = Math.max(MIN_CROP_SIZE, newH)
      newRegion = { x: sr.x + sr.width - newW, y: sr.y, width: newW, height: newH }
    } else if (dragState.type === 'ne') {
      let newW = sr.width + dx
      let newH = (newW / cropAspect) * imgAspect
      newW = Math.max(MIN_CROP_SIZE, newW)
      newH = Math.max(MIN_CROP_SIZE, newH)
      newRegion = { x: sr.x, y: sr.y + sr.height - newH, width: newW, height: newH }
    } else if (dragState.type === 'nw') {
      let newW = sr.width - dx
      let newH = (newW / cropAspect) * imgAspect
      newW = Math.max(MIN_CROP_SIZE, newW)
      newH = Math.max(MIN_CROP_SIZE, newH)
      newRegion = { x: sr.x + sr.width - newW, y: sr.y + sr.height - newH, width: newW, height: newH }
    }

    setCropRegion(constrainRegion(newRegion))
  }, [dragState, getPointerPosition, constrainRegion, aspectRatio])

  const handlePointerUp = useCallback(() => {
    setDragState(null)
  }, [])

  const handleApply = useCallback(async () => {
    if (!imageSrc) return
    setIsApplying(true)
    try {
      const croppedDataUrl = await cropImage(imageSrc, cropRegion)
      onCrop(croppedDataUrl)
      onOpenChange(false)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsApplying(false)
    }
  }, [imageSrc, cropRegion, onCrop, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Handle keyboard for cancel
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const handleStyle = 'w-5 h-5 sm:w-4 sm:h-4 bg-primary border-2 border-white rounded-full absolute z-10 touch-none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] bg-card border-input p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-foreground">Crop Image</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Drag the crop area or resize using corner handles. Aspect ratio is locked.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2">
          {/* Image container with crop overlay */}
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-lg select-none"
            style={{ maxHeight: '60vh' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Base image */}
            <img
              src={imageSrc}
              alt="Crop preview"
              className="w-full h-auto block"
              draggable={false}
              style={{ maxHeight: '60vh', objectFit: 'contain' }}
            />

            {/* Darkened overlay for non-crop area - four regions */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            {/* Clear crop window */}
            <div
              className="absolute border-2 border-primary cursor-move touch-none"
              style={{
                left: `${cropRegion.x}%`,
                top: `${cropRegion.y}%`,
                width: `${cropRegion.width}%`,
                height: `${cropRegion.height}%`,
                background: 'transparent',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              </div>

              {/* Corner handles */}
              {/* NW */}
              <div
                className={handleStyle}
                style={{ top: '-10px', left: '-10px', cursor: 'nw-resize', padding: '8px', margin: '-8px' }}
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
              />
              {/* NE */}
              <div
                className={handleStyle}
                style={{ top: '-10px', right: '-10px', cursor: 'ne-resize', padding: '8px', margin: '-8px' }}
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
              />
              {/* SW */}
              <div
                className={handleStyle}
                style={{ bottom: '-10px', left: '-10px', cursor: 'sw-resize', padding: '8px', margin: '-8px' }}
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
              />
              {/* SE */}
              <div
                className={handleStyle}
                style={{ bottom: '-10px', right: '-10px', cursor: 'se-resize', padding: '8px', margin: '-8px' }}
                onPointerDown={(e) => handlePointerDown(e, 'se')}
              />
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-2 p-4 pt-2 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isApplying ? 'Applying...' : 'Apply Crop'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
