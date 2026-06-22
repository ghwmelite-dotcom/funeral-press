import { useState, useRef, useCallback, useEffect } from 'react'

export function useSlideshow(slides, options = {}) {
  const { autoPlayInterval = 5000 } = options
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef(null)
  const audioRef = useRef(null)

  const totalSlides = slides.length

  const goTo = useCallback((index) => {
    if (index < 0 || index >= totalSlides || transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(index)
      setTransitioning(false)
    }, 600)
  }, [totalSlides, transitioning])

  const next = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      goTo(currentIndex + 1)
    } else {
      setIsPlaying(false)
    }
  }, [currentIndex, totalSlides, goTo])

  const prev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])
  const toggle = useCallback(() => setIsPlaying(p => !p), [])

  // Auto-advance. Respect prefers-reduced-motion: vestibular-sensitive users
  // should not have slides moving on their own — they can still advance via the
  // manual controls. The interval is skipped entirely when reduced motion is set.
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    if (isPlaying && !transitioning) {
      timerRef.current = setTimeout(next, autoPlayInterval)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentIndex, transitioning, next, autoPlayInterval])

  // Music
  const loadMusic = useCallback((file) => {
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
    }
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.loop = true
    audioRef.current = audio
  }, [])

  const playMusic = useCallback(() => {
    audioRef.current?.play().catch(() => {})
  }, [])

  const pauseMusic = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  // Sync music with play state
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {})
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
    }
  }, [])

  return {
    currentIndex,
    currentSlide: slides[currentIndex],
    totalSlides,
    isPlaying,
    transitioning,
    next,
    prev,
    goTo,
    play,
    pause,
    toggle,
    loadMusic,
    playMusic,
    pauseMusic,
    progress: totalSlides > 0 ? ((currentIndex + 1) / totalSlides) * 100 : 0,
  }
}
