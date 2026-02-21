import { posterThemes } from '../../utils/posterDefaultData'

function Divider({ color, width = '50%' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width, margin: '0 auto' }}>
      <div style={{ flex: 1, height: 0.5, backgroundColor: color }} />
      <div style={{ width: 5, height: 5, backgroundColor: color, transform: 'rotate(45deg)', margin: '0 4px', flexShrink: 0 }} />
      <div style={{ flex: 1, height: 0.5, backgroundColor: color }} />
    </div>
  )
}

function PlaceholderLines({ color, count = 4, widths, opacity = 0.15 }) {
  const defaultWidths = Array(count).fill('85%')
  const w = widths || defaultWidths
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3%' }}>
      {w.map((width, i) => (
        <div key={i} style={{ height: 2, backgroundColor: color, opacity, borderRadius: 1, width }} />
      ))}
    </div>
  )
}

function PhotoCircle({ color, size = 12, borderColor }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1px solid ${borderColor || color}`, opacity: 0.5,
    }} />
  )
}

// ─── Classic Layout ────────────────────────────────────────────────────────
// Photo left, text right — royalBlue, midnightBlack

function ClassicMockup({ t }) {
  return (
    <>
      {/* Header Band */}
      <div style={{ backgroundColor: t.headerBg, padding: '6% 4%', textAlign: 'center' }}>
        <div style={{ color: t.headerText, fontSize: '0.55em', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          CALLED TO GLORY
        </div>
        <div style={{ marginTop: '4%' }}><Divider color={t.accent} width="50%" /></div>
      </div>

      {/* Body — Photo + Text */}
      <div style={{ backgroundColor: t.bodyBg, padding: '4%', display: 'flex', gap: '4%' }}>
        <div style={{
          width: '35%', aspectRatio: '3/4', border: `2px solid ${t.accent}`,
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoCircle color={t.accent} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4%', justifyContent: 'center' }}>
          <PlaceholderLines color={t.bodyText} count={6} widths={['100%', '100%', '100%', '100%', '100%', '60%']} opacity={0.3} />
        </div>
      </div>

      {/* Name Band */}
      <div style={{ backgroundColor: t.accent, padding: '3% 4%', textAlign: 'center' }}>
        <div style={{ color: t.badgeText, fontSize: '0.5em', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          FULL NAME
        </div>
      </div>

      {/* Details — Two Column */}
      <div style={{ backgroundColor: t.detailsBg, padding: '4%', display: 'flex', gap: '4%', flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
          <div style={{ height: 3, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '70%' }} />
          <PlaceholderLines color={t.detailsText} count={4} widths={['85%', '85%', '85%', '50%']} opacity={0.1} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
          <div style={{ height: 3, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '65%' }} />
          <PlaceholderLines color={t.detailsText} count={4} widths={['80%', '80%', '80%', '45%']} opacity={0.1} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.footerBg, padding: '3% 4%', textAlign: 'center' }}>
        <div style={{ height: 2, backgroundColor: t.headerText, opacity: 0.3, borderRadius: 1, width: '60%', margin: '0 auto' }} />
      </div>
    </>
  )
}

// ─── Elegant Layout ────────────────────────────────────────────────────────
// Ornamental border frame, centered photo — burgundyIvory, rosePink

function ElegantMockup({ t }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Triple border frame */}
      <div style={{ position: 'absolute', top: '2%', left: '2%', right: '2%', bottom: '2%', border: `1.5px solid ${t.accent}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '3%', left: '3%', right: '3%', bottom: '3%', border: `0.5px solid ${t.accent}`, opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '3.5%', left: '3.5%', right: '3.5%', bottom: '3.5%', border: `0.5px solid ${t.accent}`, pointerEvents: 'none' }} />

      {/* Header inside frame */}
      <div style={{ backgroundColor: t.headerBg, padding: '5% 6%', textAlign: 'center', margin: '5% 5% 0' }}>
        <div style={{ color: t.headerText, fontSize: '0.48em', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          CALLED TO GLORY
        </div>
        <div style={{ marginTop: '3%' }}><Divider color={t.accent} width="40%" /></div>
      </div>

      {/* Centered photo */}
      <div style={{ backgroundColor: t.bodyBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4% 5%', margin: '0 5%' }}>
        <div style={{
          width: '38%', aspectRatio: '3/4', border: `2px solid ${t.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoCircle color={t.accent} size={14} />
        </div>

        {/* Name below photo */}
        <div style={{ marginTop: '3%' }}><Divider color={t.accent} width="50%" /></div>
        <div style={{ color: t.accent, fontSize: '0.5em', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2%' }}>
          FULL NAME
        </div>
        <div style={{ color: t.bodyText, fontSize: '0.28em', opacity: 0.6, marginTop: '1%', fontFamily: "'EB Garamond', Georgia, serif" }}>
          1948 — 2025
        </div>
      </div>

      {/* Announcement text */}
      <div style={{ padding: '2% 10%', margin: '0 5%', backgroundColor: t.bodyBg, textAlign: 'center' }}>
        <PlaceholderLines color={t.bodyText} count={3} widths={['90%', '85%', '60%']} opacity={0.2} />
      </div>

      {/* Details */}
      <div style={{ backgroundColor: t.detailsBg, padding: '3% 6%', margin: '0 5%', flex: 1, display: 'flex', gap: '4%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2%' }}>
          <div style={{ height: 2.5, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '65%' }} />
          <PlaceholderLines color={t.detailsText} count={3} widths={['80%', '80%', '50%']} opacity={0.1} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2%' }}>
          <div style={{ height: 2.5, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '60%' }} />
          <PlaceholderLines color={t.detailsText} count={3} widths={['75%', '75%', '45%']} opacity={0.1} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.footerBg, padding: '2.5% 4%', textAlign: 'center', margin: '0 5% 5%' }}>
        <div style={{ height: 2, backgroundColor: t.headerText, opacity: 0.3, borderRadius: 1, width: '55%', margin: '0 auto' }} />
      </div>
    </div>
  )
}

// ─── Heritage Layout ───────────────────────────────────────────────────────
// Full-width photo, bold header, card-grid — kenteHeritage, chocolateCream

function HeritageMockup({ t }) {
  return (
    <>
      {/* Accent stripe */}
      <div style={{ height: 3, backgroundColor: t.accent }} />

      {/* Header */}
      <div style={{ backgroundColor: t.headerBg, padding: '5% 4%', textAlign: 'center' }}>
        <div style={{ color: t.headerText, fontSize: '0.55em', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          CALLED TO GLORY
        </div>
        <div style={{ marginTop: '3%' }}><Divider color={t.accent} width="35%" /></div>
      </div>
      <div style={{ height: 2, backgroundColor: t.accent }} />

      {/* Full-width centered photo */}
      <div style={{ backgroundColor: t.bodyBg, padding: '4%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '45%', aspectRatio: '3/4', border: `3px solid ${t.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoCircle color={t.accent} size={16} />
        </div>
      </div>

      {/* Name band — bold */}
      <div style={{ backgroundColor: t.accent, padding: '3.5% 4%', textAlign: 'center' }}>
        <div style={{ color: t.badgeText, fontSize: '0.55em', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          FULL NAME
        </div>
      </div>

      {/* Announcement */}
      <div style={{ backgroundColor: t.bodyBg, padding: '3% 6%', textAlign: 'center' }}>
        <PlaceholderLines color={t.bodyText} count={2} widths={['90%', '70%']} opacity={0.25} />
      </div>

      {/* Details — 2x2 card grid */}
      <div style={{ backgroundColor: t.detailsBg, padding: '3% 4%', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3%' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              border: `1px solid ${t.accent}`, padding: '4%', borderRadius: 2,
            }}>
              <div style={{ height: 2, backgroundColor: t.accent, opacity: 0.5, borderRadius: 1, width: '70%', marginBottom: '4%' }} />
              <PlaceholderLines color={t.detailsText} count={2} widths={['90%', '60%']} opacity={0.1} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: 2, backgroundColor: t.accent }} />
      <div style={{ backgroundColor: t.footerBg, padding: '3% 4%', textAlign: 'center' }}>
        <div style={{ height: 2, backgroundColor: t.headerText, opacity: 0.3, borderRadius: 1, width: '60%', margin: '0 auto' }} />
      </div>
    </>
  )
}

// ─── Centered Layout ───────────────────────────────────────────────────────
// Everything symmetrical, single-column — purpleMajesty, ivoryClassic

function CenteredMockup({ t }) {
  return (
    <>
      {/* Header */}
      <div style={{ backgroundColor: t.headerBg, padding: '5% 4%', textAlign: 'center' }}>
        <div style={{ color: t.headerText, fontSize: '0.5em', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          CALLED TO GLORY
        </div>
        <div style={{ marginTop: '3%' }}><Divider color={t.accent} width="45%" /></div>
      </div>

      {/* Centered body — stacked vertically */}
      <div style={{
        backgroundColor: t.bodyBg, padding: '4% 8%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Photo centered */}
        <div style={{
          width: '40%', aspectRatio: '3/4', border: `2px solid ${t.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoCircle color={t.accent} size={14} />
        </div>

        {/* Name */}
        <div style={{ color: t.accent, fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4%' }}>
          FULL NAME
        </div>
        <div style={{ color: t.bodyText, fontSize: '0.26em', opacity: 0.6, marginTop: '1%' }}>1948 — 2025</div>

        <div style={{ marginTop: '3%', width: '50%' }}><Divider color={t.accent} /></div>

        {/* Announcement */}
        <div style={{ marginTop: '3%', width: '80%' }}>
          <PlaceholderLines color={t.bodyText} count={3} widths={['95%', '90%', '65%']} opacity={0.2} />
        </div>
      </div>

      {/* Accent strip */}
      <div style={{ height: 3, backgroundColor: t.accent }} />

      {/* Details — centered single column */}
      <div style={{ backgroundColor: t.detailsBg, padding: '3% 8%', flex: 1, textAlign: 'center' }}>
        <div style={{ height: 2.5, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '55%', margin: '0 auto 3%' }} />

        {/* Centered arrangement items */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ marginBottom: '2%' }}>
            <div style={{ height: 2, backgroundColor: t.detailsText, opacity: 0.12, borderRadius: 1, width: `${60 + i * 5}%`, margin: '0 auto' }} />
          </div>
        ))}

        <div style={{ height: 0.5, backgroundColor: t.accent, opacity: 0.3, margin: '3% auto', width: '40%' }} />

        <div style={{ display: 'flex', gap: '4%', marginTop: '2%' }}>
          <div style={{ flex: 1 }}>
            <PlaceholderLines color={t.detailsText} count={3} widths={['70%', '85%', '50%']} opacity={0.1} />
          </div>
          <div style={{ flex: 1 }}>
            <PlaceholderLines color={t.detailsText} count={3} widths={['65%', '80%', '45%']} opacity={0.1} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: t.footerBg, padding: '3% 4%', textAlign: 'center' }}>
        <div style={{ height: 2, backgroundColor: t.headerText, opacity: 0.3, borderRadius: 1, width: '55%', margin: '0 auto' }} />
      </div>
    </>
  )
}

// ─── Modern Layout ─────────────────────────────────────────────────────────
// Text left, photo right (reversed), card-block details — forestGreen, oceanNavy, oliveGold

function ModernMockup({ t }) {
  return (
    <>
      {/* Header with side accent bars */}
      <div style={{ display: 'flex', backgroundColor: t.headerBg }}>
        <div style={{ width: 3, backgroundColor: t.accent }} />
        <div style={{ flex: 1, padding: '5% 4%', textAlign: 'center' }}>
          <div style={{ color: t.headerText, fontSize: '0.5em', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            CALLED TO GLORY
          </div>
          <div style={{ marginTop: '3%' }}><Divider color={t.accent} width="40%" /></div>
        </div>
        <div style={{ width: 3, backgroundColor: t.accent }} />
      </div>

      {/* Body — Text LEFT, Photo RIGHT */}
      <div style={{ backgroundColor: t.bodyBg, padding: '4%', display: 'flex', gap: '4%' }}>
        {/* Left: Name + Text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3%' }}>
          <div style={{ color: t.accent, fontSize: '0.45em', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            FULL NAME
          </div>
          <div style={{ color: t.bodyText, fontSize: '0.26em', opacity: 0.6 }}>1948 — 2025</div>
          <div style={{ height: 1, backgroundColor: t.accent, width: '35%' }} />
          <PlaceholderLines color={t.bodyText} count={4} widths={['100%', '95%', '100%', '60%']} opacity={0.25} />
        </div>

        {/* Right: Photo */}
        <div style={{
          width: '38%', aspectRatio: '3/4', border: `3px solid ${t.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)',
        }}>
          <PhotoCircle color={t.accent} size={14} />
        </div>
      </div>

      {/* Accent strip */}
      <div style={{ height: 3, backgroundColor: t.accent }} />

      {/* Details with left-border card items */}
      <div style={{ backgroundColor: t.detailsBg, padding: '3% 4%', flex: 1, display: 'flex', gap: '4%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
          <div style={{ height: 2.5, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '65%' }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ borderLeft: `2px solid ${t.accent}`, paddingLeft: '4%' }}>
              <PlaceholderLines color={t.detailsText} count={2} widths={['80%', '55%']} opacity={0.1} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3%' }}>
          <div style={{ height: 2.5, backgroundColor: t.detailsText, opacity: 0.15, borderRadius: 1, width: '60%' }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ borderLeft: `2px solid ${t.accent}`, paddingLeft: '4%' }}>
              <PlaceholderLines color={t.detailsText} count={2} widths={['75%', '50%']} opacity={0.1} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer with side bars */}
      <div style={{ display: 'flex', backgroundColor: t.footerBg }}>
        <div style={{ width: 3, backgroundColor: t.accent }} />
        <div style={{ flex: 1, padding: '3% 4%', textAlign: 'center' }}>
          <div style={{ height: 2, backgroundColor: t.headerText, opacity: 0.3, borderRadius: 1, width: '55%', margin: '0 auto' }} />
        </div>
        <div style={{ width: 3, backgroundColor: t.accent }} />
      </div>
    </>
  )
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function PosterMockup({ themeKey = 'royalBlue', className = '' }) {
  const t = posterThemes[themeKey] || posterThemes.royalBlue
  const layout = t.layout || 'classic'

  return (
    <div
      className={className}
      style={{
        aspectRatio: '7 / 10',
        backgroundColor: layout === 'elegant' ? t.detailsBg : t.detailsBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {layout === 'classic' && <ClassicMockup t={t} />}
      {layout === 'elegant' && <ElegantMockup t={t} />}
      {layout === 'heritage' && <HeritageMockup t={t} />}
      {layout === 'centered' && <CenteredMockup t={t} />}
      {layout === 'modern' && <ModernMockup t={t} />}
    </div>
  )
}
