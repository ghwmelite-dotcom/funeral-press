import { useState, useEffect, useRef } from 'react'
import { Film, Loader2, Download, Share2, RefreshCw, ImagePlus, X } from 'lucide-react'
import { createTributeVideo, getTributeVideoStatus } from '../../utils/memorialApi'
import { apiUploadImage } from '../../utils/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useNotification } from '../ui/notification.jsx'

// Royalty-free instrumental options. URLs resolve once the MP3s are uploaded to
// R2 under soundtracks/; "No music" is the safe default so the feature works
// before any tracks exist.
const SOUNDTRACKS = [
  { label: 'No music', url: '' },
  { label: 'Gentle Piano', url: 'https://funeralpress.org/images/soundtracks/gentle-piano.mp3' },
  { label: 'Soft Strings', url: 'https://funeralpress.org/images/soundtracks/soft-strings.mp3' },
]

const POLL_MS = 4000
const MAX_PHOTOS = 12

// Premium-only studio that turns the memorial into a shareable tribute video.
// Multi-photo montage: starts from the cover photo, family can add more (each
// uploaded to R2 via /images/upload). Async — renders server-side (Shotstack)
// and polls for completion.
export default function TributeVideoStudio({ memorialId, deceasedName, subtitle, biography, coverPhoto }) {
  const [phase, setPhase] = useState('idle') // idle | creating | rendering | ready | failed
  const [videoId, setVideoId] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [soundtrack, setSoundtrack] = useState('')
  const [photos, setPhotos] = useState(() => (coverPhoto ? [coverPhoto] : []))
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const user = useAuthStore((s) => s.user)
  const { notify } = useNotification()

  useEffect(() => {
    if (phase !== 'rendering' || !videoId) return undefined
    let cancelled = false
    let timer
    const poll = async () => {
      try {
        const s = await getTributeVideoStatus(videoId)
        if (cancelled) return
        if (s.status === 'ready') { setVideoUrl(s.url); setPhase('ready'); return }
        if (s.status === 'failed') { setPhase('failed'); return }
        timer = setTimeout(poll, POLL_MS)
      } catch {
        if (!cancelled) timer = setTimeout(poll, POLL_MS * 1.5)
      }
    }
    timer = setTimeout(poll, POLL_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [phase, videoId])

  const addPhotos = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    if (!user) { notify('Please sign in to add photos.', 'info'); return }
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) { notify(`You can add up to ${MAX_PHOTOS} photos.`, 'info'); return }
    setUploading(true)
    try {
      const urls = []
      for (const f of files.slice(0, room)) {
        urls.push(await apiUploadImage('tribute', memorialId, f))
      }
      setPhotos((prev) => [...prev, ...urls])
    } catch (err) {
      notify(err.message || 'Photo upload failed. Please try again.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (url) => setPhotos((prev) => prev.filter((u) => u !== url))

  const start = async () => {
    if (!user) { notify('Please sign in to create the tribute video.', 'info'); return }
    if (!photos.length) { notify('Add at least one photo first.', 'info'); return }
    if (uploading) return
    setPhase('creating')
    try {
      const res = await createTributeVideo(memorialId, {
        title: deceasedName,
        subtitle,
        notes: biography,
        imageUrls: photos,
        soundtrackUrl: soundtrack || undefined,
      })
      setVideoId(res.videoId)
      setPhase('rendering')
    } catch (err) {
      notify(err.message || 'Could not start the video. Please try again.', 'error')
      setPhase('idle')
    }
  }

  const shareUrl = videoUrl ? `https://wa.me/?text=${encodeURIComponent(`A tribute video for ${deceasedName}: ${videoUrl}`)}` : null

  return (
    <section
      data-testid="tribute-video-studio"
      className="mx-auto my-8 max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
    >
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Film size={20} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">AI Tribute Video</h3>

      {phase === 'ready' && videoUrl ? (
        <div className="mt-4">
          <video data-testid="tribute-video-player" src={videoUrl} controls playsInline className="w-full rounded-xl border border-border" />
          <div className="mt-4 flex items-center justify-center gap-3">
            <a href={videoUrl} download={`${deceasedName || 'tribute'}-video.mp4`} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Download size={16} aria-hidden="true" /> Download
            </a>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Share2 size={16} aria-hidden="true" /> Share
            </a>
          </div>
        </div>
      ) : phase === 'rendering' || phase === 'creating' ? (
        <div className="mt-4" aria-live="polite">
          <Loader2 size={22} className="mx-auto animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Creating the tribute video — this can take a minute. You can leave and come back.</p>
        </div>
      ) : phase === 'failed' ? (
        <div className="mt-4" aria-live="polite">
          <p className="text-sm text-destructive">The video couldn&apos;t be created.</p>
          <button type="button" onClick={() => setPhase('idle')} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Turn this memorial into a shareable video — a gentle photo montage with an AI-written tribute and music.
          </p>

          {/* Photo manager */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {photos.map((url) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={url} alt="Tribute" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Add photos"
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {uploading ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" /> : <ImagePlus size={18} aria-hidden="true" />}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />

          <label className="mt-4 block text-left text-xs font-medium text-muted-foreground">
            Music
            <select
              value={soundtrack}
              onChange={(e) => setSoundtrack(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {SOUNDTRACKS.map((t) => <option key={t.label} value={t.url}>{t.label}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={start}
            disabled={uploading || photos.length === 0}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Film size={18} aria-hidden="true" /> Create Tribute Video
          </button>
          {photos.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Add at least one photo to create a video.</p>}
        </div>
      )}
    </section>
  )
}
