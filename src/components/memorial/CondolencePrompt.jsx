// Post-condolence pathway (spec §2.3): shown once per visitor per guest book,
// right after they sign — the highest-intent moment in the loop. Inline, soft,
// dismissible. Never shown to logged-in users (the page handles that check).
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { recordLoopEvent, captureLoopSurface } from '../../utils/loopAnalytics'

const STORAGE_PREFIX = 'fp-condolence-prompt-'

export function hasSeenCondolencePrompt(slug) {
  try { return !!localStorage.getItem(STORAGE_PREFIX + slug) } catch { return false }
}

export function markCondolencePromptSeen(slug) {
  try { localStorage.setItem(STORAGE_PREFIX + slug, '1') } catch { /* ignore */ }
}

export default function CondolencePrompt({ slug, deceasedFirstName, onDismiss }) {
  return (
    <div className="mt-4 bg-[#1a1a1a] border border-[#C9A84C]/20 rounded-lg px-4 py-3 flex items-start gap-3">
      <p className="text-xs text-[#999] leading-relaxed flex-1">
        Thank you for honouring {deceasedFirstName}. If you ever need to celebrate a life,{' '}
        <Link
          to="/honour?from=post_condolence"
          onClick={() => {
            captureLoopSurface('post_condolence')
            recordLoopEvent('loop_click', 'post_condolence', { slug })
          }}
          className="text-[#C9A84C] hover:underline"
        >
          FuneralPress is here
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-[#555] hover:text-[#999] shrink-0 p-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}
