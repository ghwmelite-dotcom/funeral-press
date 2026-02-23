import { useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { ChevronDown, ChevronRight, Check, Eye } from 'lucide-react'
import { useBookletStore } from '../../stores/bookletStore'
import GatedDownloadButton from '../editor/GatedDownloadButton'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Skeleton } from '../ui/skeleton'
import { Dialog, DialogContent } from '../ui/dialog'
import BookletDocument from '../booklet-pdf/BookletDocument'

import BookletCoverForm from '../booklet-editor/BookletCoverForm'
import BookletServiceForm from '../booklet-editor/BookletServiceForm'
import BookletHymnsForm from '../booklet-editor/BookletHymnsForm'
import BookletScriptureForm from '../booklet-editor/BookletScriptureForm'
import BookletBackForm from '../booklet-editor/BookletBackForm'

const sections = [
  { key: 'cover', title: 'Cover Info', icon: '1', component: BookletCoverForm },
  { key: 'service', title: 'Order of Service', icon: '2', component: BookletServiceForm },
  { key: 'hymns', title: 'Hymns', icon: '3', component: BookletHymnsForm },
  { key: 'scripture', title: 'Scripture', icon: '4', component: BookletScriptureForm },
  { key: 'back', title: 'Back Cover & Theme', icon: '5', component: BookletBackForm },
]

function extractPdfData() {
  const state = useBookletStore.getState()
  return {
    bookletTheme: state.bookletTheme,
    fullName: state.fullName,
    alias: state.alias,
    photo: state.photo,
    dateOfBirth: state.dateOfBirth,
    dateOfDeath: state.dateOfDeath,
    age: state.age,
    funeralDate: state.funeralDate,
    funeralTime: state.funeralTime,
    venue: state.venue,
    venueAddress: state.venueAddress,
    orderOfService: state.orderOfService,
    selectedHymns: state.selectedHymns,
    scriptureKey: state.scriptureKey,
    customScripture: state.customScripture,
    officiant: state.officiant,
    churchName: state.churchName,
    customBackText: state.customBackText,
  }
}

function checkSectionComplete(key, state) {
  switch (key) {
    case 'cover':
      return !!state.fullName?.trim()
    case 'service':
      return state.orderOfService?.some(e => e.item?.trim())
    case 'hymns':
      return state.selectedHymns?.length > 0
    case 'scripture':
      return !!(state.scriptureKey || state.customScripture?.trim())
    case 'back':
      return !!state.bookletTheme
    default:
      return false
  }
}

function SectionBadge({ sectionKey, icon }) {
  const state = useBookletStore()
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
  const state = useBookletStore()
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

function BookletBackupReminder() {
  const editCount = useBookletStore(s => s.editCountSinceLastSave)
  const saveBooklet = useBookletStore(s => s.saveBooklet)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || editCount < 5) return null

  return (
    <div className="mb-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-primary">
      <span className="flex-1">You have unsaved changes. Don't forget to save!</span>
      <button onClick={() => { saveBooklet(); setDismissed(true) }} className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90">Save Now</button>
      <button onClick={() => setDismissed(true)} className="text-primary hover:text-primary/80 text-sm font-bold">&times;</button>
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

function useBookletAutoSave(intervalMs = 30000) {
  const saveBooklet = useBookletStore(s => s.saveBooklet)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (useBookletStore.getState().isDirty) {
        saveBooklet()
      }
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [intervalMs, saveBooklet])

  useEffect(() => {
    return () => {
      if (useBookletStore.getState().isDirty) {
        saveBooklet()
      }
    }
  }, [saveBooklet])
}

export default function BookletEditorLayout() {
  useBookletAutoSave()
  const [openSections, setOpenSections] = useState(['cover'])
  const [pdfData, setPdfData] = useState(() => extractPdfData())
  const [pdfReady, setPdfReady] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const timerRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 1023px)')

  useEffect(() => {
    const t = setTimeout(() => setPdfReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const unsub = useBookletStore.subscribe(() => {
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
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Programme Editor</h2>

          <ProgressBar />
          <BookletBackupReminder />

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
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Preview</span>
            <GatedDownloadButton
              document={<BookletDocument data={pdfData} />}
              fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Funeral'}-Programme-Booklet.pdf`}
              designId={useBookletStore.getState().currentId}
              productType="booklet"
            />
          </div>

          <div className="flex-1 relative">
            {pdfReady ? (
              <div className="absolute inset-0">
                <PDFViewer
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  showToolbar={true}
                >
                  <BookletDocument data={pdfData} />
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
                  <GatedDownloadButton
                    document={<BookletDocument data={pdfData} />}
                    fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Funeral'}-Programme-Booklet.pdf`}
                    designId={useBookletStore.getState().currentId}
                    productType="booklet"
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                      <BookletDocument data={pdfData} />
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
