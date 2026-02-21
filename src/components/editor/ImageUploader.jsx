import { useCallback, useRef, useState } from 'react'
import { Upload, X, Crop, Loader2, Sparkles } from 'lucide-react'
import { compressImage, formatFileSize } from '../../utils/imageUtils'

export default function ImageUploader({
  value,
  onChange,
  label = 'Upload Photo',
  className = '',
  aspectRatio = '3/4',
  recommendedText = '',
  onCropRequest,
  onEnhanceRequest,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionStats, setCompressionStats] = useState(null) // { originalSize, compressedSize }
  const [sizeWarning, setSizeWarning] = useState(false)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    // Show size warning for files > 5MB
    const FIVE_MB = 5 * 1024 * 1024
    if (file.size > FIVE_MB) {
      setSizeWarning(true)
    } else {
      setSizeWarning(false)
    }

    setIsCompressing(true)
    setCompressionStats(null)

    try {
      const result = await compressImage(file, { maxWidth: 800, quality: 0.7 })
      setCompressionStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
      })
      onChange(result.dataUrl)
    } catch (err) {
      // Fallback to raw FileReader if compression fails
      console.error('Image compression failed, falling back to raw read:', err)
      const reader = new FileReader()
      reader.onload = (e) => onChange(e.target.result)
      reader.readAsDataURL(file)
    } finally {
      setIsCompressing(false)
    }
  }, [onChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClear = useCallback(() => {
    onChange(null)
    setCompressionStats(null)
    setSizeWarning(false)
  }, [onChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  return (
    <div className={className}>
      {isCompressing ? (
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
          style={{ aspectRatio }}
        >
          <Loader2 size={24} className="text-primary animate-spin" />
          <span className="text-xs text-primary">Compressing image...</span>
        </div>
      ) : value ? (
        <div>
          <div className="relative group" style={{ aspectRatio }}>
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover rounded-lg border border-input"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-content-center gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 left-2 px-3 py-1.5 bg-muted text-card-foreground text-xs rounded-md hover:bg-accent transition-colors"
              >
                Change
              </button>
              {onCropRequest && (
                <button
                  onClick={onCropRequest}
                  className="absolute bottom-2 left-[5.5rem] px-3 py-1.5 bg-muted text-card-foreground text-xs rounded-md hover:bg-accent transition-colors flex items-center gap-1"
                >
                  <Crop size={12} />
                  Crop
                </button>
              )}
              {onEnhanceRequest && (
                <button
                  onClick={onEnhanceRequest}
                  className="absolute bottom-2 right-12 px-3 py-1.5 bg-muted text-card-foreground text-xs rounded-md hover:bg-accent transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Enhance
                </button>
              )}
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-red-900/80 text-red-300 rounded-full hover:bg-red-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {/* Compression stats */}
          {compressionStats && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatFileSize(compressionStats.originalSize)} → {formatFileSize(compressionStats.compressedSize)}
            </p>
          )}
        </div>
      ) : (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={label}
            className={`
              flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors
              ${isDragging
                ? 'border-primary bg-primary/10'
                : 'border-input bg-card/50 hover:border-input hover:bg-muted/50'
              }
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background
            `}
            style={{ aspectRatio }}
          >
            <Upload size={24} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center">{label}</span>
            <span className="text-[10px] text-muted-foreground/60">Drag & drop or click</span>
          </div>
          {recommendedText && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">{recommendedText}</p>
          )}
          {sizeWarning && (
            <p className="text-[10px] text-primary mt-1">
              Warning: File is larger than 5 MB and will be compressed.
            </p>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleFile(e.target.files[0])
          // Reset input value so the same file can be re-selected
          e.target.value = ''
        }}
        className="hidden"
      />
    </div>
  )
}
