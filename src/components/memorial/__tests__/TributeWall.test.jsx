import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks (must be declared before dynamic imports) ─────────────────────────

const mockGetTributes = vi.fn()
const mockInitTribute  = vi.fn()
const mockVerifyTribute = vi.fn()

vi.mock('../../../utils/memorialApi', () => ({
  getTributes:   (...args) => mockGetTributes(...args),
  initTribute:   (...args) => mockInitTribute(...args),
  verifyTribute: (...args) => mockVerifyTribute(...args),
}))

// Paystack popup mock — mirrors UpgradeTributeCard.test pattern
const mockNewTransaction = vi.fn()
function MockPaystackPop() {
  this.newTransaction = mockNewTransaction
}

vi.mock('../../../utils/paystack', () => ({
  loadPaystackInline: vi.fn(() => Promise.resolve(MockPaystackPop)),
  PAYSTACK_PUBLIC_KEY: 'pk_test',
}))

// Radix Dialog: jsdom doesn't support pointer-events; stub with a simple wrapper
vi.mock('../../ui/dialog.jsx', () => ({
  Dialog: ({ open, children }) => (open ? <div>{children}</div> : null),
  DialogContent:     ({ children }) => <div role="dialog">{children}</div>,
  DialogHeader:      ({ children }) => <div>{children}</div>,
  DialogTitle:       ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children, id }) => <p id={id}>{children}</p>,
}))

import TributeWall     from '../TributeWall.jsx'
import LightCandleDialog from '../LightCandleDialog.jsx'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TRIBUTE_LIST = [
  { id: '1', type: 'candle',  author_name: 'Ama Mensah',   message: 'Rest in peace.',   created_at: new Date(Date.now() - 3_600_000).toISOString() },
  { id: '2', type: 'flowers', author_name: 'Kofi Boateng', message: '',                  created_at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: '3', type: 'tribute', author_name: 'Adjoa Asante', message: 'A wonderful soul.', created_at: new Date(Date.now() - 172_800_000).toISOString() },
]
const COUNTS = { candle: 1, flowers: 1, tribute: 1 }

// ─── TributeWall tests ────────────────────────────────────────────────────────

describe('TributeWall', () => {
  beforeEach(() => {
    mockGetTributes.mockReset()
    mockInitTribute.mockReset()
    mockVerifyTribute.mockReset()
    mockNewTransaction.mockReset()
  })

  it('renders tributes and count header when the API returns items', async () => {
    mockGetTributes.mockResolvedValue({ tributes: TRIBUTE_LIST, counts: COUNTS })

    render(<TributeWall memorialId="m1" deceasedName="Yaw Darko" />)

    await waitFor(() =>
      expect(screen.getByTestId('tribute-list')).toBeInTheDocument()
    )

    // Count label
    expect(screen.getByTestId('count-label').textContent).toMatch(/1 candle/)
    expect(screen.getByTestId('count-label').textContent).toMatch(/1 flower/)
    expect(screen.getByTestId('count-label').textContent).toMatch(/1 tribute/)

    // Three items rendered
    expect(screen.getAllByTestId('tribute-item')).toHaveLength(3)
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    expect(screen.getByText('Rest in peace.')).toBeInTheDocument()
  })

  it('shows empty state when there are no tributes', async () => {
    mockGetTributes.mockResolvedValue({ tributes: [], counts: { candle: 0, flowers: 0, tribute: 0 } })

    render(<TributeWall memorialId="m1" deceasedName="Yaw Darko" />)

    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    )
    expect(screen.getByTestId('empty-state').textContent).toMatch(/Yaw Darko/)
  })

  it('opens the dialog when the "Light a candle" button is clicked', async () => {
    mockGetTributes.mockResolvedValue({ tributes: [], counts: { candle: 0, flowers: 0, tribute: 0 } })

    render(<TributeWall memorialId="m1" deceasedName="Yaw Darko" />)
    await waitFor(() => screen.getByTestId('empty-state'))

    fireEvent.click(screen.getByRole('button', { name: /Light a candle/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

// ─── LightCandleDialog tests ─────────────────────────────────────────────────

describe('LightCandleDialog', () => {
  beforeEach(() => {
    mockGetTributes.mockReset()
    mockInitTribute.mockReset()
    mockVerifyTribute.mockReset()
    mockNewTransaction.mockReset()
  })

  function renderDialog(props = {}) {
    return render(
      <LightCandleDialog
        memorialId="m1"
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
        {...props}
      />
    )
  }

  it('shows all 3 products with correct GHS prices from config', () => {
    renderDialog()
    // candle = GHS 10, flowers = GHS 20, tribute = GHS 50 (pesewas / 100)
    // Product picker buttons all carry aria-pressed; query by that to be specific
    const pressed = screen.getAllByRole('button', { pressed: true })
    expect(pressed).toHaveLength(1) // candle is selected by default
    const notPressed = screen.getAllByRole('button', { pressed: false })
    expect(notPressed.length).toBeGreaterThanOrEqual(2) // flowers + tribute

    // All three GHS prices rendered
    expect(screen.getByText('GHS 10')).toBeInTheDocument()
    expect(screen.getByText('GHS 20')).toBeInTheDocument()
    expect(screen.getByText('GHS 50')).toBeInTheDocument()
    // Product labels
    expect(screen.getAllByText(/Light a candle/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Lay flowers')).toBeInTheDocument()
    expect(screen.getByText('Leave a tribute')).toBeInTheDocument()
  })

  it('enforces the selected product maxMessage on the textarea', () => {
    renderDialog()

    // Default product is candle (maxMessage = 80)
    const textarea = screen.getByPlaceholderText(/Share a memory/i)
    expect(textarea).toHaveAttribute('maxLength', '80')

    // Switch to tribute product picker button (aria-pressed=false means not selected)
    const tribBtn = screen.getByRole('button', { name: /Leave a tribute/i })
    fireEvent.click(tribBtn)
    expect(textarea).toHaveAttribute('maxLength', '500')
  })

  it('calls initTribute with correct args then launches Paystack popup', async () => {
    mockInitTribute.mockResolvedValue({ authorization_url: 'https://pay.test', reference: 'REF_1' })
    mockVerifyTribute.mockResolvedValue({ paid: true })

    const onSuccess = vi.fn()
    renderDialog({ onSuccess })

    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Ama Mensah' } })
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'ama@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Share a memory/i), { target: { value: 'With love.' } })

    // The submit button text includes price: "Light a candle — GHS 10"
    fireEvent.click(screen.getByRole('button', { name: /Light a candle — GHS/i }))

    await waitFor(() =>
      expect(mockInitTribute).toHaveBeenCalledWith('m1', {
        type:       'candle',
        authorName: 'Ama Mensah',
        email:      'ama@test.com',
        message:    'With love.',
      })
    )

    // Paystack popup was constructed and newTransaction was called
    expect(mockNewTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        key:    'pk_test',
        email:  'ama@test.com',
        amount: 1000,
        ref:    'REF_1',
      })
    )
  })

  it('shows thank-you state after successful verify', async () => {
    mockInitTribute.mockResolvedValue({ authorization_url: 'https://pay.test', reference: 'REF_2' })
    mockVerifyTribute.mockResolvedValue({ paid: true })

    const onSuccess = vi.fn()
    renderDialog({ onSuccess })

    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Kwame Osei' } })
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'kwame@test.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Light a candle — GHS/i }))

    // Wait for initTribute to resolve, then simulate Paystack onSuccess
    await waitFor(() => expect(mockNewTransaction).toHaveBeenCalled())
    const { onSuccess: paystackOnSuccess } = mockNewTransaction.mock.calls[0][0]
    await paystackOnSuccess({ reference: 'REF_2' })

    await waitFor(() =>
      expect(screen.getByTestId('thank-you-state')).toBeInTheDocument()
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows an error if name is empty on submit', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@test.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Light a candle — GHS/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/name is required/i)
    )
    expect(mockInitTribute).not.toHaveBeenCalled()
  })
})
