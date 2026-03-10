import { useLocation } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'

export default function PageTransition({ children }) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('enter')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exit')
      const timer = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('enter')
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [location, displayLocation])

  return (
    <div
      className={`transition-all duration-150 ease-out ${
        transitionStage === 'enter' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {children}
    </div>
  )
}
