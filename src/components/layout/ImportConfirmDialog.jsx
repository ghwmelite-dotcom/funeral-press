import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { AlertTriangle } from 'lucide-react'

export default function ImportConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-primary" />
            Import Brochure Data
          </DialogTitle>
          <DialogDescription>
            This will replace your current brochure content. A backup will be saved automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md">Cancel</button>
          <button onClick={() => { onConfirm(); onOpenChange(false) }} className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-md">Import</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
