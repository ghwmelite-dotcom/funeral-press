import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

function Lightbox({ photos, currentIndex, onClose, onPrev, onNext }) {
  const photo = photos[currentIndex]

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      {/* Prev arrow */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next arrow */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image + Caption */}
      <div
        className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.photo_url || photo.photoUrl}
          alt={photo.caption || 'Gallery photo'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {photo.caption && (
          <p className="mt-4 text-white/80 text-sm text-center max-w-lg">
            {photo.caption}
          </p>
        )}
        <p className="mt-2 text-white/40 text-xs">
          {currentIndex + 1} / {photos.length}
        </p>
      </div>
    </div>
  )
}

export default function GalleryViewPage() {
  const { slug } = useParams()

  const [gallery, setGallery] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch(`${API_BASE}/gallery/${slug}`)
        if (!res.ok) throw new Error('Gallery not found')
        const data = await res.json()
        setGallery(data.gallery)
        setPhotos((data.photos || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchGallery()
  }, [slug])

  const handlePrev = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNext = useCallback(() => {
    setLightboxIndex(prev => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))
  }, [photos.length])

  const handleClose = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#c9a84c]" />
      </div>
    )
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <p className="text-[#a0a0a0] text-sm">{error || 'Gallery not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8]">
      <PageMeta
        title={`${gallery.title} | FuneralPress Gallery`}
        description={gallery.description || `Photo gallery in memory of ${gallery.deceased_name || gallery.deceasedName}`}
        path={`/gallery/${slug}`}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      {/* Header */}
      <header className="pt-12 pb-8 px-4 text-center border-b border-[#c9a84c]/20">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Decorative element */}
          <div className="text-[#c9a84c] text-3xl mb-2">&#10013;</div>

          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#e8e8e8] tracking-wide">
            {gallery.title}
          </h1>

          <p className="text-[#c9a84c] text-lg font-serif tracking-wider">
            In Loving Memory of {gallery.deceased_name || gallery.deceasedName}
          </p>

          {gallery.description && (
            <p className="text-[#a0a0a0] text-sm max-w-lg mx-auto leading-relaxed mt-4">
              {gallery.description}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 text-[#a0a0a0] text-xs mt-4">
            <Camera size={14} />
            <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </header>

      {/* Photo Grid - Masonry-style with CSS columns */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        {photos.length === 0 ? (
          <div className="text-center py-20 text-[#a0a0a0] text-sm">
            <Camera size={40} className="mx-auto mb-3 opacity-30" />
            <p>No photos have been added to this gallery yet.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="break-inside-avoid group cursor-pointer"
                onClick={() => setLightboxIndex(idx)}
              >
                <div className="relative overflow-hidden rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c9a84c]/40 transition-all duration-300">
                  <img
                    src={photo.photo_url || photo.photoUrl}
                    alt={photo.caption || 'Gallery photo'}
                    className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                  {/* Caption overlay */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white/90 text-xs leading-relaxed">{photo.caption}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#c9a84c]/10 py-8 text-center">
        <p className="text-[#a0a0a0]/50 text-xs tracking-wide">
          Created with{' '}
          <a
            href="https://funeralpress.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c9a84c]/60 hover:text-[#c9a84c] transition-colors"
          >
            FuneralPress
          </a>
        </p>
      </footer>
    </div>
  )
}
