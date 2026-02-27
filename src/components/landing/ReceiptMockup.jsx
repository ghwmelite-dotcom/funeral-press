export default function ReceiptMockup({ className = '' }) {
  const BROWN = '#5C2D0E'
  const GOLD = '#C9A84C'
  return (
    <div
      className={className}
      style={{
        aspectRatio: '10 / 7',
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Playfair Display', Georgia, serif",
        display: 'flex',
      }}
    >
      {/* Left brown bar */}
      <div style={{ width: '2%', background: BROWN, flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: BROWN, padding: '3% 6%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.32em', letterSpacing: '0.12em', fontStyle: 'italic' }}>
            Acknowledgement
          </span>
        </div>

        {/* Receipt number */}
        <div style={{ textAlign: 'right', padding: '2% 6% 0', fontFamily: 'system-ui, sans-serif' }}>
          <span style={{ fontSize: '0.2em', color: BROWN, fontFamily: 'monospace', fontWeight: 700 }}>#0001</span>
        </div>

        {/* Body text lines */}
        <div style={{ flex: 1, padding: '3% 6%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3%' }}>
          <div style={{ height: 1.5, backgroundColor: '#666', opacity: 0.2, borderRadius: 1, width: '80%', margin: '0 auto' }} />
          <div style={{ height: 1.5, backgroundColor: '#666', opacity: 0.2, borderRadius: 1, width: '65%', margin: '0 auto' }} />
          <div style={{ height: 1.5, backgroundColor: '#666', opacity: 0.2, borderRadius: 1, width: '70%', margin: '0 auto' }} />

          {/* Name placeholder */}
          <div style={{ textAlign: 'center', margin: '3% 0' }}>
            <div style={{ height: 2.5, backgroundColor: BROWN, opacity: 0.5, borderRadius: 1, width: '55%', margin: '0 auto' }} />
            <div style={{ height: 4, backgroundColor: BROWN, opacity: 0.7, borderRadius: 1, width: '45%', margin: '3% auto 0' }} />
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3%' }}>
            <div style={{ height: 1.5, backgroundColor: '#666', opacity: 0.3, borderRadius: 1, width: '15%' }} />
            <div style={{ flex: 1, borderBottom: '1px dotted #ccc' }} />
          </div>

          {/* Amount box */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ background: BROWN, padding: '2% 4%', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: '0.18em', fontWeight: 700, fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>GHS</span>
            </div>
            <div style={{ border: `1.5px solid ${BROWN}`, width: '40%', height: 12 }} />
          </div>
        </div>
      </div>

      {/* Right photo placeholder */}
      <div style={{ width: '22%', flexShrink: 0, background: `linear-gradient(to bottom, ${BROWN} 20%, #ddd 20%)` }}>
        <div style={{ position: 'absolute', top: '20%', right: 0, bottom: 0, width: '22%', backgroundColor: '#e0d8cf' }} />
      </div>
    </div>
  )
}
