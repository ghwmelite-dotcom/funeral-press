import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { FamilyHeadApprovalView } from '../FamilyHeadApprovalView.jsx'

const MEMORIAL = {
  id: 'mem_abc',
  family_head_name: 'Akosua Mensah',
  family_head_phone: '+233244111222',
  deceased_name: 'Akua Mensah',
  dates: '1948 — 2025',
  creator_name: 'Kwame B.',
  donation: {
    payout_momo_provider: 'mtn',
    payout_momo_number: '+233244111222',
    payout_account_name: 'Akosua Mensah',
    goal_amount_pesewas: 5000000,
    wall_mode: 'full',
  },
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('FamilyHeadApprovalView (default — phone auth disabled)', () => {
  it('renders memorial details', () => {
    render(<FamilyHeadApprovalView memorial={MEMORIAL} token="tok_xyz" />)
    expect(screen.getByText(/Akosua Mensah/)).toBeInTheDocument()
    expect(screen.getByText('Akua Mensah')).toBeInTheDocument()
    expect(screen.getByText(/1948/)).toBeInTheDocument()
  })

  it('renders donation summary (provider, account, wall mode)', () => {
    render(<FamilyHeadApprovalView memorial={MEMORIAL} token="tok_xyz" />)
    expect(screen.getByText(/MTN MoMo/i)).toBeInTheDocument()
    expect(screen.getByText(/Akosua Mensah/)).toBeInTheDocument()
    expect(screen.getByText(/wall mode: full/i)).toBeInTheDocument()
  })

  it('shows the unavailable message when VITE_PHONE_AUTH_ENABLED is unset', () => {
    render(<FamilyHeadApprovalView memorial={MEMORIAL} token="tok_xyz" />)
    expect(screen.getByText(/phone verification.*unavailable/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /verify with sms code/i })).toBeNull()
  })
})

describe('FamilyHeadApprovalView with VITE_PHONE_AUTH_ENABLED=true', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PHONE_AUTH_ENABLED', 'true')
    vi.resetModules()
  })

  it('shows Verify with SMS code button initially', async () => {
    const { FamilyHeadApprovalView: View } = await import('../FamilyHeadApprovalView.jsx')
    render(<View memorial={MEMORIAL} token="tok_xyz" />)
    expect(screen.getByRole('button', { name: /verify with sms code/i })).toBeInTheDocument()
  })

  it('moves to OTP stage after clicking Verify', async () => {
    vi.doMock('../../../utils/donationApi.js', () => ({
      phoneAuthApi: {
        sendOtp: vi.fn().mockResolvedValue({ ok: true }),
        verify: vi.fn(),
      },
      donationApi: { approve: vi.fn(), reject: vi.fn() },
    }))
    const { FamilyHeadApprovalView: View } = await import('../FamilyHeadApprovalView.jsx')
    render(<View memorial={MEMORIAL} token="tok_xyz" />)
    fireEvent.click(screen.getByRole('button', { name: /verify with sms code/i }))
    await waitFor(() => {
      expect(screen.getByText(/Code sent to/i)).toBeInTheDocument()
    })
  })

  it('shows decision buttons after OTP verification', async () => {
    vi.doMock('../../../utils/donationApi.js', () => ({
      phoneAuthApi: {
        sendOtp: vi.fn().mockResolvedValue({ ok: true }),
        verify: vi.fn().mockResolvedValue({ ok: true }),
      },
      donationApi: { approve: vi.fn(), reject: vi.fn() },
    }))
    const { FamilyHeadApprovalView: View } = await import('../FamilyHeadApprovalView.jsx')
    render(<View memorial={MEMORIAL} token="tok_xyz" />)
    fireEvent.click(screen.getByRole('button', { name: /verify with sms code/i }))
    await waitFor(() => screen.getByText(/Code sent to/i))

    // Type 6 digits — set value via the OtpCodeInput's onChange (simulated by focusing
    // first input and typing). Easier: manipulate the underlying state by calling
    // each input directly.
    const inputs = screen.getAllByLabelText(/Digit \d/)
    for (let i = 0; i < 6; i++) {
      fireEvent.change(inputs[i], { target: { value: String(i + 1) } })
    }

    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    })
  })

  it('shows approval success in done stage', async () => {
    vi.doMock('../../../utils/donationApi.js', () => ({
      phoneAuthApi: {
        sendOtp: vi.fn().mockResolvedValue({ ok: true }),
        verify: vi.fn().mockResolvedValue({ ok: true }),
      },
      donationApi: {
        approve: vi.fn().mockResolvedValue({ ok: true }),
        reject: vi.fn(),
      },
    }))
    const { FamilyHeadApprovalView: View } = await import('../FamilyHeadApprovalView.jsx')
    render(<View memorial={MEMORIAL} token="tok_xyz" />)

    fireEvent.click(screen.getByRole('button', { name: /verify with sms code/i }))
    await waitFor(() => screen.getByText(/Code sent to/i))
    const inputs = screen.getAllByLabelText(/Digit \d/)
    for (let i = 0; i < 6; i++) {
      fireEvent.change(inputs[i], { target: { value: String(i + 1) } })
    }
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))
    await waitFor(() => screen.getByRole('button', { name: /approve/i }))
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => {
      expect(screen.getByText(/approved/i)).toBeInTheDocument()
    })
  })
})
