import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'

beforeEach(() => {
  vi.doMock('../../../utils/donationApi.js', () => ({
    donationApi: {
      adminListDonations: vi.fn().mockResolvedValue({
        donations: [
          { id: 'd1', donor_display_name: 'Akua', memorial_id: 'mem_abc', amount_pesewas: 5000, status: 'succeeded', created_at: Date.now() },
          { id: 'd2', donor_display_name: 'Anonymous', memorial_id: 'mem_xyz', amount_pesewas: 2000, status: 'pending', created_at: Date.now() - 3600000 },
        ],
        next_cursor: null,
      }),
      adminRefund: vi.fn().mockResolvedValue({ ok: true }),
    },
  }))
})

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('DonationsTab', () => {
  it('fetches and displays donations on mount', async () => {
    const { DonationsTab: Tab } = await import('../DonationsTab.jsx')
    render(<Tab />)
    await waitFor(() => {
      expect(screen.getByText('Akua')).toBeInTheDocument()
      expect(screen.getByText('Anonymous')).toBeInTheDocument()
    })
  })

  it('shows status filter pills (All + 5 statuses)', async () => {
    const { DonationsTab: Tab } = await import('../DonationsTab.jsx')
    render(<Tab />)
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /succeeded/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refunded/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disputed/i })).toBeInTheDocument()
  })

  it('renders Refund button only on succeeded donations', async () => {
    const { DonationsTab: Tab } = await import('../DonationsTab.jsx')
    render(<Tab />)
    await waitFor(() => screen.getByText('Akua'))
    // Anchored regex avoids matching the "Refunded" filter pill.
    const refundButtons = screen.getAllByRole('button', { name: /^refund$/i })
    // Only one row has status='succeeded' so we expect exactly one Refund button
    expect(refundButtons.length).toBe(1)
  })

  it('opens confirmation dialog when Refund clicked', async () => {
    const { DonationsTab: Tab } = await import('../DonationsTab.jsx')
    render(<Tab />)
    await waitFor(() => screen.getByText('Akua'))
    fireEvent.click(screen.getByRole('button', { name: /^refund$/i }))
    await waitFor(() => {
      // Dialog title (h2) — distinguishes from the "Confirm refund" button.
      expect(screen.getByRole('heading', { name: /confirm refund/i })).toBeInTheDocument()
    })
  })

  it('shows empty state when no donations', async () => {
    vi.resetModules()
    vi.doMock('../../../utils/donationApi.js', () => ({
      donationApi: {
        adminListDonations: vi.fn().mockResolvedValue({ donations: [], next_cursor: null }),
        adminRefund: vi.fn(),
      },
    }))
    const { DonationsTab: Tab } = await import('../DonationsTab.jsx')
    render(<Tab />)
    await waitFor(() => {
      expect(screen.getByText(/no donations/i)).toBeInTheDocument()
    })
  })
})
