// Loop landing page (spec §2.2): the destination for every memorial-surface
// pathway. Meets visitors in mourning context — never a generic sales page.
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, BookOpen, FileText, ArrowRight } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'
import { recordLoopEvent, captureLoopSurface, LOOP_SURFACES } from '../utils/loopAnalytics'
import { useThemeStore } from '../stores/themeStore'
import { AuroraField, AdinkraMark, KenteBand } from '../components/ceremonial'

const PATHWAYS = [
  {
    to: '/memorial-page-creator',
    icon: Heart,
    title: 'Create a memorial page',
    body: 'A lasting online tribute with photos, their story, and a place for friends and family to leave messages — shareable on WhatsApp.',
  },
  {
    to: '/funeral-brochure-designer',
    icon: FileText,
    title: 'Design a funeral programme',
    body: 'Beautiful, print-ready funeral brochures in minutes. Choose a theme, add their photo and story, and download.',
  },
  {
    to: '/guest-book-creator',
    icon: BookOpen,
    title: 'Open a digital guest book',
    body: 'Collect condolence messages from everyone who loved them, wherever in the world they are.',
  },
]

export default function HonourPage() {
  const [searchParams] = useSearchParams()
  const { theme } = useThemeStore()

  useEffect(() => {
    const from = searchParams.get('from')
    if (from && LOOP_SURFACES.includes(from)) {
      captureLoopSurface(from)
      recordLoopEvent('loop_landing', from)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Honour Someone You've Lost | FuneralPress"
        description="Create a memorial page, funeral programme, or digital guest book for your loved one. Families across Ghana and beyond celebrate lives with dignity on FuneralPress."
        path="/honour"
      />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <AuroraField mist={theme === 'light'} twinkles={3} />
        <AdinkraMark
          symbol="gyenyame"
          variant="watermark"
          className="absolute right-[-40px] top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <div className="relative max-w-2xl mx-auto px-4 pt-16 pb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <Heart size={20} className="text-primary" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Honour someone you've lost
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            When words feel impossible, a tribute helps. Families across Ghana and
            beyond use FuneralPress to celebrate the lives of those they love —
            gently, beautifully, and in minutes.
          </p>
        </div>
      </div>
      <KenteBand size="page" />

      {/* Pathways */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-12 space-y-4">
        {PATHWAYS.map(({ to, icon: Icon, title, body }) => (
          <Link
            key={to}
            to={to}
            className="group overflow-hidden flex flex-col bg-card border border-border rounded-xl hover:border-primary/40 transition-colors"
          >
            <KenteBand size="card" />
            <div className="flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-2">
                  {title}
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quiet secondary */}
      <div className="max-w-2xl mx-auto px-4 pb-16 text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          See everything FuneralPress offers
        </Link>
      </div>
    </div>
  )
}
