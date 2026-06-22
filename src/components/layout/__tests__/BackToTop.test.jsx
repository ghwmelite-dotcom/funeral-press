import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import BackToTop from '../BackToTop'

function setScrollY(y) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

describe('BackToTop', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    setScrollY(0)
  })

  it('renders an accessible button, hidden until scrolled', () => {
    render(<BackToTop />)
    const btn = screen.getByRole('button', { name: /back to top/i })
    expect(btn.className).toContain('opacity-0')
    expect(btn.className).toContain('pointer-events-none')
    expect(btn).toHaveAttribute('tabindex', '-1')
  })

  it('appears (and becomes focusable) after scrolling past the threshold', () => {
    render(<BackToTop />)
    act(() => {
      setScrollY(500)
      window.dispatchEvent(new Event('scroll'))
    })
    const btn = screen.getByRole('button', { name: /back to top/i })
    expect(btn.className).toContain('opacity-100')
    expect(btn).toHaveAttribute('tabindex', '0')
  })

  it('smooth-scrolls to the top on click', () => {
    render(<BackToTop />)
    fireEvent.click(screen.getByRole('button', { name: /back to top/i }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('honours prefers-reduced-motion (jumps instantly)', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    render(<BackToTop />)
    fireEvent.click(screen.getByRole('button', { name: /back to top/i }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
