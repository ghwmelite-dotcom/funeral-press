export default function QRCardsMockup({ className = '' }) {
  const GOLD = '#C9A84C'
  return (
    <div
      className={className}
      style={{
        aspectRatio: '7 / 10',
        backgroundColor: '#FDF8F0',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8%',
      }}
    >
      {/* Border */}
      <div style={{ position: 'absolute', inset: '4%', border: `1.5px solid ${GOLD}`, pointerEvents: 'none' }} />

      {/* Cross */}
      <div style={{ color: GOLD, fontSize: '1em', marginTop: '4%', lineHeight: 1 }}>&#10013;</div>

      {/* Title placeholder */}
      <div style={{ marginTop: '5%', textAlign: 'center' }}>
        <div style={{ height: 1.5, backgroundColor: '#999', opacity: 0.3, borderRadius: 1, width: 50, margin: '0 auto' }} />
        <div style={{ height: 2.5, backgroundColor: '#1A1A1A', opacity: 0.6, borderRadius: 1, width: 65, margin: '5% auto 0' }} />
        <div style={{ height: 1.5, backgroundColor: '#999', opacity: 0.2, borderRadius: 1, width: 40, margin: '4% auto 0' }} />
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '6%' }}>
        <div style={{ width: 16, height: 0.5, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
        <span style={{ color: GOLD, fontSize: '0.4em' }}>&#10022;</span>
        <div style={{ width: 16, height: 0.5, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
      </div>

      {/* Label */}
      <div style={{ marginTop: '5%', background: '#1A1A1A', color: GOLD, padding: '2% 8%', fontSize: '0.22em', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
        QR CODE
      </div>

      {/* QR placeholder */}
      <div style={{ marginTop: '6%', width: '42%', aspectRatio: '1', border: `1.5px solid ${GOLD}`, padding: '4%', background: '#fff' }}>
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 1 }}>
          {Array(25).fill(0).map((_, i) => (
            <div key={i} style={{ backgroundColor: [0,1,2,4,5,6,10,12,14,18,20,21,22,24].includes(i) ? '#1A1A1A' : '#fff' }} />
          ))}
        </div>
      </div>

      {/* Scan text */}
      <div style={{ marginTop: '5%', height: 1.5, backgroundColor: '#1A1A1A', opacity: 0.4, borderRadius: 1, width: '55%' }} />
      <div style={{ marginTop: '3%', height: 1, backgroundColor: '#999', opacity: 0.2, borderRadius: 1, width: '70%' }} />

      {/* Bottom URL */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 1, backgroundColor: '#999', opacity: 0.2, borderRadius: 1, width: 50, margin: '0 auto' }} />
      </div>
    </div>
  )
}
