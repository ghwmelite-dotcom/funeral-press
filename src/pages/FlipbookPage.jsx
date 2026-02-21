import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, BookOpen } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useBrochureStore } from '../stores/brochureStore'
import BrochureDocument from '../components/pdf/BrochureDocument'
import FlipbookViewer from '../components/flipbook/FlipbookViewer'
import { usePdfToImages } from '../hooks/usePdfToImages'

export default function FlipbookPage() {
  const store = useBrochureStore()
  const [pdfBlob, setPdfBlob] = useState(null)
  const [generating, setGenerating] = useState(true)
  const { images, loading, error, progress } = usePdfToImages(pdfBlob)

  const pdfData = {
    title: store.title,
    fullName: store.fullName,
    dateOfBirth: store.dateOfBirth,
    dateOfDeath: store.dateOfDeath,
    funeralDate: store.funeralDate,
    funeralTime: store.funeralTime,
    funeralVenue: store.funeralVenue,
    burialLocation: store.burialLocation,
    theme: store.theme,
    coverPhoto: store.coverPhoto,
    coverVerse: store.coverVerse,
    coverSubtitle: store.coverSubtitle,
    scriptureKey: store.scriptureKey,
    customScripture: store.customScripture,
    additionalVerse: store.additionalVerse,
    officials: store.officials,
    orderOfService: store.orderOfService,
    biography: store.biography,
    biographyPhotos: store.biographyPhotos,
    biographyPhotoCaptions: store.biographyPhotoCaptions,
    tributes: store.tributes,
    galleryPhotos: store.galleryPhotos,
    acknowledgements: store.acknowledgements,
    familySignature: store.familySignature,
    backCoverVerse: store.backCoverVerse,
    backCoverPhrase: store.backCoverPhrase,
    backCoverSubtext: store.backCoverSubtext,
    designerCredit: store.designerCredit,
    memorialId: store.memorialId,
    memorialQrCode: store.memorialQrCode,
  }

  useEffect(() => {
    async function generate() {
      try {
        const blob = await pdf(<BrochureDocument data={pdfData} />).toBlob()
        setPdfBlob(blob)
      } catch (err) {
        console.error('PDF generation failed:', err)
      } finally {
        setGenerating(false)
      }
    }
    generate()
  }, [])

  const isLoading = generating || loading

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-background">
        <Link to="/preview" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Preview
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-primary" />
          <span className="text-sm text-card-foreground">Flipbook View</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {images.length > 0 ? `${images.length} pages` : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)] p-4">
        {isLoading ? (
          <div className="text-center space-y-4">
            <Loader2 size={36} className="text-primary animate-spin mx-auto" />
            <div>
              <p className="text-sm text-muted-foreground">
                {generating ? 'Generating PDF...' : `Rendering pages... ${progress}%`}
              </p>
              <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-3 mx-auto">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${generating ? 30 : progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-red-400">{error}</p>
            <Link to="/preview" className="text-sm text-primary hover:text-primary/90">
              Back to Preview
            </Link>
          </div>
        ) : (
          <FlipbookViewer images={images} />
        )}
      </div>
    </div>
  )
}
