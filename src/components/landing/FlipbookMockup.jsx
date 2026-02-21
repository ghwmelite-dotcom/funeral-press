import { themes } from '../../utils/themes'

function CrossSymbol({ color, size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <rect x="10" y="2" width="4" height="20" fill={color} />
      <rect x="4" y="6" width="16" height="4" fill={color} />
    </svg>
  )
}

export default function FlipbookMockup({ themeKey = 'blackGold', className = '' }) {
  const t = themes[themeKey] || themes.blackGold

  return (
    <div
      className={className}
      style={{
        aspectRatio: '4 / 3',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 4,
        padding: '4%',
      }}
    >
      {/* Book container with perspective */}
      <div style={{
        display: 'flex',
        width: '92%',
        height: '88%',
        perspective: '800px',
      }}>
        {/* Left page */}
        <div style={{
          flex: 1,
          backgroundColor: t.pageBg,
          border: `1px solid ${t.border}`,
          borderRight: 'none',
          borderRadius: '3px 0 0 3px',
          padding: '6%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.1)',
        }}>
          {/* Inner border */}
          <div style={{
            position: 'absolute',
            top: '5%', left: '5%', right: '3%', bottom: '5%',
            border: `0.5px solid ${t.border}`,
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          <CrossSymbol color={t.heading} size={12} />
          <div style={{
            color: t.heading,
            fontSize: '0.4em',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: '6%',
            textAlign: 'center',
          }}>
            Celebration
          </div>
          <div style={{
            color: t.subtleText,
            fontSize: '0.28em',
            fontStyle: 'italic',
            marginTop: '3%',
            textAlign: 'center',
            fontFamily: "'EB Garamond', Georgia, serif",
          }}>
            of Life
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', width: '60%', margin: '6% 0' }}>
            <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.4 }} />
            <div style={{ width: 4, height: 4, backgroundColor: t.border, transform: 'rotate(45deg)', margin: '0 3px' }} />
            <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.4 }} />
          </div>

          {/* Photo circle */}
          <div style={{
            width: '45%',
            aspectRatio: '1',
            borderRadius: '50%',
            border: `1.5px solid ${t.border}`,
            backgroundColor: t.placeholderBg || 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CrossSymbol color={t.subtleText} size={10} />
          </div>

          <div style={{
            color: t.heading,
            fontSize: '0.35em',
            fontWeight: 700,
            letterSpacing: '0.12em',
            marginTop: '6%',
            textAlign: 'center',
          }}>
            FULL NAME
          </div>

          {/* Page number */}
          <div style={{
            position: 'absolute',
            bottom: '4%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: t.subtleText,
            fontSize: '0.2em',
            opacity: 0.4,
          }}>1</div>
        </div>

        {/* Spine shadow */}
        <div style={{
          width: 2,
          background: `linear-gradient(to right, rgba(0,0,0,0.15), rgba(0,0,0,0.05))`,
          flexShrink: 0,
        }} />

        {/* Right page */}
        <div style={{
          flex: 1,
          backgroundColor: t.pageBg,
          border: `1px solid ${t.border}`,
          borderLeft: 'none',
          borderRadius: '0 3px 3px 0',
          padding: '6%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.05)',
        }}>
          {/* Inner border */}
          <div style={{
            position: 'absolute',
            top: '5%', left: '3%', right: '5%', bottom: '5%',
            border: `0.5px solid ${t.border}`,
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          <div style={{
            color: t.heading,
            fontSize: '0.32em',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '4%',
          }}>
            Order of Service
          </div>

          {/* Schedule items */}
          {['8:30 AM', '8:40 AM', '8:50 AM', '9:00 AM', '9:10 AM', '9:30 AM'].map((time, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '4%',
              padding: '2% 0',
              borderBottom: `0.5px solid ${t.border}`,
              opacity: 0.7,
            }}>
              <div style={{ color: t.heading, fontSize: '0.22em', fontWeight: 700, minWidth: '30%' }}>{time}</div>
              <div style={{ height: 2, backgroundColor: t.bodyText, opacity: 0.25, borderRadius: 1, flex: 1, alignSelf: 'center' }} />
            </div>
          ))}

          {/* Page curl effect */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '15%',
            height: '10%',
            background: `linear-gradient(135deg, transparent 50%, ${t.secondaryBg || t.pageBg} 50%)`,
            opacity: 0.6,
          }} />

          {/* Page number */}
          <div style={{
            position: 'absolute',
            bottom: '4%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: t.subtleText,
            fontSize: '0.2em',
            opacity: 0.4,
          }}>2</div>
        </div>
      </div>
    </div>
  )
}
