import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DonationThanksPage from '../DonationThanksPage.jsx'

const DONATION = {
  id: 'don_123',
  deceased_name: 'Akua Mensah',
  dates: '1948 — 2025',
  amount_display: 'GHS 50',
  donor_display_name: 'Kwame B.',
  display_amount_minor: 5000,
  display_currency: 'GHS',
  momo_provider: 'mtn',
}

function renderRoute(initialEntry = '/m/akua-mensah/thanks?ref=ref_abc') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/m/:slug/thanks" element={<DonationThanksPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => DONATION,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DonationThanksPage', () => {
  it('renders success heading', () => {
    renderRoute()
    expect(screen.getByText(/your donation was successful/i)).toBeInTheDocument()
  })

  it('renders the soft-capture prompt heading', () => {
    renderRoute()
    expect(screen.getByText(/save this donation to your profile/i)).toBeInTheDocument()
  })

  it('renders "No thanks" link back to memorial', () => {
    renderRoute()
    const link = screen.getByText(/no thanks/i)
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/m/akua-mensah')
  })

  it('fetches and displays donation details by reference', async () => {
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/honouring Akua Mensah/i)).toBeInTheDocument()
    })
  })

  it('shows MoMo provider in uppercase in the success message', async () => {
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/MTN MoMo/i)).toBeInTheDocument()
    })
  })

  it('does not fetch when no ref query param provided', () => {
    renderRoute('/m/akua-mensah/thanks')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('hides "Continue with phone" button when VITE_PHONE_AUTH_ENABLED is unset', () => {
    renderRoute()
    expect(screen.queryByText(/continue with phone/i)).toBeNull()
  })
})

describe('DonationThanksPage with VITE_PHONE_AUTH_ENABLED=true', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PHONE_AUTH_ENABLED', 'true')
    vi.resetModules()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DONATION,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('shows "Continue with phone" button', async () => {
    const { default: ThanksPage } = await import('../DonationThanksPage.jsx')
    render(
      <MemoryRouter initialEntries={['/m/akua-mensah/thanks?ref=ref_abc']}>
        <Routes>
          <Route path="/m/:slug/thanks" element={<ThanksPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/continue with phone/i)).toBeInTheDocument()
  })
})
