import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Undo2, Redo2, Save, Download, Upload, History, CalendarCheck, Share2, Sun, Moon } from 'lucide-react'
import { useBrochureStore } from '../../stores/brochureStore'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { SignInPopover } from '../auth/SignInPopover'
import UserMenu from '../auth/UserMenu'
import { useNotification } from '../ui/notification'
import { useRef, useState, useEffect } from 'react'
import VersionsDialog from './VersionsDialog'
import ImportConfirmDialog from './ImportConfirmDialog'
import ShareOnlineDialog from './ShareOnlineDialog'

export default function Navbar() {
  const location = useLocation()
  const store = useBrochureStore()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const { notify } = useNotification()
  const fileInputRef = useRef(null)
  const isEditor = location.pathname.startsWith('/editor')

  // Auto-save indicator state
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef(null)

  // Dialog states
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [shareOnlineOpen, setShareOnlineOpen] = useState(false)
  const pendingImportData = useRef(null)

  const handleSave = () => {
    store.saveBrochure()
    notify('Brochure saved successfully!', 'success')
    setShowSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 3000)
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleExport = () => {
    const json = store.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = store.getSmartFilename('json')
    a.click()
    URL.revokeObjectURL(url)
    notify('Brochure exported as JSON', 'success')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = store.importJSON(ev.target.result)
      if (!data) {
        notify('Invalid brochure data file.', 'error')
        return
      }
      pendingImportData.current = data
      setImportConfirmOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportConfirm = () => {
    if (pendingImportData.current) {
      // Create snapshot before import
      store.createSnapshot('Before import')
      store.applyImport(pendingImportData.current)
      pendingImportData.current = null
      notify('Brochure data imported successfully!', 'success')
    }
  }

  return (
    <>
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0" role="navigation" aria-label="Main navigation">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors" aria-label="Go to home page">
          <BookOpen size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">FuneralPress</span>
        </Link>

        {isEditor && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[calc(100vw-200px)] sm:max-w-none">
            <button
              onClick={() => store.undo()}
              disabled={!store.canUndo()}
              className="p-2 text-muted-foreground hover:text-card-foreground disabled:opacity-30 transition-colors shrink-0"
              title="Undo"
              aria-label="Undo last change"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={() => store.redo()}
              disabled={!store.canRedo()}
              className="p-2 text-muted-foreground hover:text-card-foreground disabled:opacity-30 transition-colors shrink-0"
              title="Redo"
              aria-label="Redo last change"
            >
              <Redo2 size={15} />
            </button>

            <div className="w-px h-5 bg-accent mx-2 shrink-0" />

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Save"
              aria-label="Save brochure"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Export JSON"
              aria-label="Export brochure as JSON"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Import JSON"
              aria-label="Import brochure from JSON file"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => setVersionsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Version History"
              aria-label="Open version history"
            >
              <History size={14} />
              <span className="hidden sm:inline">Versions</span>
            </button>

            <div className="w-px h-5 bg-accent mx-1 shrink-0" />

            <Link
              to="/programme"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Day-of Programme"
              aria-label="Open day-of programme"
            >
              <CalendarCheck size={14} />
              <span className="hidden sm:inline">Day-of</span>
            </Link>

            <button
              onClick={() => setShareOnlineOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Share Online"
              aria-label="Share brochure online"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />

            {/* Auto-save indicator */}
            {showSaved ? (
              <span className="text-[10px] text-emerald-500 ml-2 animate-fade-in">Saved</span>
            ) : store.isDirty ? (
              <span className="text-[10px] text-primary ml-2">Unsaved</span>
            ) : null}

          </div>
        )}

        <div className="flex items-center gap-1.5">
          {user ? <UserMenu /> : <SignInPopover />}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Dialogs */}
      <VersionsDialog open={versionsOpen} onOpenChange={setVersionsOpen} />
      <ImportConfirmDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen} onConfirm={handleImportConfirm} />
      <ShareOnlineDialog open={shareOnlineOpen} onOpenChange={setShareOnlineOpen} />
    </>
  )
}
