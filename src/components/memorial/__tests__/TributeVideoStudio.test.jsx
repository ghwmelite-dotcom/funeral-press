import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

let mockUser = { id: 'u1' }
const mockNotify = vi.fn()
const mockCreate = vi.fn()
const mockUpload = vi.fn()

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
vi.mock('../../../utils/apiClient', () => ({
  apiUploadImage: (...args) => mockUpload(...args),
  API_BASE: 'https://auth-api.test',
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
    mockUpload.mockReset()
  })

  it('renders the studio with a Create CTA and the cover photo in idle state', () => {
    render(<TributeVideoStudio {...props} />)
    expect(screen.getByTestId('tribute-video-studio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Tribute Video/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add photos/i })).toBeInTheDocument()
  })

  it('prompts sign-in (and does not create) when logged out', () => {
    mockUser = null
    render(<TributeVideoStudio {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Create Tribute Video/i }))
    expect(mockNotify).toHaveBeenCalledWith(expect.stringMatching(/sign in/i), 'info')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('disables Create and shows guidance when there are no photos', () => {
    render(<TributeVideoStudio {...props} coverPhoto={undefined} />)
    expect(screen.getByRole('button', { name: /Create Tribute Video/i })).toBeDisabled()
    expect(screen.getByText(/Add at least one photo/i)).toBeInTheDocument()
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

  it('uploads added photos and includes them in the montage', async () => {
    mockUpload.mockResolvedValue('https://img/extra.jpg')
    mockCreate.mockResolvedValue({ videoId: 'v1', status: 'rendering' })
    render(<TributeVideoStudio {...props} />)

    const file = new File(['x'], 'extra.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith('tribute', 'm1', file))
    // Both the cover photo and the uploaded one are now in the grid (2 remove buttons).
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Remove photo/i })).toHaveLength(2))

    fireEvent.click(screen.getByRole('button', { name: /Create Tribute Video/i }))
    expect(mockCreate).toHaveBeenCalledWith('m1', expect.objectContaining({
      imageUrls: ['https://img/ama.jpg', 'https://img/extra.jpg'],
    }))
  })
})
