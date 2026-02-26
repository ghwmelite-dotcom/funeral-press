import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { useBrochureStore } from '../../stores/brochureStore'
import { Trash2, RotateCcw } from 'lucide-react'

export default function VersionsDialog({ open, onOpenChange }) {
  const snapshots = useBrochureStore(s => s.snapshots)
  const restoreSnapshot = useBrochureStore(s => s.restoreSnapshot)
  const deleteSnapshot = useBrochureStore(s => s.deleteSnapshot)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>Restore a previous version of your brochure.</DialogDescription>
        </DialogHeader>
        {(!snapshots || snapshots.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">No saved versions yet. Versions are created automatically before imports.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div>
                  <p className="text-sm text-card-foreground">{snap.label}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(snap.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { restoreSnapshot(snap.id); onOpenChange(false) }} className="p-2.5 text-muted-foreground hover:text-primary transition-colors" title="Restore">
                    <RotateCcw size={14} />
                  </button>
                  <button onClick={() => deleteSnapshot(snap.id)} className="p-2.5 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
