import { useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'

export default function RouteProgressBar() {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPath = useRef(location.pathname)
  const timerRef = useRef(null)

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname

      // Start loading
      setVisible(true)
      setProgress(0)

      // Animate to 90%
      requestAnimationFrame(() => {
        setProgress(90)
      })

      // Complete after a short delay
      timerRef.current = setTimeout(() => {
        setProgress(100)
        setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 200)
      }, 300)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [location.pathname])

  if (!visible && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div
        className="h-[2px] bg-primary transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '150ms' : '500ms',
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}
