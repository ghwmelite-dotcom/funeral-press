import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HonourPage from '../HonourPage.jsx'

describe('HonourPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  function renderPage(initialEntry = '/honour') {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <HonourPage />
        </MemoryRouter>
      </HelmetProvider>
    )
  }

  it('renders the hero headline', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /honour someone you've lost/i })).toBeInTheDocument()
  })

  it('links to the memorial creator and brochure designer', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /create a memorial page/i })).toHaveAttribute('href', '/memorial-page-creator')
    expect(screen.getByRole('link', { name: /design a funeral programme/i })).toHaveAttribute('href', '/funeral-brochure-designer')
  })
})
