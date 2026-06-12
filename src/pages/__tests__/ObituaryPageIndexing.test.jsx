// src/pages/__tests__/ObituaryPageIndexing.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import ObituaryPage from '../ObituaryPage.jsx'

function mockObituary(searchIndexable) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      obituary: {
        slug: 'kofi-mensah', deceasedName: 'Kofi Mensah', biography: 'A beloved father and teacher.',
        birthDate: '1950-01-01', deathDate: '2026-05-01', searchIndexable,
      },
    }),
  })))
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/obituary/kofi-mensah']}>
        <Routes><Route path="/obituary/:slug" element={<ObituaryPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>
  )
}

function getRobotsContent() {
  const el = document.querySelector('meta[name="robots"]')
  return el ? el.getAttribute('content') : null
}

describe('ObituaryPage indexing meta', () => {
  beforeEach(() => vi.restoreAllMocks())


  it('emits noindex when the family has not opted in', async () => {
    mockObituary(false)
    renderPage()
    await waitFor(() => {
      const content = getRobotsContent()
      expect(content).toBeTruthy()
      expect(content).toContain('noindex')
    })
  })

  it('omits noindex when the family opted in', async () => {
    mockObituary(true)
    renderPage()
    // Wait for the obituary data to load (the title will contain the name)
    await waitFor(() => {
      const titleEl = document.querySelector('title')
      expect(titleEl?.textContent || '').toContain('Kofi Mensah')
    })
    expect(getRobotsContent() || '').not.toContain('noindex')
  })
})
