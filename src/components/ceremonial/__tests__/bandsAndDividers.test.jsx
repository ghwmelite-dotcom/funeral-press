import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import KenteBand from '../KenteBand.jsx'
import CeremonialDivider from '../CeremonialDivider.jsx'

describe('KenteBand', () => {
  it('is decorative and sized by variant', () => {
    const { container, rerender } = render(<KenteBand size="page" />)
    const band = container.firstChild
    expect(band.getAttribute('aria-hidden')).toBe('true')
    expect(band.style.height).toBe('6px')
    rerender(<KenteBand size="card" />)
    expect(container.firstChild.style.height).toBe('4px')
    rerender(<KenteBand size="ribbon" />)
    expect(container.firstChild.style.width).toBe('140px')
  })
})

describe('CeremonialDivider', () => {
  it('renders hairlines around a labeled Adinkra mark', () => {
    const { container, getByRole } = render(<CeremonialDivider symbol="sankofa" />)
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/Sankofa/i)
    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2)
  })
  it('defaults to adinkrahene', () => {
    const { getByRole } = render(<CeremonialDivider />)
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/Adinkrahene/i)
  })
})
