import { useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { ChevronDown, ChevronRight, Check, Eye } from 'lucide-react'
import { usePosterStore } from '../../stores/posterStore'
import GatedDownloadButton from '../editor/GatedDownloadButton'
import OrderPrintsButton from '../editor/OrderPrintsButton'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Skeleton } from '../ui/skeleton'
import { Dialog, DialogContent } from '../ui/dialog'
import PosterDocument from '../poster-pdf/PosterDocument'

import PosterBasicForm from '../poster-editor/PosterBasicForm'
import PosterAnnouncementForm from '../poster-editor/PosterAnnouncementForm'
import PosterFuneralForm from '../poster-editor/PosterFuneralForm'
import PosterFamilyForm from '../poster-editor/PosterFamilyForm'
import PosterExtendedForm from '../poster-editor/PosterExtendedForm'
import PosterFooterForm from '../poster-editor/PosterFooterForm'

const sections = [
  { key: 'basic', title: 'Basic Information', icon: '1', component: PosterBasicForm },
  { key: 'announcement', title: 'Announcement', icon: '2', component: PosterAnnouncementForm },
  { key: 'funeral', title: 'Funeral Arrangements', icon: '3', component: PosterFuneralForm },
  { key: 'family', title: 'Immediate Family', icon: '4', component: PosterFamilyForm },
  { key: 'extended', title: 'Extended Family', icon: '5', component: PosterExtendedForm },
  { key: 'footer', title: 'Footer & Theme', icon: '6', component: PosterFooterForm },
]

function extractPdfData() {
  const state = usePosterStore.getState()
  return {
    posterTheme: state.posterTheme,
    headerTitle: state.headerTitle,
    fullName: state.fullName,
    alias: state.alias,
    age: state.age,
    photo: state.photo,
    dateOfDeath: state.dateOfDeath,
    placeOfDeath: state.placeOfDeath,
    announcementText: state.announcementText,
    funeralArrangements: state.funeralArrangements,
    father: state.father,
    mother: state.mother,
    widowWidower: state.widowWidower,
    widowWidowerLabel: state.widowWidowerLabel,
    children: state.children,
    grandchildren: state.grandchildren,
    siblings: state.siblings,
    inLaw: state.inLaw,
    brothersSisters: state.brothersSisters,
    cousins: state.cousins,
    nephewsNieces: state.nephewsNieces,
    chiefMourners: state.chiefMourners,
    invitationText: state.invitationText,
    dressCode: state.dressCode,
  }
}

function checkSectionComplete(key, state) {
  switch (key) {
    case 'basic':
      return !!state.fullName?.trim()
    case 'announcement':
      return !!state.announcementText?.trim()
    case 'funeral':
      return state.funeralArrangements?.some(a => a.value?.trim())
    case 'family':
      return !!(state.father?.trim() || state.mother?.trim() || state.widowWidower?.trim() || state.children?.trim() || state.grandchildren?.trim() || state.siblings?.trim() || state.inLaw?.trim())
    case 'extended':
      return !!(state.brothersSisters?.trim() || state.cousins?.trim() || state.nephewsNieces?.trim() || state.chiefMourners?.trim())
    case 'footer':
      return !!state.invitationText?.trim()
    default:
      return false
  }
}

function SectionBadge({ sectionKey, icon }) {
  const state = usePosterStore()
  const isComplete = checkSectionComplete(sectionKey, state)

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
  const state = usePosterStore()
  const total = sections.length
  let completed = 0
  for (const s of sections) {
    if (checkSectionComplete(s.key, state)) completed++
  }
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

function PosterBackupReminder() {
  const editCount = usePosterStore(s => s.editCountSinceLastSave)
  const savePoster = usePosterStore(s => s.savePoster)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || editCount < 5) return null

  return (
    <div className="mb-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-primary">
      <span className="flex-1">You have unsaved changes. Don't forget to save!</span>
      <button onClick={() => { savePoster(); setDismissed(true) }} className="px-3 py-2 bg-primary text-white rounded text-xs hover:bg-primary/90">Save Now</button>
      <button onClick={() => setDismissed(true)} className="text-primary hover:text-primary/80 text-sm font-bold p-2">&times;</button>
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

// Auto-save hook for poster store
function usePosterAutoSave(intervalMs = 30000) {
  const savePoster = usePosterStore(s => s.savePoster)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (usePosterStore.getState().isDirty) {
        savePoster()
      }
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [intervalMs, savePoster])

  // Also save on unmount if dirty
  useEffect(() => {
    return () => {
      if (usePosterStore.getState().isDirty) {
        savePoster()
      }
    }
  }, [savePoster])
}

export default function PosterEditorLayout() {
  usePosterAutoSave()
  const [openSections, setOpenSections] = useState(['basic'])
  const [pdfData, setPdfData] = useState(() => extractPdfData())
  const [pdfReady, setPdfReady] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const timerRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Brief delay to let PDF renderer initialize, then show viewer
  useEffect(() => {
    const t = setTimeout(() => setPdfReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Subscribe to store changes with debounce
  useEffect(() => {
    const unsub = usePosterStore.subscribe(() => {
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
      <div className="w-full lg:w-[420px] xl:w-[460px] border-r border-border overflow-y-auto overflow-x-hidden min-w-0 bg-background">
        <div className="p-4">
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Poster Editor</h2>

          <ProgressBar />
          <PosterBackupReminder />

          <div className="space-y-1">
            {sections.map(({ key, title, icon, component: Component }) => {
              const isOpen = openSections.includes(key)
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-card/50 transition-colors"
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
            <div className="flex items-center gap-2">
              <OrderPrintsButton
                designId={usePosterStore.getState().currentId}
                productType="poster"
                designName={pdfData.fullName ? `${pdfData.fullName} Poster` : 'Poster'}
                getDesignSnapshot={() => pdfData}
              />
              <GatedDownloadButton
                document={<PosterDocument data={pdfData} />}
                fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Obituary'}-Poster.pdf`}
                designId={usePosterStore.getState().currentId}
                productType="poster"
              />
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 relative">
            {pdfReady ? (
              <div className="absolute inset-0">
                <PDFViewer
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  showToolbar={true}
                >
                  <PosterDocument data={pdfData} />
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
                  <div className="flex items-center gap-2 mr-8">
                    <OrderPrintsButton
                      designId={usePosterStore.getState().currentId}
                      productType="poster"
                      designName={pdfData.fullName ? `${pdfData.fullName} Poster` : 'Poster'}
                      getDesignSnapshot={() => pdfData}
                    />
                    <GatedDownloadButton
                      document={<PosterDocument data={pdfData} />}
                      fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Obituary'}-Poster.pdf`}
                      designId={usePosterStore.getState().currentId}
                      productType="poster"
                    />
                  </div>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                      <PosterDocument data={pdfData} />
                    </PDFViewer>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
