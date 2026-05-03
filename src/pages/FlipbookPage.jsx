import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Loader2, BookOpen, Upload, X } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'
import { pdf } from '@react-pdf/renderer'
import { useBrochureStore } from '../stores/brochureStore'
import BrochureDocument from '../components/pdf/BrochureDocument'
import FlipbookViewer from '../components/flipbook/FlipbookViewer'
import { usePdfToImages } from '../hooks/usePdfToImages'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function FlipbookPage() {
  const store = useBrochureStore()
  const fileInputRef = useRef(null)

  const [sourceMode, setSourceMode] = useState('brochure') // 'brochure' | 'upload'
  const [brochureBlob, setBrochureBlob] = useState(null)
  const [uploadedBlob, setUploadedBlob] = useState(null)
  const [uploadedFilename, setUploadedFilename] = useState('')
  const [generating, setGenerating] = useState(true)
  const [uploadError, setUploadError] = useState(null)

  const activePdfBlob = sourceMode === 'upload' ? uploadedBlob : brochureBlob
  const { images, loading, error, progress } = usePdfToImages(activePdfBlob)

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

  // Generate brochure PDF from store
  useEffect(() => {
    async function generate() {
      try {
        const blob = await pdf(<BrochureDocument data={pdfData} />).toBlob()
        setBrochureBlob(blob)
      } catch (err) {
        console.error('PDF generation failed:', err)
      } finally {
        setGenerating(false)
      }
    }
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle file upload
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    e.target.value = ''

    setUploadError(null)

    if (file.type !== 'application/pdf') {
      setUploadError('Please select a PDF file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds 50MB limit.')
      return
    }

    setUploadedBlob(file)
    setUploadedFilename(file.name)
    setSourceMode('upload')
  }, [])

  // Clear uploaded file
  const clearUpload = () => {
    setUploadedBlob(null)
    setUploadedFilename('')
    setUploadError(null)
    setSourceMode('brochure')
  }

  // Download active PDF
  const handleDownload = useCallback(() => {
    if (!activePdfBlob) return
    const url = URL.createObjectURL(activePdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = sourceMode === 'upload' ? uploadedFilename : 'brochure.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activePdfBlob, sourceMode, uploadedFilename])

  const isLoading = (sourceMode === 'brochure' && generating) || loading

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Memorial Flipbook — Interactive Digital Funeral Programme | FuneralPress"
        description="View funeral programmes as interactive digital flipbooks. Share online with family and friends. Beautiful page-turning experience for memorial brochures."
        path="/flipbook"
      />
      <Helmet>
        <meta property="og:title" content={store.fullName ? `${store.fullName} — Memorial Flipbook` : 'Memorial Flipbook | FuneralPress'} />
        <meta property="og:description" content={store.fullName ? `View the memorial flipbook for ${store.fullName}. An interactive digital funeral programme.` : 'View funeral programmes as interactive digital flipbooks. Share online with family and friends.'} />
        <meta property="og:type" content="article" />
        {store.coverPhoto && <meta property="og:image" content={store.coverPhoto} />}
      </Helmet>
      {/* Header */}
      <div className="h-auto min-h-12 flex items-center justify-between px-4 py-2 border-b border-border bg-background gap-2 flex-wrap">
        <Link to="/preview" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0">
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Source toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setSourceMode('brochure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              sourceMode === 'brochure'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen size={14} />
            From Brochure
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              sourceMode === 'upload'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload size={14} />
            Upload PDF
          </button>
        </div>

        {/* Filename chip or page count */}
        <div className="flex items-center gap-2 shrink-0">
          {sourceMode === 'upload' && uploadedFilename ? (
            <span className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-full">
              <span className="max-w-[120px] truncate">{uploadedFilename}</span>
              <button
                onClick={clearUpload}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Clear upload"
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {images.length > 0 ? `${images.length} pages` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400 text-center">{uploadError}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)] p-4">
        {isLoading ? (
          <div className="text-center space-y-4">
            <Loader2 size={36} className="text-primary animate-spin mx-auto" />
            <div>
              <p className="text-sm text-muted-foreground">
                {sourceMode === 'brochure' && generating
                  ? 'Generating PDF...'
                  : `Rendering pages... ${progress}%`}
              </p>
              <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-3 mx-auto">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${sourceMode === 'brochure' && generating ? 30 : progress}%` }}
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
        ) : images.length === 0 && sourceMode === 'upload' && !uploadedBlob ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50"
          >
            <Upload size={32} />
            <span className="text-sm">Upload a PDF to view as flipbook</span>
          </button>
        ) : (
          <FlipbookViewer images={images} onDownload={handleDownload} />
        )}
      </div>

      {/* Branding footer */}
      <div className="text-center py-6 border-t border-border mt-12">
        <a href="https://funeralpress.org" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Created with FuneralPress
        </a>
      </div>
    </div>
  )
}
