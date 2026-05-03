import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PageTransition from '../PageTransition'

describe('PageTransition', () => {
  it('renders children without throwing', () => {
    const { getByText } = render(
      <MemoryRouter>
        <PageTransition>
          <div>Hello</div>
        </PageTransition>
      </MemoryRouter>
    )
    expect(getByText('Hello')).toBeTruthy()
  })

  it('renders in enter state on first mount', () => {
    const { container } = render(
      <MemoryRouter>
        <PageTransition>
          <div>Content</div>
        </PageTransition>
      </MemoryRouter>
    )
    expect(container.firstChild.className).toMatch(/opacity-100/)
  })
})
