import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

describe('SignInChooser', () => {
  describe('default (VITE_PHONE_AUTH_ENABLED unset)', () => {
    it('renders Google login button (slot exists)', async () => {
      const { SignInChooser } = await import('../SignInChooser')
      // GoogleLoginButton itself only renders if VITE_GOOGLE_CLIENT_ID is set;
      // in vitest jsdom env the env var is undefined, so the button renders null.
      // We just verify the component itself mounts without throwing.
      expect(() => render(<SignInChooser />)).not.toThrow()
    })

    it('hides "Continue with phone" button when VITE_PHONE_AUTH_ENABLED is unset/false', async () => {
      const { SignInChooser } = await import('../SignInChooser')
      const { queryByText } = render(<SignInChooser />)
      expect(queryByText('Continue with phone')).toBeNull()
    })

    it('does not render PhoneAuthDialog when phone auth is disabled', async () => {
      const { SignInChooser } = await import('../SignInChooser')
      const { queryByText } = render(<SignInChooser />)
      // Dialog title should not be in the DOM when the dialog isn't mounted at all
      expect(queryByText('Sign in with phone')).toBeNull()
    })
  })

  describe('with VITE_PHONE_AUTH_ENABLED=true', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_PHONE_AUTH_ENABLED', 'true')
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    it('renders "Continue with phone" button', async () => {
      const { SignInChooser } = await import('../SignInChooser')
      const { getByText } = render(<SignInChooser />)
      expect(getByText('Continue with phone')).toBeTruthy()
    })

    it('clicking phone button opens PhoneAuthDialog', async () => {
      const { SignInChooser } = await import('../SignInChooser')
      const { getByText, queryByText } = render(<SignInChooser />)
      expect(queryByText('Sign in with phone')).toBeNull()
      fireEvent.click(getByText('Continue with phone'))
      expect(queryByText('Sign in with phone')).toBeTruthy()
    })
  })
})
