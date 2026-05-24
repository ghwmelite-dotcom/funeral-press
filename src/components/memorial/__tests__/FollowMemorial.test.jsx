import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFollowMemorial = vi.fn()

vi.mock('../../../utils/memorialApi', () => ({
  followMemorial: (...args) => mockFollowMemorial(...args),
}))

import FollowMemorial from '../FollowMemorial.jsx'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  memorialId:   'm1',
  deceasedName: 'Yaw Darko',
  dateOfBirth:  '1948-03-12',
  dateOfDeath:  '2023-11-01',
}

function renderComponent(props = {}) {
  return render(<FollowMemorial {...DEFAULT_PROPS} {...props} />)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FollowMemorial', () => {
  beforeEach(() => {
    mockFollowMemorial.mockReset()
  })

  it('renders the heading with the deceased name', () => {
    renderComponent()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Yaw Darko')
  })

  it('calls followMemorial with correct args on valid submit', async () => {
    mockFollowMemorial.mockResolvedValueOnce({ ok: true })
    renderComponent()

    fireEvent.change(screen.getByLabelText(/Your email address/i), {
      target: { value: 'ama@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Remind me/i }))

    await waitFor(() =>
      expect(mockFollowMemorial).toHaveBeenCalledWith('m1', {
        email:        'ama@test.com',
        deceasedName: 'Yaw Darko',
        dateOfBirth:  '1948-03-12',
        dateOfDeath:  '2023-11-01',
      })
    )
  })

  it('shows success state after resolve', async () => {
    mockFollowMemorial.mockResolvedValueOnce({ ok: true })
    renderComponent()

    fireEvent.change(screen.getByLabelText(/Your email address/i), {
      target: { value: 'kwame@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Remind me/i }))

    await waitFor(() =>
      expect(screen.getByText(/Check your inbox to confirm/i)).toBeInTheDocument()
    )
    expect(mockFollowMemorial).toHaveBeenCalledTimes(1)
  })

  it('shows an error and does NOT call followMemorial on invalid email', async () => {
    renderComponent()

    fireEvent.change(screen.getByLabelText(/Your email address/i), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Remind me/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
    expect(mockFollowMemorial).not.toHaveBeenCalled()
  })

  it('shows an error and does NOT call followMemorial on empty email', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /Remind me/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
    expect(mockFollowMemorial).not.toHaveBeenCalled()
  })

  it('shows API error message when followMemorial rejects', async () => {
    mockFollowMemorial.mockRejectedValueOnce(new Error('Server error'))
    renderComponent()

    fireEvent.change(screen.getByLabelText(/Your email address/i), {
      target: { value: 'valid@test.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Remind me/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Server error/i)
    )
  })
})
