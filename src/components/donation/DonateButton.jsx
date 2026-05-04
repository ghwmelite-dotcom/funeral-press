import { useNavigate } from 'react-router-dom'

export function DonateButton({ slug, disabled, className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/m/${slug}/donate`)}
      disabled={disabled}
      className={`bg-primary text-primary-foreground font-medium py-3 px-6 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors ${className}`}
    >
      Donate
    </button>
  )
}
