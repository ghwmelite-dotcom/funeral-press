import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import { defaultScriptures } from '../../utils/defaultData'
import { scriptureCategories, additionalScriptures, getAllScriptures } from '../../utils/templates'
import { BookOpen, Check } from 'lucide-react'

const allScriptures = { ...defaultScriptures, ...additionalScriptures }

export default function ScriptureForm() {
  const store = useBrochureStore()
  const [activeTab, setActiveTab] = useState(() => {
    // Determine initial tab from current selection
    if (store.scriptureKey === 'custom') return 'custom'
    for (const [catKey, cat] of Object.entries(scriptureCategories)) {
      if (cat.scriptures.includes(store.scriptureKey)) return catKey
    }
    return 'comfort'
  })

  const handleSelect = (key) => {
    store.updateField('scriptureKey', key)
  }

  const categoryTabs = [
    ...Object.entries(scriptureCategories).map(([key, cat]) => ({ key, label: cat.name })),
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Scripture Category</label>
        <div className="flex gap-1 flex-wrap">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'custom') {
                  store.updateField('scriptureKey', 'custom')
                }
              }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scripture cards for selected category */}
      {activeTab !== 'custom' && scriptureCategories[activeTab] && (
        <div className="space-y-2">
          {scriptureCategories[activeTab].scriptures.map((key) => {
            const scripture = allScriptures[key]
            if (!scripture) return null
            const isSelected = store.scriptureKey === key
            const firstLine = scripture.text.split('\n\n')[0]
            const preview = firstLine.length > 120 ? firstLine.slice(0, 120) + '...' : firstLine

            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-input hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <BookOpen size={13} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {scripture.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">{scripture.subtitle}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5 leading-relaxed italic">
                      {preview}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={16} className="text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Custom scripture */}
      {activeTab === 'custom' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Custom Scripture Text</label>
          <textarea
            value={store.customScripture}
            onChange={(e) => store.updateField('customScripture', e.target.value)}
            rows={10}
            className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Enter custom scripture text..."
          />
        </div>
      )}

      {/* Additional verse */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Additional Verse (bottom of page)</label>
        <textarea
          value={store.additionalVerse}
          onChange={(e) => store.updateField('additionalVerse', e.target.value)}
          rows={4}
          className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>
    </div>
  )
}
