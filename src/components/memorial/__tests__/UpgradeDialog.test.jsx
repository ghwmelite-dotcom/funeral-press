import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks (declared before dynamic imports) ─────────────────────────────────

let mockUser = { id: 'u1', email: 'user@test.com' }
const mockNotify = vi.fn()
const mockInitLifetime = vi.fn()
const mockSubscribe = vi.fn()
const mockVerify = vi.fn()

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}))
vi.mock('../../ui/notification.jsx', () => ({
  useNotification: () => ({ notify: mockNotify }),
}))
vi.mock('../../../utils/memorialApi', () => ({
  initMemorialTierLifetime: (...args) => mockInitLifetime(...args),
  subscribeMemorialTier:    (...args) => mockSubscribe(...args),
  verifyMemorialPremium:    (...args) => mockVerify(...args),
}))

// Paystack popup mock — mirrors TributeWall / LightCandleDialog test pattern
const mockNewTransaction = vi.fn()
function MockPaystackPop() {
  this.newTransaction = mockNewTransaction
}

vi.mock('../../../utils/paystack', () => ({
  loadPaystackInline: vi.fn(() => Promise.resolve(MockPaystackPop)),
  PAYSTACK_PUBLIC_KEY: 'pk_test',
}))

// Radix Dialog stub — jsdom doesn't support pointer-events
vi.mock('../../ui/dialog.jsx', () => ({
  Dialog:            ({ open, children }) => (open ? <div>{children}</div> : null),
  DialogContent:     ({ children }) => <div role="dialog">{children}</div>,
  DialogHeader:      ({ children }) => <div>{children}</div>,
  DialogTitle:       ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children, id }) => <p id={id}>{children}</p>,
}))

// window.location.href mock
const originalLocation = window.location
beforeEach(() => {
  delete window.location
  window.location = { href: '' }
})
afterEach(() => {
  window.location = originalLocation
})

import UpgradeDialog from '../UpgradeDialog.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderDialog(props = {}) {
  return render(
    <UpgradeDialog
      memorialId="m1"
      open={true}
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      {...props}
    />
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UpgradeDialog', () => {
  beforeEach(() => {
    mockUser = { id: 'u1', email: 'user@test.com' }
    mockNotify.mockClear()
    mockInitLifetime.mockReset()
    mockSubscribe.mockReset()
    mockVerify.mockReset()
    mockNewTransaction.mockReset()
    window.location.href = ''
  })

  // ── Price rendering ─────────────────────────────────────────────────────────

  it('renders Premium and Heritage tier cards', () => {
    renderDialog()
    expect(screen.getByTestId('tier-card-premium')).toBeInTheDocument()
    expect(screen.getByTestId('tier-card-heritage')).toBeInTheDocument()
  })

  it('shows correct lifetime prices for both tiers (Premium GHS 300, Heritage GHS 700)', () => {
    renderDialog()
    // Lifetime is the default plan toggle; confirm button shows price
    expect(screen.getByTestId('plan-toggle-lifetime').getAttribute('aria-checked')).toBe('true')
    // Select premium (default) — confirm button text
    expect(screen.getByTestId('upgrade-confirm-btn').textContent).toMatch(/GHS 300/)
    // Switch to heritage
    fireEvent.click(screen.getByTestId('tier-card-heritage'))
    expect(screen.getByTestId('upgrade-confirm-btn').textContent).toMatch(/GHS 700/)
  })

  it('shows correct annual prices for both tiers (Premium GHS 120, Heritage GHS 280)', () => {
    renderDialog()
    // Switch to annual
    fireEvent.click(screen.getByTestId('plan-toggle-annual'))
    // Premium selected by default
    expect(screen.getByTestId('upgrade-confirm-btn').textContent).toMatch(/GHS 120/)
    // Switch to heritage
    fireEvent.click(screen.getByTestId('tier-card-heritage'))
    expect(screen.getByTestId('upgrade-confirm-btn').textContent).toMatch(/GHS 280/)
  })

  // ── Feature lists ───────────────────────────────────────────────────────────

  it('Heritage card shows custom-domain and multi-language features; Premium does not', () => {
    renderDialog()
    const heritageCard = screen.getByTestId('tier-card-heritage')
    expect(heritageCard).toHaveTextContent(/Custom domain/i)
    expect(heritageCard).toHaveTextContent(/Multi-language pages/i)

    const premiumCard = screen.getByTestId('tier-card-premium')
    expect(premiumCard).not.toHaveTextContent(/Custom domain/i)
    expect(premiumCard).not.toHaveTextContent(/Multi-language pages/i)
  })

  it('both cards show shared rank-1 features', () => {
    renderDialog()
    for (const testId of ['tier-card-premium', 'tier-card-heritage']) {
      const card = screen.getByTestId(testId)
      expect(card).toHaveTextContent(/Unlimited photos/i)
      expect(card).toHaveTextContent(/All premium themes/i)
      expect(card).toHaveTextContent(/AI tribute video/i)
      expect(card).toHaveTextContent(/Remove FuneralPress branding/i)
      expect(card).toHaveTextContent(/Password protection/i)
    }
  })

  // ── Lifetime flow ───────────────────────────────────────────────────────────

  it('lifetime + Premium: calls initMemorialTierLifetime then launches PaystackPop, then verifyMemorialPremium on success, then onSuccess', async () => {
    mockInitLifetime.mockResolvedValue({
      reference: 'REF_LT_1',
      amount:    30000,
      email:     'user@test.com',
      currency:  'GHS',
    })
    mockVerify.mockResolvedValue({ active: true })

    const onSuccess = vi.fn()
    renderDialog({ onSuccess })

    // Default: lifetime + premium
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(mockInitLifetime).toHaveBeenCalledWith('m1', 'premium', 'GHS')
    )

    expect(mockNewTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        key:      'pk_test',
        email:    'user@test.com',
        amount:   30000,
        currency: 'GHS',
        ref:      'REF_LT_1',
      })
    )

    // Simulate Paystack onSuccess callback
    const { onSuccess: paystackSuccess } = mockNewTransaction.mock.calls[0][0]
    await paystackSuccess({ reference: 'REF_LT_1' })

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith('REF_LT_1'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(screen.getByTestId('upgrade-thank-you')).toBeInTheDocument()
  })

  it('shows thank-you state after successful lifetime verify', async () => {
    mockInitLifetime.mockResolvedValue({
      reference: 'REF_LT_2',
      amount:    30000,
      email:     'user@test.com',
      currency:  'GHS',
    })
    mockVerify.mockResolvedValue({ active: true })

    renderDialog()
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() => expect(mockNewTransaction).toHaveBeenCalled())
    const { onSuccess: paystackSuccess } = mockNewTransaction.mock.calls[0][0]
    await paystackSuccess({ reference: 'REF_LT_2' })

    await waitFor(() =>
      expect(screen.getByTestId('upgrade-thank-you')).toBeInTheDocument()
    )
  })

  // ── Annual flow ─────────────────────────────────────────────────────────────

  it('annual + Heritage: calls subscribeMemorialTier and redirects to authorization_url', async () => {
    mockSubscribe.mockResolvedValue({ authorization_url: 'https://paystack.test/checkout/xyz' })

    renderDialog()

    // Switch plan to annual, tier to heritage
    fireEvent.click(screen.getByTestId('plan-toggle-annual'))
    fireEvent.click(screen.getByTestId('tier-card-heritage'))
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(mockSubscribe).toHaveBeenCalledWith('m1', 'heritage', 'GHS')
    )

    await waitFor(() =>
      expect(window.location.href).toBe('https://paystack.test/checkout/xyz')
    )
  })

  it('annual + Premium: calls subscribeMemorialTier with "premium"', async () => {
    mockSubscribe.mockResolvedValue({ authorization_url: 'https://paystack.test/checkout/abc' })

    renderDialog()
    fireEvent.click(screen.getByTestId('plan-toggle-annual'))
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(mockSubscribe).toHaveBeenCalledWith('m1', 'premium', 'GHS')
    )
  })

  // ── Auth guard ──────────────────────────────────────────────────────────────

  it('prompts sign-in and does not call any payment API when logged out', async () => {
    mockUser = null
    renderDialog()
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/sign in/i),
        'info'
      )
    )
    expect(mockInitLifetime).not.toHaveBeenCalled()
    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  it('shows error when initMemorialTierLifetime rejects', async () => {
    mockInitLifetime.mockRejectedValue(new Error('Network error'))

    renderDialog()
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/Network error/i)
    )
  })

  it('shows error when subscribeMemorialTier rejects', async () => {
    mockSubscribe.mockRejectedValue(new Error('Subscription failed'))

    renderDialog()
    fireEvent.click(screen.getByTestId('plan-toggle-annual'))
    fireEvent.click(screen.getByTestId('upgrade-confirm-btn'))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/Subscription failed/i)
    )
  })

  // ── Dialog closed when open=false ───────────────────────────────────────────

  it('renders nothing when open is false', () => {
    render(
      <UpgradeDialog
        memorialId="m1"
        open={false}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
