import { oneWeekThemes } from '../../utils/oneWeekDefaultData'

function Divider({ color, width = '50%' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width, margin: '0 auto' }}>
      <div style={{ flex: 1, height: 0.5, backgroundColor: color }} />
      <div style={{ width: 4, height: 4, backgroundColor: color, transform: 'rotate(45deg)', margin: '0 3px', flexShrink: 0 }} />
      <div style={{ flex: 1, height: 0.5, backgroundColor: color }} />
    </div>
  )
}

function PhotoPlaceholder({ color, size = 12 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1px solid ${color}`, opacity: 0.5,
    }} />
  )
}

export default function OneWeekMockup({ themeKey = 'burgundyGold', className = '' }) {
  const t = oneWeekThemes[themeKey] || oneWeekThemes.burgundyGold

  return (
    <div
      className={className}
      style={{
        aspectRatio: '7 / 10',
        backgroundColor: t.bodyBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ backgroundColor: t.headerBg, padding: '6% 4%', textAlign: 'center' }}>
        <div style={{ color: t.headerText, fontSize: '0.7em', fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1.1 }}>
          ONE WEEK
        </div>
        <div style={{ color: t.headerText, fontSize: '0.32em', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '1%' }}>
          OBSERVATION
        </div>
        <div style={{ marginTop: '3%' }}><Divider color={t.divider} width="30%" /></div>
        <div style={{ color: t.bodyText, fontSize: '0.22em', fontStyle: 'italic', opacity: 0.7, marginTop: '2%' }}>
          of the late
        </div>
      </div>

      {/* Photo section */}
      <div style={{ backgroundColor: t.bodyBg, padding: '4% 6%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6%' }}>
        {/* Main photo */}
        <div style={{
          width: '45%', aspectRatio: '3/4', border: `2px solid ${t.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoPlaceholder color={t.accent} size={14} />
        </div>
        {/* Side: archive photo + age badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8%' }}>
          <div style={{
            width: 18, height: 22, border: `1.5px solid ${t.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', border: `0.5px solid ${t.accent}`, opacity: 0.4 }} />
          </div>
          {/* Age badge */}
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: `1.5px solid ${t.badgeBorder}`, backgroundColor: t.badgeBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: t.badgeText, fontSize: '0.28em', fontWeight: 700 }}>77</span>
          </div>
        </div>
      </div>

      {/* Name section */}
      <div style={{ backgroundColor: t.bodyBg, padding: '2% 6%', textAlign: 'center' }}>
        <div style={{ color: t.bodyText, fontSize: '0.22em', fontStyle: 'italic', opacity: 0.7 }}>Opanin</div>
        <div style={{ color: t.nameText, fontSize: '0.5em', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '1%' }}>
          FULL NAME
        </div>
        <div style={{ color: t.bodyText, fontSize: '0.2em', opacity: 0.7, marginTop: '1%' }}>A.K.A Alias</div>
      </div>

      {/* Gold divider */}
      <div style={{ height: 1.5, backgroundColor: t.accent }} />

      {/* Event details */}
      <div style={{ backgroundColor: t.detailsBg, padding: '4% 5%', flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {['Date', 'Venue', 'Time'].map(label => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: t.accent, padding: '1px 4px', borderRadius: 1, marginBottom: 3,
              display: 'inline-block',
            }}>
              <span style={{ color: t.footerBg, fontSize: '0.16em', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ height: 2, backgroundColor: t.detailsText, opacity: 0.2, borderRadius: 1, width: 20, margin: '2px auto' }} />
          </div>
        ))}
      </div>

      {/* Gold accent line */}
      <div style={{ height: 1.5, backgroundColor: t.accent }} />

      {/* Footer */}
      <div style={{ backgroundColor: t.footerBg, padding: '3% 4%', textAlign: 'center' }}>
        <div style={{ height: 1.5, backgroundColor: t.accent, opacity: 0.5, borderRadius: 1, width: '70%', margin: '0 auto' }} />
      </div>
    </div>
  )
}
