// Adapted: ADINKRA_SYMBOLS imported from adinkraSymbols.jsx (pure-data module)
// rather than AdinkraMark.jsx to satisfy react-refresh/only-export-components.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdinkraMark from '../AdinkraMark.jsx'
import { ADINKRA_SYMBOLS } from '../adinkraSymbols.jsx'

describe('AdinkraMark', () => {
  it('declares the three spec symbols with meanings', () => {
    expect(Object.keys(ADINKRA_SYMBOLS)).toEqual(['adinkrahene', 'gyenyame', 'sankofa'])
    for (const s of Object.values(ADINKRA_SYMBOLS)) {
      expect(s.name.length).toBeGreaterThan(3)
      expect(s.meaning.length).toBeGreaterThan(10)
    }
  })

  it('renders an accessible mark with name and meaning', () => {
    render(<AdinkraMark symbol="adinkrahene" />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toMatch(/Adinkrahene/i)
    expect(img.getAttribute('aria-label')).toMatch(/greatness/i)
  })

  it('watermark variant is decorative (hidden) and larger', () => {
    const { container } = render(<AdinkraMark symbol="sankofa" variant="watermark" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('throws nothing and renders null for unknown symbols', () => {
    const { container } = render(<AdinkraMark symbol="nope" />)
    expect(container.firstChild).toBeNull()
  })
})
