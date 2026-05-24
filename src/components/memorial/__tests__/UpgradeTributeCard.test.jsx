import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let mockUser = null
const mockNotify = vi.fn()
const mockInit = vi.fn()

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}))
vi.mock('../../ui/notification.jsx', () => ({
  useNotification: () => ({ notify: mockNotify }),
}))
vi.mock('../../../utils/paystack', () => ({
  loadPaystackInline: vi.fn(),
  PAYSTACK_PUBLIC_KEY: 'pk_test',
}))
vi.mock('../../../utils/memorialApi', () => ({
  initMemorialPremium: (...args) => mockInit(...args),
  verifyMemorialPremium: vi.fn(),
}))

import UpgradeTributeCard from '../UpgradeTributeCard.jsx'

describe('UpgradeTributeCard', () => {
  beforeEach(() => {
    mockUser = null
    mockNotify.mockClear()
    mockInit.mockClear()
  })

  it('shows the Forever Tribute badge (not the offer) when premium', () => {
    render(<UpgradeTributeCard memorialId="m1" deceasedName="Ama" premium onUpgraded={() => {}} />)
    expect(screen.getByTestId('premium-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('upgrade-tribute-card')).not.toBeInTheDocument()
  })

  it('shows the offer with name + GHS 150 when not premium', () => {
    render(<UpgradeTributeCard memorialId="m1" deceasedName="Ama Mensah" premium={false} onUpgraded={() => {}} />)
    expect(screen.getByTestId('upgrade-tribute-card')).toBeInTheDocument()
    expect(screen.getByText(/Honor Ama Mensah/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlock Forever Tribute — GHS 150/i)).toBeInTheDocument()
  })

  it('prompts sign-in and does NOT start payment when logged out', () => {
    render(<UpgradeTributeCard memorialId="m1" deceasedName="Ama" premium={false} onUpgraded={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Unlock Forever Tribute/i }))
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/sign in/i), 'info')
    expect(mockInit).not.toHaveBeenCalled()
  })
})
