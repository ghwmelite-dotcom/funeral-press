// src/pages/__tests__/DiasporaPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import DiasporaPage from '../landing/DiasporaPage.jsx'
import { DIASPORA_PAGES } from '../../data/diasporaPages.js'

describe('DiasporaPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ country: 'GB', currency: 'USD' }) })))
  })

  function renderSlug(slug) {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/diaspora/${slug}`]}>
          <Routes>
            <Route path="/diaspora/:slug" element={<DiasporaPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    )
  }

  it('declares all five spec pages with required fields', () => {
    expect(Object.keys(DIASPORA_PAGES)).toEqual([
      'plan-a-funeral-in-ghana-from-abroad',
      'watch-a-funeral-from-abroad',
      'funeral-order-of-service-template',
      'send-condolences-to-ghana',
      'nigeria',
    ])
    for (const page of Object.values(DIASPORA_PAGES)) {
      expect(page.title.length).toBeGreaterThan(10)
      expect(page.description.length).toBeGreaterThan(50)
      expect(page.h1.length).toBeGreaterThan(10)
      expect(page.sections.length).toBeGreaterThanOrEqual(4)
      expect(page.faqs.length).toBeGreaterThanOrEqual(5)
    }
  })

  it('renders the hub page with its H1 and FAQs', () => {
    renderSlug('plan-a-funeral-in-ghana-from-abroad')
    expect(screen.getByRole('heading', { level: 1, name: /plan a funeral in ghana from abroad/i })).toBeInTheDocument()
    expect(screen.getAllByText(/shared budget planner/i).length).toBeGreaterThan(0)
  })

  it('renders a 404-style fallback for unknown slugs', () => {
    renderSlug('not-a-page')
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})
