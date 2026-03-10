import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Cloud, FolderOpen, Users, Shield, BookOpen } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { haptic } from '../../hooks/useHaptic'

export default function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const isSyncing = useAuthStore((s) => s.isSyncing)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  if (!user) return null

  const navLinks = [
    { label: 'My Designs', path: '/my-designs', icon: FolderOpen, show: true },
    { label: 'Guides', path: '/blog', icon: BookOpen, show: true, highlight: true },
    { label: 'Partner', path: '/partner-dashboard', icon: Users, show: user.isPartner },
    { label: 'Admin', path: '/admin', icon: Shield, show: user.isAdmin },
  ].filter(l => l.show)

  return (
    <div className="flex items-center gap-1" ref={ref}>
      {/* Visible nav links on desktop */}
      <nav className="hidden sm:flex items-center gap-0.5 mr-1">
        {navLinks.map(({ label, path, icon: Icon, highlight }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : highlight
                    ? 'text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          onClick={() => { haptic('light'); setOpen(!open) }}
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

            {/* Mobile-only nav links (hidden on desktop since they're in the header) */}
            <div className="sm:hidden">
              {navLinks.map(({ label, path, icon: Icon, highlight }) => {
                const active = location.pathname === path || location.pathname.startsWith(path + '/')
                return (
                  <button
                    key={path}
                    onClick={() => { setOpen(false); navigate(path) }}
                    className={`w-full flex items-center gap-2 px-3 py-3 text-sm transition-colors ${
                      active
                        ? 'text-primary bg-primary/5 font-medium'
                        : highlight
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    {highlight && !active && <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">New</span>}
                  </button>
                )
              })}
            </div>

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
    </div>
  )
}
