import BrochureMockup from './BrochureMockup'
import { themes } from '../../utils/themes'

export default function ThemePreviewCard({ themeKey, onClick }) {
  const t = themes[themeKey]
  if (!t) return null

  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 text-left w-full"
    >
      {/* Scaled brochure preview */}
      <div className="p-4 pb-3 flex items-center justify-center">
        <div className="w-full max-w-[180px] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-border/50">
          <BrochureMockup themeKey={themeKey} className="text-[8px]" />
        </div>
      </div>

      {/* Theme info */}
      <div className="px-4 pb-4">
        {/* Color palette dots */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60"
            style={{ backgroundColor: t.pageBg }}
            title="Background"
          />
          <span
            className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60"
            style={{ backgroundColor: t.heading }}
            title="Heading"
          />
          <span
            className="w-3.5 h-3.5 rounded-full border border-muted-foreground/60"
            style={{ backgroundColor: t.border }}
            title="Accent"
          />
        </div>

        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {t.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.description}
        </p>
      </div>
    </button>
  )
}
