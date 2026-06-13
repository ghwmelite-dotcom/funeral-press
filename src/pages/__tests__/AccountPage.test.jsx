import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

vi.mock('../../utils/phonePinApi.js', () => ({
  phonePinApi: { resendVerification: vi.fn(), changePin: vi.fn() },
  PhonePinError: class extends Error {},
}))

import AccountPage from '../AccountPage'
import { phonePinApi } from '../../utils/phonePinApi.js'
import { useAuthStore } from '../../stores/authStore.js'

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

const phonePinUser = {
  id: '1', name: 'Ama Mensah', email: 'ama@example.com',
  phone: '+233200000088', authMethods: 'phone-pin', email_verified_at: null,
}
const googleUser = {
  id: '2', name: 'Kofi Boateng', email: 'kofi@gmail.com', picture: 'x',
  phone: null, authMethods: null, email_verified_at: '2026-01-01T00:00:00Z',
}

describe('AccountPage', () => {
  beforeEach(() => {
    phonePinApi.resendVerification.mockReset()
    phonePinApi.changePin.mockReset()
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('redirects home when logged out', () => {
    const { getByText } = renderPage()
    expect(getByText('HOME')).toBeTruthy()
  })

  it('shows profile details for a phone+PIN user', () => {
    useAuthStore.setState({ user: phonePinUser })
    const { getByText } = renderPage()
    expect(getByText('Account')).toBeTruthy()
    expect(getByText('Ama Mensah')).toBeTruthy()
    expect(getByText('ama@example.com')).toBeTruthy()
    expect(getByText('+233200000088')).toBeTruthy()
  })

  it('shows Change PIN and verified badge for a verified phone+PIN user', () => {
    useAuthStore.setState({ user: { ...phonePinUser, email_verified_at: '2026-01-01T00:00:00Z' } })
    const { getByText } = renderPage()
    expect(getByText('Change your PIN')).toBeTruthy()
    expect(getByText(/email is verified/i)).toBeTruthy()
  })

  it('hides Change PIN for Google users and shows verified', () => {
    useAuthStore.setState({ user: googleUser })
    const { getByText, queryByText } = renderPage()
    expect(queryByText('Change your PIN')).toBeNull()
    expect(getByText(/email is verified/i)).toBeTruthy()
  })

  it('lets an unverified user send a verification email', async () => {
    phonePinApi.resendVerification.mockResolvedValueOnce({
      message: 'Verification email sent. Check your inbox.',
    })
    useAuthStore.setState({ user: phonePinUser })
    const { getByText } = renderPage()
    fireEvent.click(getByText('Send verification email'))
    await waitFor(() => {
      expect(phonePinApi.resendVerification).toHaveBeenCalled()
      expect(getByText(/verification email sent/i)).toBeTruthy()
    })
  })
})
