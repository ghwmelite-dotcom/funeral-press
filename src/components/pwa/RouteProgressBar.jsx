import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

export default function RouteProgressBar() {
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  const startRafRef = useRef(0)
  const animateRafRef = useRef(0)
  const completionTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [state, setState] = useState({ visible: false, progress: 0 })

  useEffect(() => {
    if (location.pathname === prevPathRef.current) return
    prevPathRef.current = location.pathname

    // Defer the "start" state into a microtask via rAF so no setState
    // runs synchronously inside the effect body (react-hooks/set-state-in-effect).
    startRafRef.current = requestAnimationFrame(() => {
      setState({ visible: true, progress: 0 })
      animateRafRef.current = requestAnimationFrame(() =>
        setState({ visible: true, progress: 90 })
      )
    })

    completionTimerRef.current = setTimeout(() => {
      setState({ visible: true, progress: 100 })
      hideTimerRef.current = setTimeout(
        () => setState({ visible: false, progress: 0 }),
        200
      )
    }, 300)

    return () => {
      if (startRafRef.current) cancelAnimationFrame(startRafRef.current)
      if (animateRafRef.current) cancelAnimationFrame(animateRafRef.current)
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [location.pathname])

  if (!state.visible && state.progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div
        className="h-[2px] bg-primary transition-all ease-out"
        style={{
          width: `${state.progress}%`,
          transitionDuration: state.progress === 100 ? '150ms' : '500ms',
          opacity: state.visible ? 1 : 0,
        }}
      />
    </div>
  )
}
