import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Share2, BookOpenCheck, Presentation } from 'lucide-react'
import { useBrochureStore } from '../stores/brochureStore'
import { useNotification } from '../components/ui/notification'
import BrochureDocument from '../components/pdf/BrochureDocument'

export default function PreviewPage() {
  const store = useBrochureStore()
  const { notify } = useNotification()

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

  const smartFilename = store.getSmartFilename('pdf')

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      notify('Link copied to clipboard!', 'success')
    } catch {
      notify('Could not copy link. Please copy the URL from the address bar.', 'warning')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background" role="main" aria-label="Brochure Preview">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0" role="toolbar" aria-label="Preview toolbar">
        <Link to="/editor" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm" aria-label="Back to Editor">
          <ArrowLeft size={16} /> Back to Editor
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/flipbook"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
          >
            <BookOpenCheck size={14} /> Flipbook
          </Link>
          <Link
            to="/slideshow"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
          >
            <Presentation size={14} /> Slideshow
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
            aria-label="Share brochure link"
          >
            <Share2 size={14} /> Share
          </button>

          <PDFDownloadLink
            document={<BrochureDocument data={pdfData} />}
            fileName={smartFilename}
          >
            {({ loading }) => (
              <button
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-white text-xs font-medium rounded-md transition-colors"
                aria-label={loading ? 'Preparing PDF download' : 'Download PDF'}
              >
                <Download size={14} />
                {loading ? 'Preparing...' : 'Download PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Full-screen viewer */}
      <div className="flex-1" aria-label="PDF viewer">
        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={true}>
          <BrochureDocument data={pdfData} />
        </PDFViewer>
      </div>
    </div>
  )
}
