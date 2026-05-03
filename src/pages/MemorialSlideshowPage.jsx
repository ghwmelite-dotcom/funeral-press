import { useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Presentation } from 'lucide-react'
import { useBrochureStore } from '../stores/brochureStore'
import { generateSlides } from '../utils/slideshowSlides'
import { useSlideshow } from '../hooks/useSlideshow'
import { useRecorder } from '../hooks/useRecorder'
import SlideshowPlayer from '../components/memorial/SlideshowPlayer'
import SlideshowControls from '../components/memorial/SlideshowControls'

export default function MemorialSlideshowPage() {
  const store = useBrochureStore()
  const canvasRef = useRef(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slides = useMemo(() => generateSlides(store), [
    store.title, store.fullName, store.coverPhoto, store.biography,
    store.tributes, store.galleryPhotos, store.biographyPhotos,
    store.backCoverPhrase, store.backCoverSubtext, store.backCoverVerse,
    store.coverVerse, store.coverSubtitle,
  ])

  const slideshow = useSlideshow(slides)
  const recorder = useRecorder()

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <Link to="/preview" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Presentation size={16} className="text-primary" />
          <span className="text-sm text-card-foreground">Memorial Slideshow</span>
        </div>
        <span className="text-xs text-muted-foreground">{store.title} {store.fullName}</span>
      </div>

      {/* Player */}
      <SlideshowPlayer
        slide={slideshow.currentSlide}
        transitioning={slideshow.transitioning}
        themeKey={store.theme}
        canvasRef={canvasRef}
      />

      {/* Controls */}
      <SlideshowControls
        slideshow={slideshow}
        recorder={recorder}
        canvasRef={canvasRef}
      />
    </div>
  )
}
