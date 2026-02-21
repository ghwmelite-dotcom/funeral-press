import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { themes } from '../../utils/themes'
import { CornerDiamond, CrossSymbol, OrnamentalDivider, TripleDot } from './BrochureMockup'

const PAGE_LABELS = ['Cover', 'Order of Service', 'Tribute', 'Back Cover']

// Shared page wrapper with triple borders and corner diamonds
function MockupPageFrame({ theme, children }) {
  return (
    <div
      style={{
        aspectRatio: '3 / 4',
        backgroundColor: theme.pageBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        width: '100%',
        maxWidth: 380,
        margin: '0 auto',
        borderRadius: 4,
      }}
    >
      {/* Outer bold border */}
      <div
        style={{
          position: 'absolute',
          top: '3%', left: '3%', right: '3%', bottom: '3%',
          border: `2px solid ${theme.border}`,
          pointerEvents: 'none',
        }}
      />
      {/* Middle thin border */}
      <div
        style={{
          position: 'absolute',
          top: '4.2%', left: '4.2%', right: '4.2%', bottom: '4.2%',
          border: `0.5px solid ${theme.border}`,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      {/* Inner bold border */}
      <div
        style={{
          position: 'absolute',
          top: '5%', left: '5%', right: '5%', bottom: '5%',
          border: `1px solid ${theme.border}`,
          pointerEvents: 'none',
        }}
      />

      {/* Corner diamonds */}
      <CornerDiamond color={theme.border} style={{ top: '2.4%', left: '2.4%' }} />
      <CornerDiamond color={theme.border} style={{ top: '2.4%', right: '2.4%' }} />
      <CornerDiamond color={theme.border} style={{ bottom: '2.4%', left: '2.4%' }} />
      <CornerDiamond color={theme.border} style={{ bottom: '2.4%', right: '2.4%' }} />

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          top: '8%', left: '8%', right: '8%', bottom: '8%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Page 1: Cover
function CoverMockup({ theme }) {
  return (
    <MockupPageFrame theme={theme}>
      <CrossSymbol color={theme.heading} size={18} />
      <div style={{ color: theme.heading, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '4%', fontWeight: 700 }}>
        Celebration of Life
      </div>
      <div style={{ color: theme.subtleText, fontSize: 10, fontStyle: 'italic', marginTop: '2%', fontFamily: "'EB Garamond', Georgia, serif" }}>
        In Loving Memory of
      </div>
      <div style={{ width: '60%', margin: '4% 0' }}>
        <OrnamentalDivider color={theme.border} width="100%" />
      </div>
      <div style={{
        width: '38%', aspectRatio: '9/11', borderRadius: '50%',
        border: `2px solid ${theme.border}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.placeholderBg,
      }}>
        <CrossSymbol color={theme.subtleText} size={20} />
      </div>
      <div style={{ color: theme.heading, fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4%' }}>
        JOHN DOE
      </div>
      <div style={{ margin: '3% 0' }}>
        <TripleDot color={theme.border} />
      </div>
      <div style={{ color: theme.subtleText, fontSize: 9, letterSpacing: '0.1em', fontFamily: "'EB Garamond', Georgia, serif" }}>
        Sunrise &middot; March 5, 1948
      </div>
      <div style={{ color: theme.subtleText, fontSize: 9, letterSpacing: '0.1em', marginTop: 2, fontFamily: "'EB Garamond', Georgia, serif" }}>
        Sunset &middot; January 12, 2025
      </div>
      <div style={{ width: '50%', margin: '3% 0' }}>
        <OrnamentalDivider color={theme.border} width="100%" />
      </div>
    </MockupPageFrame>
  )
}

// Page 2: Order of Service
function OrderOfServiceMockup({ theme }) {
  const items = [
    { time: '10:00 AM', desc: 'Processional Hymn' },
    { time: '10:10 AM', desc: 'Opening Prayer' },
    { time: '10:20 AM', desc: 'Scripture Reading — Psalm 23' },
    { time: '10:30 AM', desc: 'Musical Selection' },
    { time: '10:40 AM', desc: 'Eulogy' },
    { time: '11:00 AM', desc: 'Tributes from Family & Friends' },
    { time: '11:20 AM', desc: 'Closing Prayer & Benediction' },
    { time: '11:30 AM', desc: 'Recessional' },
  ]

  return (
    <MockupPageFrame theme={theme}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <CrossSymbol color={theme.heading} size={16} />
        <div style={{ color: theme.heading, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6, fontWeight: 700 }}>
          Order of Service
        </div>
        <div style={{ color: theme.subtleText, fontSize: 9, fontStyle: 'italic', marginTop: 4, fontFamily: "'EB Garamond', Georgia, serif" }}>
          Grace Community Church
        </div>
        <div style={{ width: '55%', margin: '8px 0' }}>
          <OrnamentalDivider color={theme.border} width="100%" />
        </div>
        <div style={{ color: theme.heading, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
          Part One — Church Service
        </div>
        <div style={{ width: '100%', flex: 1 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '4px 0',
                borderBottom: `0.5px solid ${theme.border}33`,
                alignItems: 'baseline',
              }}
            >
              <div style={{ color: theme.heading, fontSize: 9, fontWeight: 700, width: 65, flexShrink: 0 }}>
                {item.time}
              </div>
              <div style={{ color: theme.subtleText, fontSize: 9, flex: 1, fontFamily: "'EB Garamond', Georgia, serif" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: theme.subtleText, fontSize: 8, letterSpacing: '0.15em', marginTop: 4 }}>
          2
        </div>
      </div>
    </MockupPageFrame>
  )
}

// Page 3: Tribute
function TributeMockup({ theme }) {
  return (
    <MockupPageFrame theme={theme}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <CrossSymbol color={theme.heading} size={14} />
        <div style={{ color: theme.heading, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6, fontWeight: 700 }}>
          A Life Well Lived
        </div>
        <div style={{ color: theme.subtleText, fontSize: 9, fontStyle: 'italic', marginTop: 4, fontFamily: "'EB Garamond', Georgia, serif" }}>
          Written by the Family
        </div>
        <div style={{ width: '50%', margin: '8px 0' }}>
          <OrnamentalDivider color={theme.border} width="100%" />
        </div>
        <div style={{
          color: theme.subtleText, fontSize: 9, fontStyle: 'italic', textAlign: 'center',
          maxWidth: '85%', lineHeight: 1.6, marginBottom: 8,
          fontFamily: "'EB Garamond', Georgia, serif",
        }}>
          "The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures."
        </div>
        <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'John was born on March 5, 1948 in a small town filled with warmth and community. From his earliest years, he showed a kindness that would define his entire life.',
            'He dedicated over thirty years to teaching, touching the lives of countless students who would go on to remember his patience and wisdom.',
            'A devoted father and grandfather, John found his greatest joy in the simple moments spent with family around the dinner table.',
            'His legacy of love, faith, and service will continue to inspire all who were fortunate enough to know him.',
          ].map((para, i) => (
            <div key={i} style={{
              color: theme.bodyText, fontSize: 8.5, lineHeight: 1.7, textAlign: 'justify',
              fontFamily: "'EB Garamond', Georgia, serif",
            }}>
              {para}
            </div>
          ))}
        </div>
        <div style={{ width: '40%', margin: '6px 0' }}>
          <OrnamentalDivider color={theme.border} width="100%" />
        </div>
        <div style={{ color: theme.heading, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
          Forever in Our Hearts
        </div>
        <div style={{ color: theme.subtleText, fontSize: 8, letterSpacing: '0.15em', marginTop: 6 }}>
          4
        </div>
      </div>
    </MockupPageFrame>
  )
}

// Page 4: Back Cover
function BackCoverMockup({ theme }) {
  return (
    <MockupPageFrame theme={theme}>
      <CrossSymbol color={theme.heading} size={22} />
      <div style={{ color: theme.heading, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 10, fontWeight: 700 }}>
        In Loving Memory
      </div>
      <div style={{ margin: '8px 0' }}>
        <TripleDot color={theme.border} />
      </div>
      <div style={{
        width: '35%', aspectRatio: '9/11', borderRadius: '50%',
        border: `2px solid ${theme.border}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.placeholderBg,
      }}>
        <CrossSymbol color={theme.subtleText} size={18} />
      </div>
      <div style={{ color: theme.heading, fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 10 }}>
        JOHN DOE
      </div>
      <div style={{ color: theme.subtleText, fontSize: 10, letterSpacing: '0.15em', marginTop: 4, fontFamily: "'EB Garamond', Georgia, serif" }}>
        1948 — 2025
      </div>
      <div style={{ width: '50%', margin: '10px 0' }}>
        <OrnamentalDivider color={theme.border} width="100%" />
      </div>
      <div style={{
        color: theme.subtleText, fontSize: 9, fontStyle: 'italic', textAlign: 'center',
        maxWidth: '80%', lineHeight: 1.6,
        fontFamily: "'EB Garamond', Georgia, serif",
      }}>
        "For I am persuaded, that neither death, nor life... shall be able to separate us from the love of God."
        <br />
        <span style={{ fontSize: 8, opacity: 0.7 }}>— Romans 8:38-39</span>
      </div>
      <div style={{ margin: '8px 0' }}>
        <TripleDot color={theme.border} />
      </div>
      <div style={{ color: theme.heading, fontSize: 16, fontWeight: 700, letterSpacing: '0.2em', marginTop: 4 }}>
        REST IN PEACE
      </div>
    </MockupPageFrame>
  )
}

export default function ExampleBrochureDialog({ open, onOpenChange }) {
  const [page, setPage] = useState(0)
  const t = themes.blackGold

  const pages = [
    <CoverMockup key="cover" theme={t} />,
    <OrderOfServiceMockup key="oos" theme={t} />,
    <TributeMockup key="tribute" theme={t} />,
    <BackCoverMockup key="back" theme={t} />,
  ]

  const goLeft = () => setPage((p) => (p > 0 ? p - 1 : pages.length - 1))
  const goRight = () => setPage((p) => (p < pages.length - 1 ? p + 1 : 0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background border-border p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-foreground text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Example Brochure
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center text-xs">
            {PAGE_LABELS[page]} &mdash; Page {page + 1} of {pages.length}
          </DialogDescription>
        </DialogHeader>

        {/* Page display area */}
        <div className="relative px-6 pb-2">
          <div className="relative">
            {pages[page]}

            {/* Left arrow */}
            <button
              onClick={goLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-muted/90 border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Right arrow */}
            <button
              onClick={goRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-muted/90 border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 pb-5">
          {PAGE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setPage(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === page ? 'bg-primary' : 'bg-accent hover:bg-muted-foreground/60'
              }`}
              aria-label={label}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
