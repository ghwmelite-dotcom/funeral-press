import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { DonationDonorStep } from '../DonationDonorStep.jsx'
import { useDonationStore } from '../../../stores/donationStore.js'

beforeEach(() => {
  useDonationStore.setState({
    donor: { display_name: '', visibility: 'names_only', email: '', phone: '', country_code: 'GH' },
  })
})

describe('DonationDonorStep', () => {
  it('renders the prompt header', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    expect(screen.getByText(/how would you like to appear/i)).toBeInTheDocument()
  })

  it('disables Continue when display_name is empty', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()
  })

  it('enables Continue once display_name has non-whitespace text', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/john k/i), { target: { value: 'Akua' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('shows the anonymous radio in full and names_only wall modes', () => {
    const { rerender } = render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    expect(screen.getByText(/donate anonymously/i)).toBeInTheDocument()
    rerender(<DonationDonorStep wallMode="names_only" onBack={() => {}} onContinue={() => {}} />)
    expect(screen.getByText(/donate anonymously/i)).toBeInTheDocument()
  })

  it('hides the anonymous radio in private wall mode', () => {
    render(<DonationDonorStep wallMode="private" onBack={() => {}} onContinue={() => {}} />)
    expect(screen.queryByText(/donate anonymously/i)).toBeNull()
  })

  it('renders 3 radios in full mode and only 2 radios share-checked', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(3)
    // Only one radio is checked at a time (default = name_amount)
    const checkedRadios = radios.filter((r) => r.checked)
    expect(checkedRadios.length).toBe(1)
  })

  it('updates store visibility to "anonymous" when the anonymous radio is clicked', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    const anonRadio = screen.getByLabelText(/donate anonymously/i)
    fireEvent.click(anonRadio)
    expect(useDonationStore.getState().donor.visibility).toBe('anonymous')
  })

  it('updates store visibility to "public" when "Show name only" radio is clicked', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    const nameOnly = screen.getByLabelText(/show my name only/i)
    fireEvent.click(nameOnly)
    expect(useDonationStore.getState().donor.visibility).toBe('public')
  })

  it('calls onBack when Back is clicked', () => {
    const onBack = vi.fn()
    render(<DonationDonorStep wallMode="full" onBack={onBack} onContinue={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('calls onContinue when Continue is clicked (after name set)', () => {
    const onContinue = vi.fn()
    useDonationStore.setState({
      donor: { display_name: 'Akua', visibility: 'public', email: '', phone: '', country_code: 'GH' },
    })
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={onContinue} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalled()
  })

  it('updates email in store as user types', () => {
    render(<DonationDonorStep wallMode="full" onBack={() => {}} onContinue={() => {}} />)
    const emailInput = screen.getByPlaceholderText(/receipt/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(useDonationStore.getState().donor.email).toBe('test@example.com')
  })
})
