import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'

// Telegram support channel. Replaces the previous WhatsApp help widget.
const TELEGRAM_URL = 'https://t.me/myfuneralpress'

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

export default function TelegramHelp() {
  const location = useLocation()
  const pathname = location.pathname

  const shouldHide = HIDDEN_PATTERNS.some((p) => pathname.includes(p))
  if (shouldHide) return null

  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Telegram"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-2 bg-[#229ED9] text-white text-xs font-medium rounded-full shadow-lg hover:bg-[#1B8ABF] transition-all hover:scale-105"
    >
      <Send size={16} />
      <span className="hidden sm:inline">Chat on Telegram</span>
    </a>
  )
}

export { TELEGRAM_URL }
