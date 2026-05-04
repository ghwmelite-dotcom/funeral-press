import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DonatePage from '../DonatePage.jsx'
import { useDonationStore } from '../../stores/donationStore.js'

const APPROVED_MEMORIAL = {
  id: 'mem_abc',
  slug: 'akua-mensah',
  deceased_name: 'Akua Mensah',
  donation: {
    enabled: true,
    approval_status: 'approved',
    wall_mode: 'full',
    payout_momo_provider: 'mtn',
    payout_account_name: 'Akosua',
    payout_momo_number: '+233244111222',
    fx_rate: 1,
  },
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/m/akua-mensah/donate']}>
      <Routes>
        <Route path="/m/:slug/donate" element={<DonatePage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  // Reset store + mock fetch returning the approved memorial
  useDonationStore.setState({
    chargeStep: 'amount',
    chargeError: null,
    chargeLoading: false,
    amount: { displayMinor: 0, displayCurrency: 'GHS', tipPesewas: 0, includeTip: true },
    donor: { display_name: '', visibility: 'names_only', email: '', phone: '', country_code: 'GH' },
  })
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => APPROVED_MEMORIAL,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DonatePage', () => {
  it('renders Loading state before memorial is fetched', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) // never resolves
    renderRoute()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders the amount step by default after memorial loads', async () => {
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/how much would you like to donate/i)).toBeInTheDocument()
    })
  })

  it('shows "donations not available" when donation is not enabled', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...APPROVED_MEMORIAL, donation: { enabled: false } }),
    })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/donations are not available/i)).toBeInTheDocument()
    })
  })

  it('shows "donations not available" when approval is pending', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...APPROVED_MEMORIAL, donation: { ...APPROVED_MEMORIAL.donation, approval_status: 'pending' } }),
    })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/donations are not available/i)).toBeInTheDocument()
    })
  })

  it('renders DonorStep when chargeStep is "donor"', async () => {
    renderRoute()
    await waitFor(() => screen.getByText(/how much would you like to donate/i))
    useDonationStore.setState({ chargeStep: 'donor' })
    await waitFor(() => {
      expect(screen.getByText(/how would you like to appear/i)).toBeInTheDocument()
    })
  })

  it('renders ReviewStep when chargeStep is "review"', async () => {
    renderRoute()
    await waitFor(() => screen.getByText(/how much would you like to donate/i))
    useDonationStore.setState({ chargeStep: 'review' })
    await waitFor(() => {
      expect(screen.getByText('Akua Mensah')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pay with paystack/i })).toBeInTheDocument()
    })
  })

  it('renders ReviewStep with loading state when chargeStep is "redirecting"', async () => {
    renderRoute()
    await waitFor(() => screen.getByText(/how much would you like to donate/i))
    useDonationStore.setState({ chargeStep: 'redirecting' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /starting payment/i })).toBeDisabled()
    })
  })

  it('shows chargeError below the wizard when set', async () => {
    renderRoute()
    await waitFor(() => screen.getByText(/how much would you like to donate/i))
    useDonationStore.setState({ chargeError: 'Card declined. Try another method.' })
    await waitFor(() => {
      expect(screen.getByText(/card declined/i)).toBeInTheDocument()
    })
  })

  it('shows the back-to-memorial link', async () => {
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/back to memorial/i)).toBeInTheDocument()
    })
  })
})
