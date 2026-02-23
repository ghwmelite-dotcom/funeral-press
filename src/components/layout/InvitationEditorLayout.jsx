import { useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { ChevronDown, ChevronRight, Check, Eye } from 'lucide-react'
import { useInvitationStore } from '../../stores/invitationStore'
import GatedDownloadButton from '../editor/GatedDownloadButton'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Skeleton } from '../ui/skeleton'
import { Dialog, DialogContent } from '../ui/dialog'
import InvitationDocument from '../invitation-pdf/InvitationDocument'

import InvitationBasicForm from '../invitation-editor/InvitationBasicForm'
import InvitationAnnouncementForm from '../invitation-editor/InvitationAnnouncementForm'
import InvitationEventsForm from '../invitation-editor/InvitationEventsForm'
import InvitationDetailsForm from '../invitation-editor/InvitationDetailsForm'
import InvitationThemeForm from '../invitation-editor/InvitationThemeForm'

const sections = [
  { key: 'basic', title: 'Basic Information', icon: '1', component: InvitationBasicForm },
  { key: 'announcement', title: 'Family Announcement', icon: '2', component: InvitationAnnouncementForm },
  { key: 'events', title: 'Events & Arrangements', icon: '3', component: InvitationEventsForm },
  { key: 'details', title: 'RSVP & Details', icon: '4', component: InvitationDetailsForm },
  { key: 'theme', title: 'Theme', icon: '5', component: InvitationThemeForm },
]

function extractPdfData() {
  const state = useInvitationStore.getState()
  return {
    invitationTheme: state.invitationTheme,
    title: state.title,
    fullName: state.fullName,
    alias: state.alias,
    age: state.age,
    photo: state.photo,
    familyAnnouncement: state.familyAnnouncement,
    events: state.events,
    rsvpPhone: state.rsvpPhone,
    location: state.location,
    dressCode: state.dressCode,
    customMessage: state.customMessage,
  }
}

function checkSectionComplete(key, state) {
  switch (key) {
    case 'basic':
      return !!state.fullName?.trim()
    case 'announcement':
      return !!state.familyAnnouncement?.trim()
    case 'events':
      return state.events?.some(e => e.title?.trim())
    case 'details':
      return !!(state.rsvpPhone?.trim() || state.location?.trim())
    case 'theme':
      return !!state.invitationTheme
    default:
      return false
  }
}

function SectionBadge({ sectionKey, icon }) {
  const state = useInvitationStore()
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
  const state = useInvitationStore()
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

function InvitationBackupReminder() {
  const editCount = useInvitationStore(s => s.editCountSinceLastSave)
  const saveInvitation = useInvitationStore(s => s.saveInvitation)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || editCount < 5) return null

  return (
    <div className="mb-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-primary">
      <span className="flex-1">You have unsaved changes. Don't forget to save!</span>
      <button onClick={() => { saveInvitation(); setDismissed(true) }} className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90">Save Now</button>
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

function useInvitationAutoSave(intervalMs = 30000) {
  const saveInvitation = useInvitationStore(s => s.saveInvitation)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (useInvitationStore.getState().isDirty) {
        saveInvitation()
      }
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [intervalMs, saveInvitation])

  useEffect(() => {
    return () => {
      if (useInvitationStore.getState().isDirty) {
        saveInvitation()
      }
    }
  }, [saveInvitation])
}

export default function InvitationEditorLayout() {
  useInvitationAutoSave()
  const [openSections, setOpenSections] = useState(['basic'])
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
    const unsub = useInvitationStore.subscribe(() => {
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
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Invitation Editor</h2>

          <ProgressBar />
          <InvitationBackupReminder />

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
              document={<InvitationDocument data={pdfData} />}
              fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Funeral'}-Invitation.pdf`}
              designId={useInvitationStore.getState().currentId}
              productType="invitation"
            />
          </div>

          <div className="flex-1 relative">
            {pdfReady ? (
              <div className="absolute inset-0">
                <PDFViewer
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  showToolbar={true}
                >
                  <InvitationDocument data={pdfData} />
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
                    document={<InvitationDocument data={pdfData} />}
                    fileName={`${pdfData.fullName?.replace(/\s+/g, '-') || 'Funeral'}-Invitation.pdf`}
                    designId={useInvitationStore.getState().currentId}
                    productType="invitation"
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                      <InvitationDocument data={pdfData} />
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
