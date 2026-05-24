import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let mockUser = { id: 'u1' }
const mockNotify = vi.fn()
const mockCreate = vi.fn()

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}))
vi.mock('../../ui/notification.jsx', () => ({
  useNotification: () => ({ notify: mockNotify }),
}))
vi.mock('../../../utils/memorialApi', () => ({
  createTributeVideo: (...args) => mockCreate(...args),
  getTributeVideoStatus: vi.fn(),
}))

import TributeVideoStudio from '../TributeVideoStudio.jsx'

const props = {
  memorialId: 'm1',
  deceasedName: 'Ama Mensah',
  subtitle: '1950 — 2026',
  biography: 'A loving mother.',
  coverPhoto: 'https://img/ama.jpg',
}

describe('TributeVideoStudio', () => {
  beforeEach(() => {
    mockUser = { id: 'u1' }
    mockNotify.mockClear()
    mockCreate.mockReset()
  })

  it('renders the studio with a Create CTA in idle state', () => {
    render(<TributeVideoStudio {...props} />)
    expect(screen.getByTestId('tribute-video-studio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Tribute Video/i })).toBeInTheDocument()
  })

  it('prompts sign-in (and does not create) when logged out', () => {
    mockUser = null
    render(<TributeVideoStudio {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Create Tribute Video/i }))
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/sign in/i), 'info')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('asks for a photo (and does not create) when there is no cover photo', () => {
    render(<TributeVideoStudio {...props} coverPhoto={undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Create Tribute Video/i }))
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/photo/i), 'info')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('starts a render with the cover photo when ready', () => {
    mockCreate.mockResolvedValue({ videoId: 'v1', status: 'rendering' })
    render(<TributeVideoStudio {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Create Tribute Video/i }))
    expect(mockCreate).toHaveBeenCalledWith('m1', expect.objectContaining({
      title: 'Ama Mensah',
      imageUrls: ['https://img/ama.jpg'],
    }))
  })
})
