import { useState } from 'react'
import { Music, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { hymns, hymnCategories, getHymnsByCategory } from '../../utils/hymnCatalog'

export default function HymnCatalogDialog({ open, onOpenChange, onSelect }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = getHymnsByCategory(category).filter(
    (h) =>
      !search ||
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.firstLine.toLowerCase().includes(search.toLowerCase()) ||
      h.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Hymns</DialogTitle>
          <DialogDescription>Select a hymn to add to the order of service.</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hymns..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setCategory('all')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              category === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {Object.entries(hymnCategories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                category === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Hymn list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.map((hymn) => (
            <button
              key={hymn.id}
              onClick={() => {
                onSelect(hymn)
                onOpenChange(false)
              }}
              className="w-full text-left p-3 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Music size={14} className="text-primary/60 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{hymn.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {hymn.author} &middot; {hymn.firstLine}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hymns found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
