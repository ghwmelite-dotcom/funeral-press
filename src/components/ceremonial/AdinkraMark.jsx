// Adinkra symbols rendered as inline SVG, always with their meaning attached
// (spec §4: symbols are used with meaning, never as wallpaper). Marks are
// labeled; watermarks are decorative backdrop and therefore aria-hidden.
// Renditions are geometric simplifications of the canonical forms — validated
// by the owner at the Task 5 visual gate.
// ADINKRA_SYMBOLS lives in adinkraSymbols.jsx to satisfy
// react-refresh/only-export-components (this file exports only the component).
import { ADINKRA_SYMBOLS } from './adinkraSymbols.jsx'

const SIZES = { mark: 20, watermark: 280 }

export default function AdinkraMark({ symbol, variant = 'mark', className = '', style = {} }) {
  const def = ADINKRA_SYMBOLS[symbol]
  if (!def) return null

  const size = SIZES[variant] || SIZES.mark
  const decorative = variant === 'watermark'

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={decorative ? { opacity: 'var(--ceremonial-watermark-opacity)', ...style } : style}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : `${def.name} — ${def.meaning}`}
    >
      {def.render('var(--ceremonial-gold)')}
      {!decorative && <title>{`${def.name}: ${def.meaning}`}</title>}
    </svg>
  )
}
