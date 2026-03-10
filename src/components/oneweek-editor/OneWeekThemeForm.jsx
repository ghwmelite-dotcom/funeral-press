import { useOneWeekStore } from '../../stores/oneWeekStore'
import { oneWeekThemes } from '../../utils/oneWeekDefaultData'

export default function OneWeekThemeForm() {
  const store = useOneWeekStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Invitation Text</label>
        <input type="text" value={store.invitationText} onChange={(e) => store.updateField('invitationText', e.target.value)} className={inputClass} />
      </div>

      {/* Theme Selector */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Poster Theme</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(oneWeekThemes).map(([key, t]) => (
            <button
              key={key}
              onClick={() => store.updateField('theme', key)}
              className={`p-3 rounded-lg border text-left transition-all ${
                store.theme === key
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-input bg-card hover:border-muted-foreground'
              }`}
            >
              <div className="flex gap-1 mb-1.5">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.headerBg, border: '1px solid #444' }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.detailsBg, border: '1px solid #444' }} />
              </div>
              <div className="text-xs font-medium text-card-foreground">{t.name}</div>
              <div className="text-[10px] text-muted-foreground">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
