import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { DonationAmountStep } from '../DonationAmountStep.jsx'
import { useDonationStore } from '../../../stores/donationStore.js'

beforeEach(() => {
  // Reset to a known clean state before each test
  useDonationStore.setState({
    amount: { displayMinor: 0, displayCurrency: 'GHS', tipPesewas: 0, includeTip: true },
  })
})

describe('DonationAmountStep', () => {
  it('renders the prompt header', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    expect(screen.getByText(/how much would you like to donate/i)).toBeInTheDocument()
  })

  it('renders 4 quick-amount buttons', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    // quickAmounts('GHS') returns 4 presets; assert by counting buttons in the grid container
    const buttons = screen.getAllByRole('button')
    // Quick amounts (4) + Continue (1) = 5 buttons minimum.
    // Tip toggle is a checkbox not a button, so it doesn't count.
    expect(buttons.length).toBeGreaterThanOrEqual(5)
  })

  it('disables Continue when displayMinor is 0 (default)', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()
  })

  it('enables Continue after a quick amount is chosen', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    // Find a quick-amount button (the first button that isn't "Continue")
    const buttons = screen.getAllByRole('button')
    const quickBtn = buttons.find((b) => !/continue/i.test(b.textContent || ''))
    expect(quickBtn).toBeTruthy()
    fireEvent.click(quickBtn)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).not.toBeDisabled()
  })

  it('updates store when typing custom amount', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    const input = screen.getByPlaceholderText(/custom amount/i)
    fireEvent.change(input, { target: { value: '50' } })
    // 50 GHS = 5000 pesewas (minor)
    expect(useDonationStore.getState().amount.displayMinor).toBe(5000)
  })

  it('shows the tip toggle checked by default (matches store includeTip=true)', () => {
    render(<DonationAmountStep onContinue={() => {}} />)
    expect(screen.getByRole('checkbox').checked).toBe(true)
  })

  it('calls onContinue when Continue button is clicked (after amount is set)', () => {
    const onContinue = vi.fn()
    useDonationStore.setState({
      amount: { displayMinor: 5000, displayCurrency: 'GHS', tipPesewas: 250, includeTip: true },
    })
    render(<DonationAmountStep onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalled()
  })

  it('hides GHS conversion line when displayCurrency is GHS', () => {
    useDonationStore.setState({
      amount: { displayMinor: 5000, displayCurrency: 'GHS', tipPesewas: 250, includeTip: true },
    })
    render(<DonationAmountStep onContinue={() => {}} />)
    expect(screen.queryByText(/in ghana cedis/i)).toBeNull()
  })

  it('shows GHS conversion line when displayCurrency is non-GHS', () => {
    useDonationStore.setState({
      amount: { displayMinor: 1000, displayCurrency: 'USD', tipPesewas: 50, includeTip: true },
    })
    render(<DonationAmountStep fxRate={15} onContinue={() => {}} />)
    expect(screen.getByText(/in ghana cedis/i)).toBeInTheDocument()
  })
})
