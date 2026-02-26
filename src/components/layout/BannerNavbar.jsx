import { Link, useLocation } from 'react-router-dom'
import { Flag, Undo2, Redo2, Save, Download, Upload, History, Sun, Moon } from 'lucide-react'
import { useBannerStore } from '../../stores/bannerStore'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import GoogleLoginButton from '../auth/GoogleLoginButton'
import UserMenu from '../auth/UserMenu'
import { useNotification } from '../ui/notification'
import { useRef, useState, useEffect } from 'react'
import BannerVersionsDialog from './BannerVersionsDialog'
import ImportConfirmDialog from './ImportConfirmDialog'

export default function BannerNavbar() {
  const location = useLocation()
  const store = useBannerStore()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const { notify } = useNotification()
  const fileInputRef = useRef(null)
  const isEditor = location.pathname.startsWith('/banner')

  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef(null)

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const pendingImportData = useRef(null)

  const handleSave = () => {
    store.saveBanner()
    notify('Banner saved successfully!', 'success')
    setShowSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 3000)
  }

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
    notify('Banner exported as JSON', 'success')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = store.importJSON(ev.target.result)
      if (!data) {
        notify('Invalid banner data file.', 'error')
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
      store.createSnapshot('Before import')
      store.applyImport(pendingImportData.current)
      pendingImportData.current = null
      notify('Banner data imported successfully!', 'success')
    }
  }

  return (
    <>
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0" role="navigation" aria-label="Main navigation">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors" aria-label="Go to home page">
          <Flag size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Banner Builder</span>
        </Link>

        {isEditor && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[calc(100vw-200px)] sm:max-w-none">
            <button
              onClick={() => store.undo()}
              disabled={!store.canUndo()}
              className="shrink-0 p-2 text-muted-foreground hover:text-card-foreground disabled:opacity-30 transition-colors"
              title="Undo"
              aria-label="Undo last change"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={() => store.redo()}
              disabled={!store.canRedo()}
              className="shrink-0 p-2 text-muted-foreground hover:text-card-foreground disabled:opacity-30 transition-colors"
              title="Redo"
              aria-label="Redo last change"
            >
              <Redo2 size={15} />
            </button>

            <div className="w-px h-5 bg-accent mx-2 shrink-0" />

            <button
              onClick={handleSave}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Save"
              aria-label="Save banner"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={handleExport}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Export JSON"
              aria-label="Export banner as JSON"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Import JSON"
              aria-label="Import banner from JSON file"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => setVersionsOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Version History"
              aria-label="Open version history"
            >
              <History size={14} />
              <span className="hidden sm:inline">Versions</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />

            {showSaved ? (
              <span className="text-[10px] text-emerald-500 ml-2 animate-fade-in">Saved</span>
            ) : store.isDirty ? (
              <span className="text-[10px] text-primary ml-2">Unsaved</span>
            ) : null}

          </div>
        )}

        <div className="flex items-center gap-1.5">
          {user ? <UserMenu /> : <GoogleLoginButton compact />}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <BannerVersionsDialog open={versionsOpen} onOpenChange={setVersionsOpen} />
      <ImportConfirmDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen} onConfirm={handleImportConfirm} />
    </>
  )
}
