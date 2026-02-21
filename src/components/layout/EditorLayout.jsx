import { useState, useCallback, useEffect, useRef } from 'react'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import { Download, ChevronDown, ChevronRight, Check, Eye, Share2, Globe } from 'lucide-react'
import { useBrochureStore } from '../../stores/brochureStore'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useSectionComplete, useOverallProgress } from '../../hooks/useValidation'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { BackupReminder } from '../ui/backup-reminder'
import { Skeleton } from '../ui/skeleton'
import { Dialog, DialogContent } from '../ui/dialog'
import BrochureDocument from '../pdf/BrochureDocument'
import ShareWhatsAppDialog from '../editor/ShareWhatsAppDialog'
import PublishMemorialDialog from '../editor/PublishMemorialDialog'

import BasicInfoForm from '../editor/BasicInfoForm'
import CoverForm from '../editor/CoverForm'
import ScriptureForm from '../editor/ScriptureForm'
import OfficialsForm from '../editor/OfficialsForm'
import OrderOfServiceForm from '../editor/OrderOfServiceForm'
import BiographyForm from '../editor/BiographyForm'
import TributesForm from '../editor/TributesForm'
import PhotoGalleryForm from '../editor/PhotoGalleryForm'
import AcknowledgementsForm from '../editor/AcknowledgementsForm'
import BackCoverForm from '../editor/BackCoverForm'

const sections = [
  { key: 'basic', title: 'Basic Information', icon: '1', component: BasicInfoForm },
  { key: 'cover', title: 'Cover Page', icon: '2', component: CoverForm },
  { key: 'scripture', title: 'Scripture Page', icon: '3', component: ScriptureForm },
  { key: 'officials', title: 'Programme Officials', icon: '4', component: OfficialsForm },
  { key: 'service', title: 'Order of Service', icon: '5', component: OrderOfServiceForm },
  { key: 'biography', title: 'Biography', icon: '6', component: BiographyForm },
  { key: 'tributes', title: 'Tributes', icon: '7', component: TributesForm },
  { key: 'gallery', title: 'Photo Gallery', icon: '8', component: PhotoGalleryForm },
  { key: 'ack', title: 'Acknowledgements', icon: '9', component: AcknowledgementsForm },
  { key: 'back', title: 'Back Cover', icon: '10', component: BackCoverForm },
]

function extractPdfData() {
  const state = useBrochureStore.getState()
  return {
    title: state.title,
    fullName: state.fullName,
    dateOfBirth: state.dateOfBirth,
    dateOfDeath: state.dateOfDeath,
    funeralDate: state.funeralDate,
    funeralTime: state.funeralTime,
    funeralVenue: state.funeralVenue,
    burialLocation: state.burialLocation,
    theme: state.theme,
    coverPhoto: state.coverPhoto,
    coverVerse: state.coverVerse,
    coverSubtitle: state.coverSubtitle,
    scriptureKey: state.scriptureKey,
    customScripture: state.customScripture,
    additionalVerse: state.additionalVerse,
    officials: state.officials,
    orderOfService: state.orderOfService,
    biography: state.biography,
    biographyPhotos: state.biographyPhotos,
    biographyPhotoCaptions: state.biographyPhotoCaptions,
    tributes: state.tributes,
    galleryPhotos: state.galleryPhotos,
    acknowledgements: state.acknowledgements,
    familySignature: state.familySignature,
    backCoverPhoto: state.backCoverPhoto,
    backCoverVerse: state.backCoverVerse,
    backCoverPhrase: state.backCoverPhrase,
    backCoverSubtext: state.backCoverSubtext,
    designerCredit: state.designerCredit,
    memorialId: state.memorialId,
    memorialQrCode: state.memorialQrCode,
  }
}

// Small component that uses the hook per-section to avoid re-rendering the whole list
function SectionBadge({ sectionKey, icon }) {
  const isComplete = useSectionComplete(sectionKey)

  if (isComplete) {
    return (
      <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
        <Check size={12} />
      </span>
    )
  }

  return (
    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
      {icon}
    </span>
  )
}

function ProgressBar() {
  const { completed, total } = useOverallProgress()
  const pct = (completed / total) * 100

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Progress</span>
        <span className="text-xs text-primary font-medium">{completed}/{total} sections</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {completed === total && (
        <p className="text-[10px] text-emerald-400 mt-1">All sections complete -- ready to download!</p>
      )}
    </div>
  )
}

function PdfSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-[360px] space-y-4">
        <Skeleton className="w-full h-[500px] rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="w-3/4 h-3 mx-auto" />
          <Skeleton className="w-1/2 h-3 mx-auto" />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">Loading PDF preview...</p>
      </div>
    </div>
  )
}

export default function EditorLayout() {
  useAutoSave()
  const [openSections, setOpenSections] = useState(['basic'])
  const [pdfData, setPdfData] = useState(() => extractPdfData())
  const [pdfReady, setPdfReady] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const timerRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Brief delay to let PDF renderer initialize, then show viewer
  useEffect(() => {
    const t = setTimeout(() => setPdfReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Subscribe to store changes with debounce
  useEffect(() => {
    const unsub = useBrochureStore.subscribe(() => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setPdfData(extractPdfData())
      }, 600)
    })
    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const toggleSection = (key) => {
    setOpenSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Form Editor */}
      <div className="w-full lg:w-[420px] xl:w-[460px] border-r border-border overflow-y-auto bg-background">
        <div className="p-4">
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Brochure Editor</h2>

          <ProgressBar />
          <BackupReminder />

          <div className="space-y-1">
            {sections.map(({ key, title, icon, component: Component }) => {
              const isOpen = openSections.includes(key)
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-card/50 transition-colors"
                  >
                    <SectionBadge sectionKey={key} icon={icon} />
                    <span className="text-sm text-card-foreground flex-1">{title}</span>
                    {isOpen
                      ? <ChevronDown size={14} className="text-muted-foreground" />
                      : <ChevronRight size={14} className="text-muted-foreground" />
                    }
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-3 pb-4 pt-2 border-t border-border/50">
                        <Component />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - PDF Preview (desktop only) */}
      {!isMobile && (
        <div className="flex-1 flex flex-col bg-card min-h-0">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Preview</span>
            <button
              onClick={() => setPublishDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
            >
              <Globe size={14} /> Publish
            </button>
            <button
              onClick={() => setShareDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-md transition-colors"
            >
              <Share2 size={14} /> Share
            </button>
            <PDFDownloadLink
              document={<BrochureDocument data={pdfData} />}
              fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Memorial'}-Funeral-Brochure.pdf`}
            >
              {({ loading }) => (
                <button
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-white text-xs font-medium rounded-md transition-colors"
                >
                  <Download size={14} />
                  {loading ? 'Preparing...' : 'Download PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 relative">
            {pdfReady ? (
              <div className="absolute inset-0">
                <PDFViewer
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  showToolbar={true}
                >
                  <BrochureDocument data={pdfData} />
                </PDFViewer>
              </div>
            ) : (
              <PdfSkeleton />
            )}
          </div>
        </div>
      )}

      {/* Mobile: floating preview button + full-screen dialog */}
      {isMobile && (
        <>
          <button
            onClick={() => setShowMobilePreview(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-full shadow-lg transition-colors lg:hidden"
            aria-label="Preview PDF"
          >
            <Eye size={18} /> Preview
          </button>

          <Dialog open={showMobilePreview} onOpenChange={setShowMobilePreview}>
            <DialogContent className="max-w-full w-full h-[90vh] p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm text-card-foreground font-medium">PDF Preview</span>
                  <PDFDownloadLink
                    document={<BrochureDocument data={pdfData} />}
                    fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Memorial'}-Funeral-Brochure.pdf`}
                  >
                    {({ loading }) => (
                      <button
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-muted text-white text-xs font-medium rounded-md transition-colors"
                      >
                        <Download size={14} />
                        {loading ? 'Preparing...' : 'Download PDF'}
                      </button>
                    )}
                  </PDFDownloadLink>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                      <BrochureDocument data={pdfData} />
                    </PDFViewer>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <ShareWhatsAppDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
      <PublishMemorialDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen} />
    </div>
  )
}
