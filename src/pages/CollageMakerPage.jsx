import { Link } from 'react-router-dom'
import { Grid3X3, Save, Sun, Moon } from 'lucide-react'
import { useCollageStore } from '../stores/collageStore'
import { useThemeStore } from '../stores/themeStore'
import { useNotification } from '../components/ui/notification'
import { useMediaQuery } from '../hooks/useMediaQuery'
import CollageCanvas from '../components/collage/CollageCanvas'
import CollageToolbar from '../components/collage/CollageToolbar'
import CollageExport from '../components/collage/CollageExport'
import CollageTemplatePicker from '../components/collage/CollageTemplatePicker'

export default function CollageMakerPage() {
  const store = useCollageStore()
  const { theme, toggleTheme } = useThemeStore()
  const { notify } = useNotification()
  const isMobile = useMediaQuery('(max-width: 1023px)')

  const handleSave = () => {
    store.saveCollage()
    notify('Collage saved!', 'success')
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Grid3X3 size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Collage Maker</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <CollageExport />
          {store.isDirty && <span className="text-[10px] text-primary ml-1">Unsaved</span>}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar */}
        <div className="w-full lg:w-[320px] max-h-[40vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-border overflow-y-auto bg-background p-4 space-y-6">
          {/* Name + dates */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name</label>
              <input
                type="text"
                value={store.name}
                onChange={(e) => store.updateField('name', e.target.value)}
                placeholder="Name of deceased"
                className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Dates</label>
              <input
                type="text"
                value={store.dates}
                onChange={(e) => store.updateField('dates', e.target.value)}
                placeholder="e.g. 1945 — 2024"
                className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <CollageTemplatePicker />
          <CollageToolbar />
        </div>

        {/* Right: canvas */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-auto bg-card">
          <CollageCanvas />
        </div>
      </div>
    </div>
  )
}
