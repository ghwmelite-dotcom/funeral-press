export default function WreathCardMockup({ className = '' }) {
  const GOLD = '#C9A84C'
  const DARK_GOLD = '#A6882F'
  return (
    <div
      className={className}
      style={{
        aspectRatio: '5 / 3',
        backgroundColor: '#FDF8F0',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8% 6%',
      }}
    >
      {/* Outer border */}
      <div style={{ position: 'absolute', inset: '3%', border: `1.5px solid ${GOLD}`, pointerEvents: 'none' }} />
      {/* Inner border */}
      <div style={{ position: 'absolute', inset: '5%', border: `0.5px solid ${DARK_GOLD}`, pointerEvents: 'none', opacity: 0.35 }} />

      {/* Cross divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '4%' }}>
        <div style={{ width: 14, height: 0.5, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '0.5em', lineHeight: 1 }}>&#10013;</span>
        <div style={{ width: 14, height: 0.5, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* Message placeholder */}
      <div style={{ height: 3, backgroundColor: '#1A1A1A', opacity: 0.5, borderRadius: 1, width: '60%', marginBottom: '3%' }} />
      <div style={{ height: 2.5, backgroundColor: '#1A1A1A', opacity: 0.35, borderRadius: 1, width: '45%' }} />

      {/* Ornamental divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, margin: '5% 0' }}>
        <div style={{ width: 12, height: 0.5, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '0.3em' }}>&#10022;</span>
        <div style={{ width: 12, height: 0.5, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* From placeholder */}
      <div style={{ height: 1.5, backgroundColor: '#777', opacity: 0.3, borderRadius: 1, width: '40%' }} />
    </div>
  )
}
