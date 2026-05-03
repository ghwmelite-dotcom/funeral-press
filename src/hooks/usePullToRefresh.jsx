import { useState, useRef, useCallback, useEffect } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 80 } = options
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    const scrollTop = pullRef.current
      ? pullRef.current.scrollTop
      : (document.documentElement.scrollTop || document.body.scrollTop)
    if (scrollTop > 0) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current) return
    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY.current)
    if (distance > 0) {
      // Apply resistance: the further you pull, the harder it gets
      const dampened = Math.min(distance * 0.5, threshold * 1.5)
      setPullDistance(dampened)
      setIsPulling(true)
    }
  }, [threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pullDistance >= threshold) {
      try {
        await onRefresh()
      } catch {
        // silently fail
      }
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, threshold, onRefresh])

  useEffect(() => {
    const el = pullRef.current || window
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return { pullRef, isPulling, pullDistance, pullProgress }
}

export function PullToRefreshIndicator({ pullDistance, threshold = 80 }) {
  if (pullDistance <= 0) return null
  const progress = Math.min(pullDistance / threshold, 1)
  return (
    <div className="flex justify-center py-2" style={{ opacity: progress }}>
      <div
        className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${progress >= 1 ? 'animate-spin' : ''}`}
        style={{ transform: `rotate(${progress * 360}deg)` }}
      />
    </div>
  )
}
