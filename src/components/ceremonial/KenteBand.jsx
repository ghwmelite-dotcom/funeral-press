// The woven kente strip — purely decorative ceremonial framing (spec §2.2/§3).

/**
 * When used as a card/dialog top edge, the parent must be `overflow-hidden`
 * so the band clips to the parent's border radius.
 */
const SIZES = {
  page: { height: '6px', width: '100%' },
  card: { height: '4px', width: '100%' },
  ribbon: { height: '5px', width: '140px', borderRadius: '2px' },
}

export default function KenteBand({ size = 'page', className = '', style = {} }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ ...SIZES[size] || SIZES.page, background: 'var(--kente-weave)', ...style }}
    />
  )
}
