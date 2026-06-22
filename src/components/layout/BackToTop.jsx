import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

// Sleek floating "back to top" control. Appears once the page is scrolled past a
// screenful, sits above the Telegram help button (bottom-right) so the two never
// collide, and smooth-scrolls to the top (honouring prefers-reduced-motion).
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={`fixed right-4 sm:right-6 bottom-32 sm:bottom-[4.75rem] z-40 grid h-11 w-11 place-items-center rounded-full border border-primary/30 bg-card/90 text-primary shadow-lg backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp size={18} strokeWidth={2.25} />
    </button>
  )
}
