import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'

// Each test imports the component dynamically so that vi.doMock'd modules
// (phonePinApi) are picked up. We also import authStore from the same fresh
// module graph each time to share state with the banner.

afterEach(() => { vi.resetModules(); vi.restoreAllMocks() })

async function loadBanner() {
  const { EmailVerificationBanner } = await import('../EmailVerificationBanner.jsx')
  const { useAuthStore } = await import('../../../stores/authStore.js')
  return { EmailVerificationBanner, useAuthStore }
}

describe('EmailVerificationBanner', () => {
  beforeEach(() => { vi.resetModules() })

  it('renders nothing when user is anonymous', async () => {
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: null })
    const { container } = render(<EmailVerificationBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when email is verified', async () => {
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({
      user: { id: '1', email_verified_at: '2026-01-01T00:00:00Z' },
    })
    const { container } = render(<EmailVerificationBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders banner when user is logged in but unverified', async () => {
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: { id: '1', email_verified_at: null } })
    const { getByText } = render(<EmailVerificationBanner />)
    expect(getByText(/verify your email/i)).toBeTruthy()
    expect(getByText('Resend verification email')).toBeTruthy()
  })

  it('hides itself after dismiss is clicked', async () => {
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: { id: '1', email_verified_at: null } })
    const { getByLabelText, queryByText } = render(<EmailVerificationBanner />)
    fireEvent.click(getByLabelText('Dismiss'))
    expect(queryByText('Resend verification email')).toBeNull()
  })

  it('calls phonePinApi.resendVerification on click and shows the backend message', async () => {
    const resend = vi.fn().mockResolvedValue({ message: 'Verification email sent. Check your inbox.' })
    vi.doMock('../../../utils/phonePinApi.js', () => ({
      phonePinApi: { resendVerification: resend },
      PhonePinError: class extends Error {},
    }))
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: { id: '1', email_verified_at: null } })
    const { getByText } = render(<EmailVerificationBanner />)
    fireEvent.click(getByText('Resend verification email'))
    await waitFor(() => {
      expect(resend).toHaveBeenCalled()
      expect(getByText(/verification email sent/i)).toBeTruthy()
    })
  })

  it('shows the "already verified" message instead of claiming a send', async () => {
    const resend = vi.fn().mockResolvedValue({ message: 'Email already verified.' })
    vi.doMock('../../../utils/phonePinApi.js', () => ({
      phonePinApi: { resendVerification: resend },
      PhonePinError: class extends Error {},
    }))
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: { id: '1', email_verified_at: null } })
    const { getByText, queryByText } = render(<EmailVerificationBanner />)
    fireEvent.click(getByText('Resend verification email'))
    await waitFor(() => {
      expect(getByText(/already verified/i)).toBeTruthy()
      expect(queryByText(/sent another verification email/i)).toBeNull()
    })
  })

  it('surfaces backend error message when resend fails', async () => {
    const resend = vi.fn().mockRejectedValue(new Error('Too many resend requests. Try again later.'))
    vi.doMock('../../../utils/phonePinApi.js', () => ({
      phonePinApi: { resendVerification: resend },
      PhonePinError: class extends Error {},
    }))
    const { EmailVerificationBanner, useAuthStore } = await loadBanner()
    useAuthStore.setState({ user: { id: '1', email_verified_at: null } })
    const { getByText } = render(<EmailVerificationBanner />)
    fireEvent.click(getByText('Resend verification email'))
    await waitFor(() => {
      expect(getByText(/too many resend requests/i)).toBeTruthy()
    })
  })
})
