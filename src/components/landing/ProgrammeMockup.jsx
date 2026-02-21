import { themes } from '../../utils/themes'

export default function ProgrammeMockup({ themeKey = 'blackGold', className = '' }) {
  const t = themes[themeKey] || themes.blackGold

  const items = [
    { time: '8:30', label: 'Arrival of Body' },
    { time: '8:40', label: 'Opening Hymn' },
    { time: '8:50', label: 'Opening Prayer' },
    { time: '9:00', label: 'Scripture Reading' },
    { time: '9:10', label: 'Hymn — Choir' },
    { time: '9:30', label: 'Biography' },
    { time: '9:50', label: 'Tributes' },
    { time: '10:30', label: 'Sermon' },
  ]

  return (
    <div
      className={className}
      style={{
        aspectRatio: '3 / 4',
        backgroundColor: t.pageBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        border: `1px solid ${t.border}`,
        borderRadius: 4,
      }}
    >
      {/* Header */}
      <div style={{
        backgroundColor: t.secondaryBg || t.pageBg,
        borderBottom: `1px solid ${t.border}`,
        padding: '5% 6%',
        textAlign: 'center',
      }}>
        {/* Countdown boxes */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4%', marginBottom: '4%' }}>
          {['12', '04', '30', '15'].map((val, i) => (
            <div key={i} style={{
              backgroundColor: t.placeholderBg || 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${t.border}`,
              borderRadius: 2,
              padding: '2% 3%',
              textAlign: 'center',
              minWidth: '18%',
            }}>
              <div style={{ color: t.heading, fontSize: '0.6em', fontWeight: 700, lineHeight: 1.2 }}>{val}</div>
              <div style={{ color: t.subtleText, fontSize: '0.25em', opacity: 0.6, lineHeight: 1 }}>
                {['DAYS', 'HRS', 'MIN', 'SEC'][i]}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          color: t.heading,
          fontSize: '0.45em',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Order of Service
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 6%', marginTop: '3%' }}>
        <div style={{ height: 2, backgroundColor: t.placeholderBg || 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: '35%', height: '100%', backgroundColor: t.heading, borderRadius: 1 }} />
        </div>
        <div style={{ color: t.subtleText, fontSize: '0.22em', marginTop: '1%', opacity: 0.5, textAlign: 'right' }}>3/8 complete</div>
      </div>

      {/* Schedule items */}
      <div style={{ padding: '2% 6%' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4%',
            padding: '2.5% 0',
            borderBottom: i < items.length - 1 ? `0.5px solid ${t.border}` : 'none',
            opacity: i < 3 ? 0.5 : 1,
          }}>
            {/* Checkbox */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              border: `1px solid ${i < 3 ? t.heading : t.border}`,
              backgroundColor: i < 3 ? t.heading : 'transparent',
              flexShrink: 0,
            }} />
            {/* Time */}
            <div style={{
              color: t.heading,
              fontSize: '0.3em',
              fontWeight: 700,
              minWidth: '20%',
              textDecoration: i < 3 ? 'line-through' : 'none',
            }}>
              {item.time}
            </div>
            {/* Label */}
            <div style={{
              color: t.bodyText,
              fontSize: '0.28em',
              flex: 1,
              textDecoration: i < 3 ? 'line-through' : 'none',
              fontFamily: "'EB Garamond', Georgia, serif",
            }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
