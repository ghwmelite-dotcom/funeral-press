import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Cloud, CloudOff, FolderOpen, Users, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

export default function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const isSyncing = useAuthStore((s) => s.isSyncing)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full hover:ring-2 hover:ring-primary/30 transition-all"
        title={user.name}
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        {isSyncing && (
          <Cloud size={12} className="text-primary animate-pulse absolute -bottom-0.5 -right-0.5" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSyncing ? (
                <>
                  <Cloud size={12} className="text-primary animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud size={12} className="text-emerald-500" />
                  <span>Cloud sync active</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => { setOpen(false); navigate('/my-designs') }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <FolderOpen size={14} />
            <span>My Designs</span>
          </button>

          {user.isPartner && (
            <button
              onClick={() => { setOpen(false); navigate('/partner-dashboard') }}
              className="w-full flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Users size={14} />
              <span>Partner Dashboard</span>
            </button>
          )}

          {user.isAdmin && (
            <button
              onClick={() => { setOpen(false); navigate('/admin') }}
              className="w-full flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Shield size={14} />
              <span>Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={() => { setOpen(false); logout() }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}
