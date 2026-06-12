import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AuroraField from '../AuroraField.jsx'

describe('AuroraField', () => {
  it('renders exactly two aurora blobs, one sweep, and at most six twinkles', () => {
    const { container } = render(<AuroraField twinkles={9} />)
    expect(container.querySelectorAll('[data-aurora]').length).toBe(2)
    expect(container.querySelectorAll('[data-sweep]').length).toBe(1)
    expect(container.querySelectorAll('[data-twinkle]').length).toBe(6) // capped
  })
  it('is entirely decorative', () => {
    const { container } = render(<AuroraField />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
  })
  it('omits twinkles when mist mode is forced', () => {
    const { container } = render(<AuroraField mist />)
    expect(container.querySelectorAll('[data-twinkle]').length).toBe(0)
  })
})
