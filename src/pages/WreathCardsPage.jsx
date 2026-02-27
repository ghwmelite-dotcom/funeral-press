import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react'
import { downloadCardAsPdf } from '../utils/downloadQrPdf'

function usePortraitPrint() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@page { size: portrait; margin: 0; }'
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
}

const GOLD = '#C9A84C'
const DARK_GOLD = '#A6882F'
const BLACK = '#1A1A1A'
const CREAM = '#FDF8F0'

const cards = [
  {
    message: 'Farewell Aunty Joe!',
    from: 'Children & Grandchildren',
  },
  {
    message: 'Xedenyuie Sister Worla',
    from: 'Family',
  },
  {
    message: 'Rest Well!',
    from: 'Friends & Colleagues',
  },
]

function WreathCard({ message, from }) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '5/3',
      background: CREAM,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
      padding: '32px 24px',
    }}>
      {/* Outer border */}
      <div style={{
        position: 'absolute', inset: '8px',
        border: `2px solid ${GOLD}`,
        pointerEvents: 'none',
        zIndex: 2,
      }} />
      {/* Inner border */}
      <div style={{
        position: 'absolute', inset: '13px',
        border: `0.5px solid ${DARK_GOLD}`,
        pointerEvents: 'none',
        zIndex: 2,
        opacity: 0.4,
      }} />

      {/* Corner ornaments */}
      <Corner pos="top-left" />
      <Corner pos="top-right" />
      <Corner pos="bottom-left" />
      <Corner pos="bottom-right" />

      {/* Top divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '40px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '16px' }}>&#10013;</span>
        <div style={{ width: '40px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* Message */}
      <p style={{
        fontSize: 'clamp(24px, 4vw, 36px)',
        color: BLACK,
        textAlign: 'center',
        fontWeight: 600,
        fontStyle: 'italic',
        lineHeight: 1.3,
        letterSpacing: '0.02em',
        margin: '12px 0',
        padding: '0 16px',
      }}>
        {message}
      </p>

      {/* Ornamental divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
        <div style={{ width: '50px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '12px' }}>&#10022;</span>
        <div style={{ width: '50px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* From */}
      <p style={{
        fontSize: '13px',
        color: '#777',
        textTransform: 'uppercase',
        letterSpacing: '0.3em',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 500,
        marginTop: '4px',
      }}>
        — {from} —
      </p>
    </div>
  )
}

function Corner({ pos }) {
  const size = '16px'
  const offset = '6px'
  const style = {
    position: 'absolute',
    width: size,
    height: size,
    zIndex: 3,
    pointerEvents: 'none',
  }
  const line = { position: 'absolute', background: GOLD }

  if (pos === 'top-left') {
    Object.assign(style, { top: offset, left: offset })
    return (
      <div style={style}>
        <div style={{ ...line, top: 0, left: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, top: 0, left: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'top-right') {
    Object.assign(style, { top: offset, right: offset })
    return (
      <div style={style}>
        <div style={{ ...line, top: 0, right: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, top: 0, right: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'bottom-left') {
    Object.assign(style, { bottom: offset, left: offset })
    return (
      <div style={style}>
        <div style={{ ...line, bottom: 0, left: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, bottom: 0, left: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
  if (pos === 'bottom-right') {
    Object.assign(style, { bottom: offset, right: offset })
    return (
      <div style={style}>
        <div style={{ ...line, bottom: 0, right: 0, width: '100%', height: '2px' }} />
        <div style={{ ...line, bottom: 0, right: 0, width: '2px', height: '100%' }} />
      </div>
    )
  }
}

export default function WreathCardsPage() {
  usePortraitPrint()

  const cardRefs = useRef([])
  const [downloading, setDownloading] = useState(null)

  const handleDownload = useCallback(async (index) => {
    const el = cardRefs.current[index]
    if (!el) return
    setDownloading(index)
    try {
      const label = cards[index].from.replace(/\s+/g, '-')
      await downloadCardAsPdf(el, `Wreath-Card-${label}.pdf`)
    } finally {
      setDownloading(null)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header — hidden when printing */}
      <header className="print:hidden sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/editor">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Editor</Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">Wreath Cards</h1>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print All
          </Button>
        </div>
      </header>

      {/* Screen preview */}
      <div className="print:hidden max-w-xl mx-auto px-4 pb-16 space-y-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium pt-6">
          Preview — each card prints on its own full page
        </p>
        {cards.map((card, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{card.from}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(i)}
                disabled={downloading === i}
              >
                {downloading === i
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...</>
                  : <><Download className="w-3.5 h-3.5 mr-1" /> Download PDF</>
                }
              </Button>
            </div>
            <div className="rounded-xl shadow-xl overflow-hidden border border-border">
              <WreathCard {...card} />
            </div>
          </div>
        ))}
      </div>

      {/* Print area — each card on its own page */}
      <div className="hidden print:block">
        {cards.map((card, i) => (
          <div key={i} className="wreath-print-page flex items-center justify-center" style={{ minHeight: '100vh', background: '#fff', padding: '40px' }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <WreathCard {...card} />
            </div>
          </div>
        ))}
      </div>

      {/* Off-screen full-size cards for PDF capture — absolute inside a clipped wrapper */}
      <div className="print:hidden" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {cards.map((card, i) => (
          <div
            key={`capture-${i}`}
            ref={(el) => { cardRefs.current[i] = el }}
            style={{ width: '794px', height: '1123px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM, padding: '60px' }}
          >
            <div style={{ width: '100%' }}>
              <WreathCard {...card} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
