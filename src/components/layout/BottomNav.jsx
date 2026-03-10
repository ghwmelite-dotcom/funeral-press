import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, FolderOpen, BookOpen, Plus, X, FileText, Image, Mail, BookOpenCheck, Flag, Gift, BookHeart, Scroll, Camera, Shirt, Calendar } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const HIDDEN_PATTERNS = [
  'editor',
  '/collage-maker',
  '/preview',
  '/slideshow',
  '/live-service',
  '/programme',
  '/flipbook',
  '/memorial',
]

const CREATE_PRODUCTS = [
  { label: 'Brochure', path: '/editor', icon: FileText },
  { label: 'Poster', path: '/poster-editor', icon: Image },
  { label: 'Invitation', path: '/invitation-editor', icon: Mail },
  { label: 'Booklet', path: '/booklet-editor', icon: BookOpenCheck },
  { label: 'Banner', path: '/banner-editor', icon: Flag },
  { label: 'Thank You', path: '/thankyou-editor', icon: Gift },
  { label: 'Guest Book', path: '/guest-book-creator', icon: BookHeart },
  { label: 'Obituary', path: '/obituary-creator', icon: Scroll },
  { label: 'Gallery', path: '/gallery-creator', icon: Camera },
  { label: 'Aseda Label', path: '/aseda-editor', icon: Shirt },
  { label: 'One-Week', path: '/oneweek-editor', icon: Calendar },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn())
  const [createOpen, setCreateOpen] = useState(false)

  // Hide if not logged in
  if (!isLoggedIn) return null

  // Hide on editor/special pages
  const pathname = location.pathname
  const shouldHide = HIDDEN_PATTERNS.some((pattern) => pathname.includes(pattern))
  if (shouldHide) return null

  const tabs = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'My Designs', icon: FolderOpen, path: '/my-designs' },
    { label: 'Guides', icon: BookOpen, path: '/blog' },
  ]

  const isActive = (path) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Create sheet overlay */}
      {createOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setCreateOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Bottom sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-sm font-semibold text-foreground">Create New Design</span>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {CREATE_PRODUCTS.map((product) => (
                <button
                  key={product.path}
                  onClick={() => {
                    setCreateOpen(false)
                    navigate(product.path)
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <product.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-foreground font-medium">{product.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border sm:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </button>
            )
          })}

          {/* Create button */}
          <button
            onClick={() => setCreateOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              createOpen ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Create</span>
          </button>
        </div>
      </nav>
    </>
  )
}
