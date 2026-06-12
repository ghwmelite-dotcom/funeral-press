// Gold hairlines flanking an Adinkra mark — section punctuation (max 2/page).
import AdinkraMark from './AdinkraMark.jsx'

export default function CeremonialDivider({ symbol = 'adinkrahene', className = '' }) {
  return (
    <div className={`flex items-center gap-3.5 my-8 ${className}`}>
      <div aria-hidden="true" className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--ceremonial-gold-soft))' }} />
      <AdinkraMark symbol={symbol} variant="mark" style={{ opacity: 0.8 }} />
      <div aria-hidden="true" className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--ceremonial-gold-soft), transparent)' }} />
    </div>
  )
}
