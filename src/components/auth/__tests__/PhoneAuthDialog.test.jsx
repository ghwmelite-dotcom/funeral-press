import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PhoneAuthDialog } from '../PhoneAuthDialog'
import { usePhoneAuthStore } from '../../../stores/phoneAuthStore'

describe('PhoneAuthDialog', () => {
  beforeEach(() => {
    // Reset store to a clean state before each test
    usePhoneAuthStore.setState({
      step: 'phone',
      phone: '',
      countryCode: 'GH',
      loading: false,
      error: null,
      purpose: 'login',
      resendAvailableAt: 0,
    })
  })

  it('does not render when open=false', () => {
    const { queryByText } = render(
      <PhoneAuthDialog open={false} onOpenChange={() => {}} />
    )
    expect(queryByText('Sign in with phone')).toBeNull()
  })

  it('renders the phone step when open=true and store.step="phone"', () => {
    const { getByText, getByLabelText } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    expect(getByText('Sign in with phone')).toBeTruthy()
    expect(getByLabelText('Phone number')).toBeTruthy()
  })

  it('disables Send code button when phone is empty', () => {
    const { getByText } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    const sendButton = getByText('Send code').closest('button')
    expect(sendButton.disabled).toBe(true)
  })

  it('renders the code step when store.step="code"', () => {
    usePhoneAuthStore.setState({ step: 'code', phone: '+233241234567' })
    const { getByText, getAllByRole } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    expect(getByText('Enter your code')).toBeTruthy()
    expect(getAllByRole('textbox').length).toBeGreaterThanOrEqual(6) // 6 digit boxes
  })

  it('disables Verify button until 6 digits are entered', () => {
    usePhoneAuthStore.setState({ step: 'code', phone: '+233241234567' })
    const { getByText } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    const verifyButton = getByText('Verify').closest('button')
    expect(verifyButton.disabled).toBe(true)
  })

  it('shows loading state on Send button when store.loading=true', () => {
    usePhoneAuthStore.setState({ loading: true })
    const { getByText } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    expect(getByText('Sending…')).toBeTruthy()
  })

  it('displays error from store', () => {
    usePhoneAuthStore.setState({ error: 'Phone is locked. Try again later.' })
    const { getByText } = render(
      <PhoneAuthDialog open={true} onOpenChange={() => {}} />
    )
    expect(getByText('Phone is locked. Try again later.')).toBeTruthy()
  })
})
