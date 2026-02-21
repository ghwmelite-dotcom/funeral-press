import { useState } from 'react'
import { useBrochureStore } from '../../stores/brochureStore'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Music } from 'lucide-react'
import HymnCatalogDialog from './HymnCatalogDialog'

export default function OrderOfServiceForm() {
  const store = useBrochureStore()
  const { orderOfService } = store
  const [hymnDialogOpen, setHymnDialogOpen] = useState(false)
  const [hymnTargetSection, setHymnTargetSection] = useState('churchService')

  const handleOpenHymnDialog = (section) => {
    setHymnTargetSection(section)
    setHymnDialogOpen(true)
  }

  const handleHymnSelect = (hymn) => {
    const state = store
    const items = [...state.orderOfService[hymnTargetSection]]
    items.push({ time: '', description: `Hymn — ${hymn.title}` })
    store.updateField('orderOfService', {
      ...state.orderOfService,
      [hymnTargetSection]: items,
    })
  }

  return (
    <div className="space-y-6">
      {/* Church Service */}
      <ServiceSection
        title="Part One — Church Service"
        subtitle="8:30 AM — 12:00 PM"
        items={orderOfService.churchService}
        section="churchService"
        store={store}
        onBrowseHymns={handleOpenHymnDialog}
      />

      {/* Private Burial */}
      <ServiceSection
        title="Part Two — Private Burial"
        subtitle={store.burialLocation || ''}
        items={orderOfService.privateBurial}
        section="privateBurial"
        store={store}
        onBrowseHymns={handleOpenHymnDialog}
      />

      {/* Hymn catalog dialog */}
      <HymnCatalogDialog
        open={hymnDialogOpen}
        onOpenChange={setHymnDialogOpen}
        onSelect={handleHymnSelect}
      />
    </div>
  )
}

function ServiceSection({ title, subtitle, items, section, store, onBrowseHymns }) {
  return (
    <div>
      <div className="mb-3">
        <h4 className="text-xs font-medium text-primary uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start group">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => i > 0 && store.moveServiceItem(section, i, i - 1)}
                disabled={i === 0}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                aria-label="Move item up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={() => i < items.length - 1 && store.moveServiceItem(section, i, i + 1)}
                disabled={i === items.length - 1}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                aria-label="Move item down"
              >
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <input
                type="text"
                value={item.time}
                onChange={(e) => store.updateServiceItem(section, i, 'time', e.target.value)}
                placeholder="Time"
                className="w-full sm:w-24 bg-card border border-input rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="text"
                value={item.description}
                onChange={(e) => store.updateServiceItem(section, i, 'description', e.target.value)}
                placeholder="Description"
                className="flex-1 bg-card border border-input rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => store.removeServiceItem(section, i)}
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 text-muted-foreground/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Remove item"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={() => store.addServiceItem(section)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors"
        >
          <Plus size={14} /> Add Item
        </button>
        <button
          onClick={() => onBrowseHymns(section)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Music size={14} /> Browse Hymns
        </button>
      </div>
    </div>
  )
}
