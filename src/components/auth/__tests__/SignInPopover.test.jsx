import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { SignInPopover } from '../SignInPopover'

describe('SignInPopover', () => {
  it('renders Sign in trigger button', () => {
    const { getByText } = render(<SignInPopover />)
    expect(getByText('Sign in')).toBeTruthy()
  })

  it('does not show chooser by default', () => {
    const { queryByText } = render(<SignInPopover />)
    // Popover content not in DOM until trigger is clicked
    expect(queryByText('Sign in to FuneralPress')).toBeNull()
  })

  it('clicking Sign in trigger opens the popover with the chooser inside', () => {
    const { getByText, queryByText } = render(<SignInPopover />)
    fireEvent.click(getByText('Sign in'))
    // Popover content should now be in the DOM. We check for the popover header
    // rather than "Continue with phone" because the phone button is gated on
    // VITE_PHONE_AUTH_ENABLED which is unset in the test env.
    expect(queryByText('Sign in to FuneralPress')).toBeTruthy()
  })
})
