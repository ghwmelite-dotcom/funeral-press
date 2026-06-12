import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { SignInPopover } from '../auth/SignInPopover'
import UserMenu from '../auth/UserMenu'
import { KenteBand } from '../ceremonial'

// Persistent header for the homepage and content/browse surfaces so the brand +
// controls stay visible while scrolling. NOT shown on editors (own toolbars),
// full-screen views, dashboards, or immersive tribute pages. The homepage is
// matched exactly ('/'), not via SHOW_PREFIXES, because every path
// startsWith('/') and would otherwise match every route.
//
// On the homepage the header overlays the cinematic dark hero: transparent with
// light controls at the top, fading to a solid themed bar once scrolled past it.
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
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) return undefined
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const show = isHome || SHOW_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (!show) return null

  // Transparent overlay only while at the top of the homepage (over the hero).
  const transparent = isHome && !scrolled
  // Use white chrome only when the hero underneath is dark (dark mode).
  const onDarkHero = transparent && theme === 'dark'

  const position = isHome ? 'fixed inset-x-0' : 'sticky'
  const skin = transparent
    ? 'border-transparent bg-transparent'
    : 'border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'

  return (
    <header
      data-testid="site-header"
      className={`${position} top-0 z-40 h-14 border-b transition-colors duration-300 ${skin}`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className={`flex items-center gap-2 transition-opacity hover:opacity-80 ${onDarkHero ? 'text-white' : 'text-foreground'}`}
          aria-label="FuneralPress home"
        >
          <BookOpen size={20} className={onDarkHero ? '' : 'text-primary'} style={onDarkHero ? { color: 'var(--ceremonial-gold)' } : undefined} />
          <span className="text-base font-semibold tracking-wide">FuneralPress</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`rounded-full p-2 transition-colors ${onDarkHero ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? <UserMenu onDark={onDarkHero} /> : <SignInPopover onDark={onDarkHero} />}
        </div>
      </div>
      {!transparent && <KenteBand size="page" />}
    </header>
  )
}
