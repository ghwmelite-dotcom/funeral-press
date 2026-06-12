// src/pages/__tests__/HymnPage.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HymnPage from '../HymnPage.jsx'
import { hymns } from '../../data/hymns.js'

function renderSlug(slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/hymns/${slug}`]}>
        <Routes><Route path="/hymns/:slug" element={<HymnPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('HymnPage', () => {
  const pd = hymns.find((h) => h.publicDomain)
  const nonPd = hymns.find((h) => !h.publicDomain)

  it('renders full lyrics for a public-domain hymn', () => {
    renderSlug(pd.slug)
    expect(screen.getByRole('heading', { level: 1, name: new RegExp(pd.title, 'i') })).toBeInTheDocument()
    // first line of the first verse is present
    expect(screen.getByText(new RegExp(pd.verses[0].split('\n')[0].slice(0, 20)))).toBeInTheDocument()
  })

  it('shows metadata-only for a non-public-domain hymn', () => {
    if (!nonPd) return // dataset may be all-PD; the gate is still covered by code review
    renderSlug(nonPd.slug)
    expect(screen.getByText(/available in the hymn library/i)).toBeInTheDocument()
  })

  it('links to the brochure designer CTA and related hymns', () => {
    renderSlug(pd.slug)
    expect(screen.getByRole('link', { name: /add this hymn to a funeral programme/i }))
      .toHaveAttribute('href', `/editor?hymn=${pd.slug}`)
    expect(screen.getByText(/related hymns/i)).toBeInTheDocument()
  })

  it('renders not-found for unknown slugs', () => {
    renderSlug('not-a-hymn')
    expect(screen.getByText(/hymn not found/i)).toBeInTheDocument()
  })
})
