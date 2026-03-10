import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

const WHATSAPP_URL = 'https://chat.whatsapp.com/EbJjUflYBNUKDvkgqLiey8'

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

export default function WhatsAppHelp() {
  const location = useLocation()
  const pathname = location.pathname

  const shouldHide = HIDDEN_PATTERNS.some((p) => pathname.includes(p))
  if (shouldHide) return null

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-2 bg-[#25D366] text-white text-xs font-medium rounded-full shadow-lg hover:bg-[#20BD5A] transition-all hover:scale-105"
    >
      <MessageCircle size={16} />
      <span className="hidden sm:inline">Need help?</span>
    </a>
  )
}

export { WHATSAPP_URL }
