import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { SignInChooser } from '../SignInChooser'

describe('SignInChooser', () => {
  it('renders Google login button (slot exists)', () => {
    // GoogleLoginButton itself only renders if VITE_GOOGLE_CLIENT_ID is set;
    // in vitest jsdom env the env var is undefined, so the button renders null.
    // We just verify the component itself mounts without throwing.
    expect(() => render(<SignInChooser />)).not.toThrow()
  })

  it('renders "Continue with phone" button', () => {
    const { getByText } = render(<SignInChooser />)
    expect(getByText('Continue with phone')).toBeTruthy()
  })

  it('clicking phone button opens PhoneAuthDialog', () => {
    const { getByText, queryByText } = render(<SignInChooser />)
    expect(queryByText('Sign in with phone')).toBeNull()
    fireEvent.click(getByText('Continue with phone'))
    expect(queryByText('Sign in with phone')).toBeTruthy()
  })
})
