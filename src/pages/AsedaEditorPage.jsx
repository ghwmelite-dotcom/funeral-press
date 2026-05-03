import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { useThemeStore } from '../stores/themeStore'
import { useAsedaStore } from '../stores/asedaStore'
import { asedaTemplates, getTemplateStyle } from '../utils/asedaDefaultData'
import { useNotification } from '../components/ui/notification'
import {
  Sun, Moon, Palette, Download, Save, Trash2, FolderOpen,
  Plus, Eye, PenLine, ChevronDown, X, Image as ImageIcon,
  Undo2, Redo2,
} from 'lucide-react'
import { Document, Page as PdfPage, View, Text, Image as PdfImage, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'

// ─── Kente border CSS pattern (pure CSS geometric) ────────────────────────────
function KenteBorder({ children }) {
  return (
    <div className="relative">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-4 flex overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={`t-${i}`}
            className="flex-1 h-full"
            style={{
              backgroundColor: i % 4 === 0 ? '#D4A017' : i % 4 === 1 ? '#C83030' : i % 4 === 2 ? '#1A6B3C' : '#D4A017',
            }}
          />
        ))}
      </div>
      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-4 flex overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={`b-${i}`}
            className="flex-1 h-full"
            style={{
              backgroundColor: i % 4 === 0 ? '#1A6B3C' : i % 4 === 1 ? '#D4A017' : i % 4 === 2 ? '#C83030' : '#D4A017',
            }}
          />
        ))}
      </div>
      {/* Left border */}
      <div className="absolute top-4 bottom-4 left-0 w-4 flex flex-col overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={`l-${i}`}
            className="flex-1 w-full"
            style={{
              backgroundColor: i % 4 === 0 ? '#C83030' : i % 4 === 1 ? '#D4A017' : i % 4 === 2 ? '#1A6B3C' : '#D4A017',
            }}
          />
        ))}
      </div>
      {/* Right border */}
      <div className="absolute top-4 bottom-4 right-0 w-4 flex flex-col overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={`r-${i}`}
            className="flex-1 w-full"
            style={{
              backgroundColor: i % 4 === 0 ? '#D4A017' : i % 4 === 1 ? '#1A6B3C' : i % 4 === 2 ? '#D4A017' : '#C83030',
            }}
          />
        ))}
      </div>
      {/* Inner corners */}
      <div className="absolute top-0 left-0 w-4 h-4" style={{ backgroundColor: '#D4A017' }} />
      <div className="absolute top-0 right-0 w-4 h-4" style={{ backgroundColor: '#D4A017' }} />
      <div className="absolute bottom-0 left-0 w-4 h-4" style={{ backgroundColor: '#D4A017' }} />
      <div className="absolute bottom-0 right-0 w-4 h-4" style={{ backgroundColor: '#D4A017' }} />
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Live Preview Component ───────────────────────────────────────────────────
function AsedaPreview({ design }) {
  const style = getTemplateStyle(design.templateId)
  const isKente = style.kentePattern
  const isModern = design.templateId === 'modernClean'
  const isRoyal = design.templateId === 'royalMemorial'

  const photoShapeClass =
    style.photoShape === 'circle' ? 'rounded-full' :
    style.photoShape === 'rounded' ? 'rounded-lg' : 'rounded-none'

  const bg = style.gradient || (design.backgroundColor !== '#FFFFFF' ? design.backgroundColor : style.backgroundColor)

  const content = (
    <div
      className={`relative flex ${isModern ? 'flex-row' : 'flex-col'} items-center justify-center gap-3 px-6 py-5 h-full`}
      style={{
        background: bg,
        border: style.borderWidth > 0 ? `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}` : 'none',
        fontFamily: style.fontFamily,
        color: style.textColor,
      }}
    >
      {isRoyal && (
        <div
          className="absolute inset-3 border-2 rounded-sm pointer-events-none"
          style={{ borderColor: style.accentColor, opacity: 0.4 }}
        />
      )}

      {/* Photo */}
      <div className={`shrink-0 ${isModern ? 'order-first' : ''}`}>
        {design.photo ? (
          <img
            src={design.photo}
            alt="Memorial"
            className={`object-cover ${photoShapeClass}`}
            style={{
              width: isModern ? 100 : 90,
              height: isModern ? 100 : 90,
              border: `${style.photoBorderWidth}px solid ${style.photoBorderColor}`,
            }}
          />
        ) : (
          <div
            className={`flex items-center justify-center ${photoShapeClass} border-2 border-dashed`}
            style={{
              width: isModern ? 100 : 90,
              height: isModern ? 100 : 90,
              borderColor: style.accentColor,
              opacity: 0.5,
            }}
          >
            <ImageIcon size={24} style={{ color: style.accentColor }} />
          </div>
        )}
      </div>

      {/* Text content */}
      <div className={`text-center ${isModern ? 'text-left flex-1' : ''} space-y-1`}>
        {design.message && (
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: style.accentColor, fontFamily: style.bodyFontFamily }}
          >
            {design.message}
          </p>
        )}

        <h2
          className="text-lg font-bold uppercase tracking-wide leading-tight"
          style={{ color: style.nameColor, fontFamily: style.fontFamily }}
        >
          {design.deceasedName || 'Deceased Name'}
        </h2>

        {(design.dateOfBirth || design.dateOfDeath) && (
          <p className="text-xs" style={{ color: style.textColor, fontFamily: style.bodyFontFamily }}>
            {design.dateOfBirth && new Date(design.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {design.dateOfBirth && design.dateOfDeath && ' — '}
            {design.dateOfDeath && new Date(design.dateOfDeath).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center justify-center gap-2 py-1" style={{ justifyContent: isModern ? 'flex-start' : 'center' }}>
          <div className="h-px w-8" style={{ backgroundColor: style.accentColor }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: style.accentColor }} />
          <div className="h-px w-8" style={{ backgroundColor: style.accentColor }} />
        </div>

        {design.familyName && (
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: style.textColor, fontFamily: style.bodyFontFamily }}>
            {design.familyName}
          </p>
        )}
      </div>
    </div>
  )

  if (isKente) {
    return <KenteBorder>{content}</KenteBorder>
  }
  return content
}

// ─── PDF Document for Aseda Label ────────────────────────────────────────────
// 6x4 inches = 432x288 points
const LABEL_W = 432
const LABEL_H = 288

const pdfStyles = StyleSheet.create({
  page: {
    width: LABEL_W,
    height: LABEL_H,
    padding: 0,
  },
  container: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  containerRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  photo: {
    objectFit: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    height: 0.5,
    width: 30,
  },
  dividerDot: {
    width: 4,
    height: 4,
    transform: 'rotate(45deg)',
    marginHorizontal: 4,
  },
})

function AsedaPdfDocument({ design }) {
  const style = getTemplateStyle(design.templateId)
  const isModern = design.templateId === 'modernClean'
  const bg = style.gradient ? style.backgroundColor : (design.backgroundColor !== '#FFFFFF' ? design.backgroundColor : style.backgroundColor)
  const isCircle = style.photoShape === 'circle'
  const photoSize = isModern ? 90 : 80

  return (
    <Document>
      <PdfPage size={[LABEL_W, LABEL_H]} style={pdfStyles.page}>
        {/* Kente top bar */}
        {style.kentePattern && (
          <View style={{ flexDirection: 'row', height: 12 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: i % 4 === 0 ? '#D4A017' : i % 4 === 1 ? '#C83030' : i % 4 === 2 ? '#1A6B3C' : '#D4A017',
                }}
              />
            ))}
          </View>
        )}

        <View
          style={[
            isModern ? pdfStyles.containerRow : pdfStyles.container,
            {
              backgroundColor: bg,
              borderWidth: style.kentePattern ? 0 : style.borderWidth,
              borderColor: style.borderColor,
              borderStyle: 'solid',
              flex: 1,
            },
          ]}
        >
          {/* Photo */}
          {design.photo ? (
            <PdfImage
              src={design.photo}
              style={[
                pdfStyles.photo,
                {
                  width: photoSize,
                  height: photoSize,
                  borderRadius: isCircle ? photoSize / 2 : style.photoShape === 'rounded' ? 6 : 0,
                  borderWidth: style.photoBorderWidth,
                  borderColor: style.photoBorderColor,
                },
              ]}
            />
          ) : (
            <View
              style={[
                pdfStyles.placeholder,
                {
                  width: photoSize,
                  height: photoSize,
                  borderRadius: isCircle ? photoSize / 2 : 0,
                  borderColor: style.accentColor,
                },
              ]}
            >
              <Text style={{ fontSize: 8, color: '#999' }}>Photo</Text>
            </View>
          )}

          <View style={{ marginTop: isModern ? 0 : 8, marginLeft: isModern ? 0 : 0, alignItems: isModern ? 'flex-start' : 'center' }}>
            {design.message ? (
              <Text style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: style.accentColor, marginBottom: 4 }}>
                {design.message}
              </Text>
            ) : null}

            <Text style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', color: style.nameColor, marginBottom: 4, textAlign: isModern ? 'left' : 'center' }}>
              {design.deceasedName || 'Deceased Name'}
            </Text>

            {(design.dateOfBirth || design.dateOfDeath) && (
              <Text style={{ fontSize: 8, color: style.textColor, marginBottom: 4, textAlign: isModern ? 'left' : 'center' }}>
                {design.dateOfBirth && new Date(design.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                {design.dateOfBirth && design.dateOfDeath && ' — '}
                {design.dateOfDeath && new Date(design.dateOfDeath).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            )}

            {/* Divider */}
            <View style={[pdfStyles.divider, { justifyContent: isModern ? 'flex-start' : 'center' }]}>
              <View style={[pdfStyles.dividerLine, { backgroundColor: style.accentColor }]} />
              <View style={[pdfStyles.dividerDot, { backgroundColor: style.accentColor }]} />
              <View style={[pdfStyles.dividerLine, { backgroundColor: style.accentColor }]} />
            </View>

            {design.familyName ? (
              <Text style={{ fontSize: 8, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', color: style.textColor, marginTop: 4, textAlign: isModern ? 'left' : 'center' }}>
                {design.familyName}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Kente bottom bar */}
        {style.kentePattern && (
          <View style={{ flexDirection: 'row', height: 12 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: i % 4 === 0 ? '#1A6B3C' : i % 4 === 1 ? '#D4A017' : i % 4 === 2 ? '#C83030' : '#D4A017',
                }}
              />
            ))}
          </View>
        )}
      </PdfPage>
    </Document>
  )
}

// ─── Saved Designs List ──────────────────────────────────────────────────────
function SavedDesignsList({ onClose, onLoadNotify }) {
  const { designs, loadDesign, deleteDesign } = useAsedaStore()

  if (designs.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No saved designs yet.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
      {designs.map(d => (
        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
          <button
            onClick={() => { loadDesign(d.id); onLoadNotify?.(d.deceasedName || 'Untitled'); onClose() }}
            className="flex-1 text-left"
          >
            <p className="text-sm font-medium text-foreground truncate">{d.deceasedName || 'Untitled'}</p>
            <p className="text-xs text-muted-foreground">
              {asedaTemplates[d.templateId]?.name || 'Unknown template'} &middot; {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : ''}
            </p>
          </button>
          <button
            onClick={() => deleteDesign(d.id)}
            className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AsedaEditorPage() {
  const { theme, toggleTheme } = useThemeStore()
  const { currentDesign, updateField, createDesign, updateDesign, resetDesign } = useAsedaStore()
  const { notify } = useNotification()
  const [showSaved, setShowSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('edit') // 'edit' | 'preview'
  const fileInputRef = useRef(null)

  // ─── Undo / Redo history ────────────────────────────────────────────────────
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)
  const prevDesignRef = useRef(null)

  // Push to history whenever currentDesign changes (but not from undo/redo)
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      prevDesignRef.current = currentDesign
      return
    }
    // Skip the very first render duplicate
    if (prevDesignRef.current && JSON.stringify(prevDesignRef.current) === JSON.stringify(currentDesign)) {
      return
    }
    prevDesignRef.current = currentDesign
    queueMicrotask(() => {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(JSON.parse(JSON.stringify(currentDesign)))
        // Keep a max of 50 entries
        if (newHistory.length > 50) newHistory.shift()
        return newHistory
      })
      setHistoryIndex(prev => {
        const next = prev + 1
        return next > 49 ? 49 : next
      })
    })
  }, [currentDesign]) // eslint-disable-line react-hooks/exhaustive-deps

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    isUndoRedoRef.current = true
    const prevIndex = historyIndex - 1
    setHistoryIndex(prevIndex)
    const prevState = history[prevIndex]
    // Restore each field from history snapshot
    Object.keys(prevState).forEach(key => {
      if (prevState[key] !== currentDesign[key]) {
        updateField(key, prevState[key])
      }
    })
  }, [canUndo, historyIndex, history, currentDesign, updateField])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    isUndoRedoRef.current = true
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    const nextState = history[nextIndex]
    Object.keys(nextState).forEach(key => {
      if (nextState[key] !== currentDesign[key]) {
        updateField(key, nextState[key])
      }
    })
  }, [canRedo, historyIndex, history, currentDesign, updateField])

  // ─── Dirty tracking & edit counter ──────────────────────────────────────────
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(currentDesign))
  const [, setEditsSinceSave] = useState(0)
  const [showBackupBanner, setShowBackupBanner] = useState(false)
  const [autoSaveLabel, setAutoSaveLabel] = useState('') // 'Saved' | 'Unsaved' | ''

  // Track dirty state and edit count
  useEffect(() => {
    const currentSnapshot = JSON.stringify(currentDesign)
    const dirty = currentSnapshot !== lastSavedSnapshot
    queueMicrotask(() => {
      setIsDirty(dirty)
      if (dirty) {
        setAutoSaveLabel('Unsaved')
        setEditsSinceSave(prev => {
          const next = prev + 1
          if (next >= 5) setShowBackupBanner(true)
          return next
        })
      }
    })
  }, [currentDesign]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save to localStorage every 30s if dirty ──────────────────────────
  const AUTO_SAVE_KEY = 'funeralpress_aseda_autosave'

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty) {
        try {
          localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(currentDesign))
          setAutoSaveLabel('Saved')
          // Revert to 'Unsaved' if further changes happen (handled by dirty effect above)
        } catch { /* ignore */ }
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [isDirty, currentDesign])

  // Save on unmount
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(currentDesign))
      } catch { /* ignore */ }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load autosave on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.deceasedName !== undefined) {
          // Only restore if current design is default (no id)
          if (!currentDesign.id) {
            Object.keys(parsed).forEach(key => updateField(key, parsed[key]))
            notify('Auto-saved draft restored', 'info')
          }
        }
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      updateField('photo', ev.target.result)
    }
    reader.readAsDataURL(file)
  }, [updateField])

  const handleSave = useCallback(() => {
    try {
      if (currentDesign.id) {
        updateDesign(currentDesign)
      } else {
        createDesign()
      }
      setLastSavedSnapshot(JSON.stringify(currentDesign))
      setEditsSinceSave(0)
      setShowBackupBanner(false)
      setAutoSaveLabel('Saved')
      // Clear autosave draft since we did a real save
      try { localStorage.removeItem(AUTO_SAVE_KEY) } catch { /* ignore */ }
      notify('Design saved successfully', 'success')
    } catch {
      notify('Failed to save design', 'error')
    }
  }, [currentDesign, updateDesign, createDesign, notify])

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase()
      // Ctrl+S — save
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+Shift+Z — redo (check before undo)
      if ((e.ctrlKey || e.metaKey) && key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
        return
      }
      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleUndo, handleRedo])

  const pdfFileName = `${(currentDesign.deceasedName || 'Aseda-Label').replace(/\s+/g, '-')}-Cloth-Label.pdf`

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageMeta
        title="Funeral Cloth Label Designer — Aseda Memorial Fabric Labels | FuneralPress"
        description="Design custom funeral cloth and aseda memorial fabric labels. Choose from beautiful templates, add photos and text, and download print-ready PDF labels."
        path="/aseda-editor"
      />

      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Palette size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Aseda Label Designer</span>
        </Link>
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={() => setShowSaved(true)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Saved Designs"
          >
            <FolderOpen size={18} />
          </button>
          <button
            onClick={handleSave}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Save Design (Ctrl+S)"
          >
            <Save size={18} />
          </button>

          {/* Auto-save indicator */}
          {autoSaveLabel && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              autoSaveLabel === 'Saved'
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
            }`}>
              {autoSaveLabel}
            </span>
          )}

          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Backup reminder banner */}
      {showBackupBanner && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <span>You have unsaved changes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded-md font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Save Now
            </button>
            <button
              onClick={() => setShowBackupBanner(false)}
              className="p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Saved designs modal */}
      {showSaved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSaved(false)}>
          <div className="bg-card rounded-lg border border-border shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Saved Designs</h3>
              <button onClick={() => setShowSaved(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <SavedDesignsList
              onClose={() => setShowSaved(false)}
              onLoadNotify={(name) => notify(`Design "${name}" loaded`, 'success')}
            />
          </div>
        </div>
      )}

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-border">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${activeTab === 'edit' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <PenLine size={14} className="inline mr-1" /> Edit
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${activeTab === 'preview' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          <Eye size={14} className="inline mr-1" /> Preview
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── Left: Form Panel ─────────────────────────────────────────── */}
        <div className={`lg:w-96 lg:border-r border-border overflow-y-auto ${activeTab === 'edit' ? 'block' : 'hidden lg:block'}`}>
          <div className="p-5 space-y-5">
            <div>
              <h2
                className="text-lg font-bold text-foreground mb-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Cloth Label Designer
              </h2>
              <p className="text-xs text-muted-foreground">
                Create custom aseda memorial fabric labels (6 x 4 inches).
              </p>
            </div>

            {/* Template selection */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(asedaTemplates).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => updateField('templateId', key)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      currentDesign.templateId === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">{tmpl.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Deceased Name</label>
                <input
                  type="text"
                  value={currentDesign.deceasedName}
                  onChange={e => updateField('deceasedName', e.target.value)}
                  placeholder="Full name of the deceased"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={currentDesign.dateOfBirth}
                    onChange={e => updateField('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Death</label>
                  <input
                    type="date"
                    value={currentDesign.dateOfDeath}
                    onChange={e => updateField('dateOfDeath', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Family Name</label>
                <input
                  type="text"
                  value={currentDesign.familyName}
                  onChange={e => updateField('familyName', e.target.value)}
                  placeholder="e.g. The Mensah Family"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Message / Slogan</label>
                <input
                  type="text"
                  value={currentDesign.message}
                  onChange={e => updateField('message', e.target.value)}
                  placeholder="In Loving Memory"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Photo */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 text-xs font-medium rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <ImageIcon size={14} />
                    {currentDesign.photo ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {currentDesign.photo && (
                    <button
                      onClick={() => updateField('photo', null)}
                      className="px-3 py-2 text-xs rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Background color */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Background Color Override</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentDesign.backgroundColor}
                    onChange={e => updateField('backgroundColor', e.target.value)}
                    className="w-10 h-8 rounded border border-border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">{currentDesign.backgroundColor}</span>
                  {currentDesign.backgroundColor !== '#FFFFFF' && (
                    <button
                      onClick={() => updateField('backgroundColor', '#FFFFFF')}
                      className="text-xs text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <button
                onClick={handleSave}
                className="w-full py-2.5 text-sm font-medium rounded-md text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#C9A84C' }}
              >
                <Save size={16} />
                {currentDesign.id ? 'Update Design' : 'Save Design'}
              </button>

              <PDFDownloadLink
                document={<AsedaPdfDocument design={currentDesign} />}
                fileName={pdfFileName}
                className="w-full"
              >
                {({ loading }) => (
                  <button
                    disabled={loading}
                    onClick={() => { if (!loading) notify('PDF download started', 'success') }}
                    className="w-full py-2.5 text-sm font-medium rounded-md border-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
                  >
                    <Download size={16} />
                    {loading ? 'Generating PDF...' : 'Download as PDF'}
                  </button>
                )}
              </PDFDownloadLink>

              <button
                onClick={resetDesign}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                New Design
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Preview Panel ────────────────────────────────────── */}
        <div className={`flex-1 overflow-y-auto ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
          <div className="p-6 flex flex-col items-center justify-center min-h-full">
            <p className="text-xs text-muted-foreground mb-4">Live Preview (6 x 4 inches)</p>
            {/* Preview container at 6:4 ratio */}
            <div
              className="w-full max-w-[576px] shadow-2xl rounded-lg overflow-hidden"
              style={{ aspectRatio: '6 / 4' }}
            >
              <div className="w-full h-full">
                <AsedaPreview design={currentDesign} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 text-center max-w-md">
              This preview shows the cloth label design. Download as PDF for print-ready output at 6 x 4 inches (standard fabric label size).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
