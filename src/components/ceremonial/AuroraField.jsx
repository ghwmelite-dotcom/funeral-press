// The hero's living-light layer (spec §5 budget: 2 blur layers, ≤6 twinkles,
// CSS-only). Colors come from tokens, so light mode automatically renders the
// softened "gold mist" (and callers pass `mist` to drop twinkles there too —
// the page reads the theme store and sets it).
const TWINKLE_POSITIONS = [
  { top: '22%', left: '14%', s: 3, d: '0s' },
  { top: '64%', left: '38%', s: 2, d: '1.2s' },
  { top: '30%', left: '70%', s: 3, d: '2.1s' },
  { top: '75%', left: '82%', s: 2, d: '0.6s' },
  { top: '48%', left: '8%', s: 2, d: '2.8s' },
  { top: '14%', left: '52%', s: 2, d: '1.7s' },
]

export default function AuroraField({ twinkles = 4, mist = false }) {
  const count = mist ? 0 : Math.min(twinkles, 6)
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        data-aurora
        className="absolute rounded-full animate-aurora-drift"
        style={{ width: 480, height: 480, top: -180, right: -120, background: 'radial-gradient(circle, var(--ceremonial-aurora-gold), transparent 60%)', filter: 'blur(80px)' }}
      />
      <div
        data-aurora
        className="absolute rounded-full animate-aurora-drift"
        style={{ width: 380, height: 380, bottom: -180, left: -140, background: 'radial-gradient(circle, var(--ceremonial-aurora-accent), transparent 60%)', filter: 'blur(80px)', animationDelay: '5s' }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <div
          data-sweep
          className="absolute inset-y-0 w-1/3 animate-shimmer-sweep"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.045), transparent)' }}
        />
      </div>
      {TWINKLE_POSITIONS.slice(0, count).map((p, i) => (
        <span
          key={i}
          data-twinkle
          className="absolute rounded-full animate-twinkle"
          style={{ top: p.top, left: p.left, width: p.s, height: p.s, background: 'var(--ceremonial-gold)', boxShadow: '0 0 8px 1px var(--ceremonial-aurora-gold)', animationDelay: p.d }}
        />
      ))}
    </div>
  )
}
