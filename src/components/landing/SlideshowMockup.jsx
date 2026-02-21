import { themes } from '../../utils/themes'

function CrossSymbol({ color, size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <rect x="10" y="2" width="4" height="20" fill={color} />
      <rect x="4" y="6" width="16" height="4" fill={color} />
    </svg>
  )
}

export default function SlideshowMockup({ themeKey = 'blackGold', className = '' }) {
  const t = themes[themeKey] || themes.blackGold

  return (
    <div
      className={className}
      style={{
        aspectRatio: '3 / 4',
        backgroundColor: '#111',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 16:9 Canvas area */}
      <div style={{
        aspectRatio: '16 / 9',
        backgroundColor: t.pageBg,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '4%',
        borderRadius: 3,
        border: `0.5px solid ${t.border}`,
        overflow: 'hidden',
      }}>
        {/* Cross */}
        <CrossSymbol color={t.heading} size={12} />

        <div style={{
          color: t.subtleText,
          fontSize: '0.25em',
          fontStyle: 'italic',
          marginTop: '3%',
          fontFamily: "'EB Garamond', Georgia, serif",
        }}>
          Celebration of Life
        </div>

        {/* Photo circle */}
        <div style={{
          width: '22%',
          aspectRatio: '1',
          borderRadius: '50%',
          border: `1.5px solid ${t.border}`,
          backgroundColor: t.placeholderBg || 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '3% 0',
        }}>
          <CrossSymbol color={t.subtleText} size={8} />
        </div>

        <div style={{
          color: t.heading,
          fontSize: '0.4em',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textAlign: 'center',
        }}>
          FULL NAME
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '40%', margin: '2% 0' }}>
          <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.3 }} />
          <div style={{ width: 3, height: 3, backgroundColor: t.border, transform: 'rotate(45deg)', margin: '0 3px' }} />
          <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.3 }} />
        </div>

        <div style={{
          color: t.subtleText,
          fontSize: '0.22em',
          opacity: 0.6,
          fontFamily: "'EB Garamond', Georgia, serif",
        }}>
          1948 — 2025
        </div>

        {/* Play button overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.25)',
          opacity: 0.8,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, marginLeft: 2 }}>
              <polygon points="6,4 20,12 6,20" fill="rgba(255,255,255,0.8)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{
        padding: '0 6%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '6%',
      }}>
        {/* Progress bar */}
        <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: '30%', height: '100%', backgroundColor: t.heading, borderRadius: 1 }} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6%' }}>
          {/* Prev */}
          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, opacity: 0.4 }}>
            <polygon points="19,4 8,12 19,20" fill="white" />
            <rect x="5" y="4" width="2" height="16" fill="white" />
          </svg>
          {/* Play */}
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: t.heading,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 9, height: 9, marginLeft: 1 }}>
              <polygon points="6,4 20,12 6,20" fill={t.pageBg} />
            </svg>
          </div>
          {/* Next */}
          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, opacity: 0.4 }}>
            <polygon points="5,4 16,12 5,20" fill="white" />
            <rect x="17" y="4" width="2" height="16" fill="white" />
          </svg>
        </div>

        {/* Slide counter */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.2em',
        }}>
          Slide 1 of 8
        </div>
      </div>
    </div>
  )
}
