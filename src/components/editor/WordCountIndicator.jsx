export default function WordCountIndicator({ text = '', min = 150, max = 500 }) {
  const count = (text || '').split(/\s+/).filter(Boolean).length
  let color = 'text-muted-foreground'
  let label = ''

  if (count === 0) {
    label = 'not started'
    color = 'text-muted-foreground/60'
  } else if (count < min) {
    label = 'too short'
    color = 'text-red-400'
  } else if (count <= max) {
    label = 'good length'
    color = 'text-emerald-400'
  } else {
    label = 'getting long'
    color = 'text-primary'
  }

  return (
    <span className={`text-[10px] ${color}`}>
      {count} / {min}&ndash;{max} words ({label})
    </span>
  )
}
