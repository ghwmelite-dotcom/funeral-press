import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { SignInPopover } from '../auth/SignInPopover'
import UserMenu from '../auth/UserMenu'

// Persistent sticky header for the content/browse surfaces so the brand +
// controls stay visible while scrolling. Deliberately NOT shown on the landing
// page (own hero + fixed controls), editors (own toolbars), full-screen views,
// dashboards, or immersive tribute pages — only the marketing/content routes
// users browse through.
const SHOW_PREFIXES = [
  '/blog',
  '/hymns',
  '/venues',
  '/themes',
  '/funeral-services',
  '/funeral-brochure-templates',
  '/funeral-poster-templates',
  '/funeral-invitation-templates',
  '/funeral-booklet-templates',
  '/funeral-brochure-designer',
  '/funeral-poster-maker',
  '/memorial-page-creator',
  '/funeral-programme-booklet',
  '/privacy',
]

export default function SiteHeader() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)

  const show = SHOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!show) return null

  return (
    <header data-testid="site-header" className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label="FuneralPress home"
        >
          <BookOpen size={20} className="text-primary" />
          <span className="text-base font-semibold tracking-wide">FuneralPress</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? <UserMenu /> : <SignInPopover />}
        </div>
      </div>
    </header>
  )
}
