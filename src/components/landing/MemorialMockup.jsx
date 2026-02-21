import { themes } from '../../utils/themes'

function CrossSymbol({ color, size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <rect x="10" y="2" width="4" height="20" fill={color} />
      <rect x="4" y="6" width="16" height="4" fill={color} />
    </svg>
  )
}

export default function MemorialMockup({ themeKey = 'blackGold', className = '' }) {
  const t = themes[themeKey] || themes.blackGold

  return (
    <div
      className={className}
      style={{
        aspectRatio: '3 / 4',
        backgroundColor: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Browser chrome */}
      <div style={{
        backgroundColor: '#2a2a2a',
        padding: '3% 4%',
        display: 'flex',
        alignItems: 'center',
        gap: '2%',
        borderBottom: '1px solid #333',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#febc2e' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#28c840' }} />
        </div>
        {/* URL bar */}
        <div style={{
          flex: 1,
          backgroundColor: '#1a1a1a',
          borderRadius: 3,
          padding: '1.5% 4%',
          display: 'flex',
          alignItems: 'center',
          gap: '2%',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 7, height: 7, opacity: 0.3 }}>
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
            <ellipse cx="12" cy="12" rx="5" ry="10" stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
          <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, flex: 1 }} />
        </div>
      </div>

      {/* Page content */}
      <div style={{
        flex: 1,
        backgroundColor: t.pageBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6%',
        overflow: 'hidden',
      }}>
        {/* Cross */}
        <CrossSymbol color={t.heading} size={14} />

        {/* Title */}
        <div style={{
          color: t.heading,
          fontSize: '0.35em',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginTop: '4%',
          textAlign: 'center',
        }}>
          In Loving Memory
        </div>

        {/* Photo circle */}
        <div style={{
          width: '35%',
          aspectRatio: '1',
          borderRadius: '50%',
          border: `2px solid ${t.border}`,
          backgroundColor: t.placeholderBg || 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '4% 0',
        }}>
          <CrossSymbol color={t.subtleText} size={12} />
        </div>

        {/* Name */}
        <div style={{
          color: t.heading,
          fontSize: '0.45em',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textAlign: 'center',
        }}>
          FULL NAME
        </div>

        {/* Dates */}
        <div style={{
          color: t.subtleText,
          fontSize: '0.25em',
          marginTop: '2%',
          fontFamily: "'EB Garamond', Georgia, serif",
        }}>
          1948 — 2025
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '50%', margin: '4% 0' }}>
          <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.3 }} />
          <div style={{ width: 3, height: 3, backgroundColor: t.border, transform: 'rotate(45deg)', margin: '0 3px' }} />
          <div style={{ flex: 1, height: 0.5, backgroundColor: t.border, opacity: 0.3 }} />
        </div>

        {/* Bio text lines */}
        <div style={{ width: '85%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
          {[100, 95, 100, 88, 100, 70].map((w, i) => (
            <div key={i} style={{
              height: 2,
              backgroundColor: t.bodyText,
              opacity: 0.15,
              borderRadius: 1,
              width: `${w}%`,
            }} />
          ))}
        </div>

        {/* Section heading */}
        <div style={{
          color: t.heading,
          fontSize: '0.28em',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: '5%',
          marginBottom: '2%',
        }}>
          Tributes
        </div>

        {/* Tribute text lines */}
        <div style={{ width: '85%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
          {[100, 92, 100, 60].map((w, i) => (
            <div key={i} style={{
              height: 2,
              backgroundColor: t.bodyText,
              opacity: 0.1,
              borderRadius: 1,
              width: `${w}%`,
            }} />
          ))}
        </div>

        {/* QR code placeholder */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '4%',
          display: 'flex',
          alignItems: 'center',
          gap: '3%',
        }}>
          <div style={{
            width: 18,
            height: 18,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 1,
            padding: 2,
            opacity: 0.4,
          }}>
            {[1,0,1, 0,1,0, 1,0,1].map((filled, i) => (
              <div key={i} style={{
                backgroundColor: filled ? t.heading : 'transparent',
                borderRadius: 0.5,
              }} />
            ))}
          </div>
          <div style={{
            color: t.subtleText,
            fontSize: '0.18em',
            opacity: 0.5,
          }}>
            Scan to visit
          </div>
        </div>
      </div>
    </div>
  )
}
