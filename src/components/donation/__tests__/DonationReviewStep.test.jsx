import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { DonationReviewStep } from '../DonationReviewStep.jsx'
import { useDonationStore } from '../../../stores/donationStore.js'

beforeEach(() => {
  useDonationStore.setState({
    amount: { displayMinor: 5000, displayCurrency: 'GHS', tipPesewas: 250, includeTip: true },
  })
})

const memorial = {
  deceased_name: 'Akua Mensah',
  dates: '1948 — 2025',
  donation: {
    fx_rate: 1,
    payout_momo_provider: 'mtn',
    payout_account_name: 'Akosua Mensah',
    payout_momo_number: '+233244111222',
  },
}

describe('DonationReviewStep', () => {
  it('renders deceased name and dates', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    expect(screen.getByText('Akua Mensah')).toBeInTheDocument()
    expect(screen.getByText('1948 — 2025')).toBeInTheDocument()
  })

  it('shows Donation, Tip, and Total breakdown when tip is included', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    expect(screen.getByText('Donation')).toBeInTheDocument()
    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('omits the Tip line when includeTip is false', () => {
    useDonationStore.setState({
      amount: { displayMinor: 5000, displayCurrency: 'GHS', tipPesewas: 250, includeTip: false },
    })
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    expect(screen.queryByText('Tip')).toBeNull()
  })

  it('shows MoMo provider in uppercase', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    expect(screen.getByText(/MTN MoMo/i)).toBeInTheDocument()
  })

  it('masks the payout MoMo number', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    // Original: +233244111222 → +233****222
    expect(screen.getByText(/\+233.*222/)).toBeInTheDocument()
    expect(screen.queryByText('+233244111222')).toBeNull()
  })

  it('masks the payout account name', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} />)
    // 'Akosua Mensah' → 'A***** M*****'
    expect(screen.queryByText('Akosua Mensah')).toBeNull()
  })

  it('disables Pay button while loading', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} loading={true} />)
    expect(screen.getByRole('button', { name: /starting payment/i })).toBeDisabled()
  })

  it('disables Back button while loading', () => {
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={() => {}} loading={true} />)
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
  })

  it('calls onPay when Pay button clicked', () => {
    const onPay = vi.fn()
    render(<DonationReviewStep memorial={memorial} onBack={() => {}} onPay={onPay} />)
    fireEvent.click(screen.getByRole('button', { name: /pay with paystack/i }))
    expect(onPay).toHaveBeenCalled()
  })

  it('calls onBack when Back button clicked', () => {
    const onBack = vi.fn()
    render(<DonationReviewStep memorial={memorial} onBack={onBack} onPay={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
