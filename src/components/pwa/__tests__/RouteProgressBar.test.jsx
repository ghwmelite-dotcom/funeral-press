import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RouteProgressBar from '../RouteProgressBar'

describe('RouteProgressBar', () => {
  it('renders nothing on first mount (no navigation has occurred)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <RouteProgressBar />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders without throwing', () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <RouteProgressBar />
        </MemoryRouter>
      )
    }).not.toThrow()
  })
})
