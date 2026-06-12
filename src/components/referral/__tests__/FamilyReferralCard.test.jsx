import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const apiFetchMock = vi.fn()
vi.mock('../../../utils/apiClient', () => ({ apiFetch: (...args) => apiFetchMock(...args) }))

let mockUser = null
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}))

import FamilyReferralCard from '../FamilyReferralCard.jsx'

describe('FamilyReferralCard', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('renders nothing when logged out', () => {
    mockUser = null
    const { container } = render(<FamilyReferralCard />)
    expect(container.firstChild).toBeNull()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('fetches the code and shows the share link when logged in', async () => {
    mockUser = { id: 'u1', name: 'Ama' }
    apiFetchMock.mockResolvedValue({ code: 'FAMILY23' })
    render(<FamilyReferralCard />)
    expect(await screen.findByDisplayValue('https://funeralpress.org/?ref=FAMILY23')).toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledWith('/referrals/my-code')
    expect(screen.getByText(/they receive a free design/i)).toBeInTheDocument()
  })
})
