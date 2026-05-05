import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore.js'

/**
 * 4-step welcome tour. Shows once per user (server-persisted via
 * `users.onboarded_at`, with a localStorage backstop for offline/anon
 * fallback). Dismisses on Skip or Done; both persist via
 * `authStore.markOnboarded()`.
 *
 * Spec: docs/superpowers/specs/2026-04-02-worldclass-platform-enhancements-design.md
 *       § 3A "Onboarding Flow"
 */

const STEPS = [
  {
    title: 'Welcome to FuneralPress',
    body: "Let's take 30 seconds to show you around.",
    illustration: 'wave',
    glyph: '\u{1F44B}', // waving hand
  },
  {
    title: 'Choose a product',
    body: 'Brochures, posters, invitations, programmes, banners, memorial pages — pick one to start. You can switch any time.',
    illustration: 'grid',
    glyph: '\u{1F4CB}', // clipboard
  },
  {
    title: 'Pick a template',
    body: 'Browse beautiful, professional templates designed for Ghanaian funerals. Filter by tradition or style.',
    illustration: 'palette',
    glyph: '\u{1F3A8}', // artist palette
  },
  {
    title: 'Customize and export',
    body: 'Edit text, photos, and colors. Download as PDF or order professional prints delivered to your door.',
    illustration: 'download',
    glyph: '\u{1F4E5}', // inbox tray
  },
]

const STORAGE_KEY = 'fp-onboarded'

export function OnboardingTour() {
  const user = useAuthStore((s) => s.user)
  const markOnboarded = useAuthStore((s) => s.markOnboarded)
  const [visible, setVisible] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  // Show tour only when:
  //  - a user is logged in, AND
  //  - they have not been onboarded server-side (`onboarded_at` not set), AND
  //  - the localStorage backstop flag is not set on this device.
  useEffect(() => {
    if (!user) return
    if (user.onboarded_at) return
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return
    } catch {
      // localStorage may throw in private browsing — fall through and show.
    }
    // Defer slightly so the tour does not fight first-render layout.
    const t = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(t)
  }, [user])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // localStorage unavailable (private mode) — server flag still wins.
    }
    setVisible(false)
    if (typeof markOnboarded === 'function') {
      markOnboarded()
    }
  }

  const next = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
    >
      <div className="bg-background border border-border rounded-2xl p-8 w-full max-w-md shadow-lg text-center">
        <div className="text-6xl mb-4" aria-hidden="true">
          {step.glyph}
        </div>
        <h2 id="onb-title" className="text-xl font-semibold text-foreground mb-2">
          {step.title}
        </h2>
        <p className="text-muted-foreground mb-6">{step.body}</p>

        {/* Progress dots */}
        <div
          className="flex justify-center gap-1.5 mb-6"
          aria-label={`Step ${stepIdx + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === stepIdx ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour
