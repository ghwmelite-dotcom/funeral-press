import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { getLocalDesignCounts, migrateLocalToCloud } from '../../utils/syncEngine'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'

const PRODUCT_LABELS = {
  brochure: 'Brochures',
  poster: 'Posters',
  invitation: 'Invitations',
  thankYou: 'Thank You Cards',
  booklet: 'Booklets',
  banner: 'Banners',
  budget: 'Budgets',
  collage: 'Collages',
  reminder: 'Reminders',
}

export default function MigrationDialog() {
  const user = useAuthStore((s) => s.user)
  const hasMigrated = useAuthStore((s) => s.hasMigrated)
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user || hasMigrated) return
    const { counts: c, total: t } = getLocalDesignCounts()
    if (t > 0) {
      queueMicrotask(() => {
        setCounts(c)
        setTotal(t)
        setOpen(true)
      })
    } else {
      // No local designs, mark as migrated
      useAuthStore.getState().setMigrated()
    }
  }, [user, hasMigrated])

  const handleMigrate = async () => {
    setMigrating(true)
    setProgress(0)
    try {
      await migrateLocalToCloud((p) => setProgress(p))
      setDone(true)
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      console.error('[migrate] Migration failed:', err)
      setMigrating(false)
    }
  }

  const handleSkip = () => {
    useAuthStore.getState().setMigrated()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!migrating) setOpen(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {done ? 'Migration Complete' : 'Sync Your Designs to the Cloud'}
          </DialogTitle>
          <DialogDescription>
            {done
              ? 'All your designs have been synced to your account.'
              : 'We found designs saved on this device. Would you like to sync them to your account so you can access them anywhere?'}
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 space-y-1.5">
              {Object.entries(counts).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{PRODUCT_LABELS[type] || type}</span>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1.5 border-t border-border">
                <span className="text-foreground font-medium">Total</span>
                <span className="text-primary font-semibold">{total}</span>
              </div>
            </div>

            {migrating && (
              <div className="space-y-1.5">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (progress / total) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Syncing {progress} of {total} designs...
                </p>
              </div>
            )}

            {!migrating && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleMigrate}
                  className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sync to Cloud
                </button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="text-center py-2">
            <div className="text-emerald-500 text-2xl mb-1">&#10003;</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
