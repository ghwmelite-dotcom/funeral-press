export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-muted via-accent to-muted bg-[length:200%_100%] rounded ${className}`}
      {...props}
    />
  )
}
