import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Images, Upload, Trash2, ArrowLeft, ExternalLink, Copy, Loader2, GripVertical, Plus, X, Check, CheckSquare, Square, ImagePlus } from 'lucide-react'
import { apiFetch } from '../utils/apiClient'
import { useAuthStore } from '../stores/authStore'
import { useNotification } from '../components/ui/notification'
import PageMeta from '../components/seo/PageMeta'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

export default function GalleryEditorPage() {
  const { slug } = useParams()
  const { notify } = useNotification()
  const fileInputRef = useRef(null)
  const captionTimers = useRef({})
  const [captionSaveStatus, setCaptionSaveStatus] = useState({}) // { [photoId]: 'saving' | 'saved' }

  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const shareUrl = `${window.location.origin}/gallery/${slug}`

  // Auto-save a single caption after debounce
  const saveCaptionToApi = useCallback(async (photoId, caption) => {
    setCaptionSaveStatus(prev => ({ ...prev, [photoId]: 'saving' }))
    try {
      await apiFetch(`/gallery-photos/${photoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption }),
      })
      setCaptionSaveStatus(prev => ({ ...prev, [photoId]: 'saved' }))
      setTimeout(() => {
        setCaptionSaveStatus(prev => {
          const next = { ...prev }
          if (next[photoId] === 'saved') delete next[photoId]
          return next
        })
      }, 2000)
    } catch (err) {
      setCaptionSaveStatus(prev => {
        const next = { ...prev }
        delete next[photoId]
        return next
      })
      notify(`Failed to save caption: ${err.message}`, 'error')
    }
  }, [notify])

  // Save all captions + sort order
  const handleSaveAll = useCallback(async () => {
    if (!gallery) return
    try {
      const promises = photos.map(p =>
        apiFetch(`/gallery-photos/${p.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ caption: p.caption || '', sortOrder: p.sort_order }),
        })
      )
      await Promise.all(promises)
      notify('All changes saved!', 'success')
    } catch (err) {
      notify(`Save failed: ${err.message}`, 'error')
    }
  }, [gallery, photos, notify])

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveAll])

  useEffect(() => {
    fetchGallery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function fetchGallery() {
    try {
      const data = await apiFetch(`/gallery/${slug}`)
      setGallery(data.gallery)
      setPhotos((data.photos || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    } catch (err) {
      notify(err.message || 'Failed to load gallery', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file) {
    const token = await useAuthStore.getState().getToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/images/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!res.ok) throw new Error('Image upload failed')
    const data = await res.json()
    return `${API_BASE}${data.url}`
  }

  async function handleFiles(files) {
    if (!gallery || files.length === 0) return
    setUploading(true)

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      notify('Please select image files', 'warning')
      setUploading(false)
      return
    }

    let uploadedCount = 0
    setUploadProgress({ current: 0, total: imageFiles.length })
    for (const file of imageFiles) {
      try {
        const photoUrl = await uploadFile(file)
        const sortOrder = photos.length + uploadedCount
        const result = await apiFetch(`/galleries/${gallery.id}/photos`, {
          method: 'POST',
          body: JSON.stringify({ photoUrl, caption: '', sortOrder }),
        })
        setPhotos(prev => [...prev, { id: result.id, photo_url: photoUrl, caption: '', sort_order: sortOrder }])
        uploadedCount++
        setUploadProgress({ current: uploadedCount, total: imageFiles.length })
      } catch (err) {
        notify(`Failed to upload ${file.name}: ${err.message}`, 'error')
      }
    }

    if (uploadedCount > 0) {
      notify(`${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} uploaded!`, 'success')
    }
    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleDeletePhoto(photoId) {
    try {
      await apiFetch(`/gallery-photos/${photoId}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      notify('Photo deleted', 'success')
    } catch (err) {
      notify(err.message || 'Failed to delete photo', 'error')
    }
  }

  const handleCaptionChange = useCallback((photoId, caption) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption } : p))
    // Debounced auto-save: wait 2s of inactivity
    if (captionTimers.current[photoId]) {
      clearTimeout(captionTimers.current[photoId])
    }
    captionTimers.current[photoId] = setTimeout(() => {
      saveCaptionToApi(photoId, caption)
      delete captionTimers.current[photoId]
    }, 2000)
  }, [saveCaptionToApi])

  // Toggle photo selection in select mode
  function toggleSelect(photoId) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  // Bulk delete selected photos
  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiFetch(`/gallery-photos/${id}`, { method: 'DELETE' })
        )
      )
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
      setSelectMode(false)
      notify(`${count} photo${count > 1 ? 's' : ''} deleted`, 'success')
    } catch (err) {
      notify(err.message || 'Failed to delete photos', 'error')
    }
  }

  // Simple drag-to-reorder
  function handleReorderDragStart(idx) {
    setDragIdx(idx)
  }

  function handleReorderDrop(targetIdx) {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null)
      return
    }
    setPhotos(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(dragIdx, 1)
      updated.splice(targetIdx, 0, moved)
      return updated.map((p, i) => ({ ...p, sort_order: i }))
    })
    setDragIdx(null)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      notify('Link copied to clipboard!', 'success')
    }).catch(() => {
      notify('Could not copy link', 'error')
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <p className="text-muted-foreground">Gallery not found.</p>
        <Link to="/gallery-creator" className="text-primary text-sm hover:underline">Back to galleries</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title={`Edit: ${gallery.title} | FuneralPress`}
        description={`Edit the photo gallery for ${gallery.deceased_name || gallery.deceasedName}`}
        path={`/gallery-editor/${slug}`}
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/gallery-creator" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
          <Images size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Gallery Editor</span>
        </Link>
        <a
          href={`/gallery/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink size={14} />
          <span className="hidden sm:inline">Preview</span>
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Gallery Info + Share Link */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{gallery.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {gallery.deceased_name || gallery.deceasedName}
            </p>
            {gallery.description && (
              <p className="text-xs text-muted-foreground mt-2">{gallery.description}</p>
            )}
          </div>

          {/* Shareable Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-xs text-muted-foreground truncate select-all">
              {shareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition-colors shrink-0"
            >
              <Copy size={12} />
              Copy Link
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading {uploadProgress.current} of {uploadProgress.total} photo{uploadProgress.total > 1 ? 's' : ''}...
              </p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: uploadProgress.total > 0 ? `${(uploadProgress.current / uploadProgress.total) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground/60">
                {uploadProgress.total > 0 ? `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` : ''}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop photos here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/60">
                Supports JPG, PNG, WebP
              </p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {photos.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectMode(prev => !prev); setSelectedIds(new Set()) }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectMode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {selectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              {selectMode && selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              Add Photos
            </button>
          </div>
        )}

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              flex flex-col items-center justify-center py-20 px-8 text-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors
              ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'}
            `}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ImagePlus size={32} className="text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No photos yet</h3>
            <p className="text-sm text-muted-foreground mb-3 max-w-xs">
              Drag and drop your photos here, or click to browse and start building your gallery.
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              <Upload size={14} />
              Upload Photos
            </span>
            <p className="text-xs text-muted-foreground/50 mt-3">
              Supports JPG, PNG, and WebP
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable={!selectMode}
                onDragStart={() => !selectMode && handleReorderDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => !selectMode && handleReorderDrop(idx)}
                onClick={() => selectMode && toggleSelect(photo.id)}
                className={`
                  group relative bg-card border rounded-lg overflow-hidden transition-all
                  ${dragIdx === idx ? 'opacity-40 scale-95' : ''}
                  ${selectMode && selectedIds.has(photo.id) ? 'border-primary ring-2 ring-primary/30' : 'border-border'}
                  ${selectMode ? 'cursor-pointer' : ''}
                `}
              >
                {/* Select mode checkmark overlay */}
                {selectMode && (
                  <div className={`absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    selectedIds.has(photo.id) ? 'bg-primary' : 'bg-black/40 border border-white/60'
                  }`}>
                    {selectedIds.has(photo.id) && <Check size={12} className="text-white" />}
                  </div>
                )}

                {/* Drag handle (hidden in select mode) */}
                {!selectMode && (
                  <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical size={14} className="text-white drop-shadow-md" />
                  </div>
                )}

                {/* Delete button (hidden in select mode) */}
                {!selectMode && (
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 z-10 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X size={12} className="text-white" />
                  </button>
                )}

                {/* Image */}
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photo.photo_url || photo.photoUrl}
                    alt={photo.caption || 'Gallery photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Caption with auto-save indicator */}
                <div className="p-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={photo.caption || ''}
                      onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                      onClick={(e) => selectMode && e.stopPropagation()}
                      placeholder="Add caption..."
                      className="flex-1 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                    {captionSaveStatus[photo.id] === 'saving' && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
                        <Loader2 size={8} className="animate-spin" /> Saving...
                      </span>
                    )}
                    {captionSaveStatus[photo.id] === 'saved' && (
                      <span className="text-[10px] text-green-500 whitespace-nowrap flex items-center gap-0.5">
                        <Check size={8} /> Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo count */}
        {photos.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} in this gallery
          </p>
        )}
      </div>
    </div>
  )
}
