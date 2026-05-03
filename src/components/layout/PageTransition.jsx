import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

export default function PageTransition({ children }) {
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  const [transitionKey, setTransitionKey] = useState(location.pathname)

  useEffect(() => {
    if (location.pathname === prevPathRef.current) return
    prevPathRef.current = location.pathname
    const timer = setTimeout(() => setTransitionKey(location.pathname), 150)
    return () => clearTimeout(timer)
  }, [location.pathname])

  const stage = transitionKey === location.pathname ? 'enter' : 'exit'

  return (
    <div
      key={transitionKey}
      className={`transition-all duration-150 ease-out ${
        stage === 'enter' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {children}
    </div>
  )
}
