import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUnsubscribeReminders = vi.fn()

vi.mock('../../utils/memorialApi', () => ({
  unsubscribeReminders: (...args) => mockUnsubscribeReminders(...args),
}))

import UnsubscribePage from '../UnsubscribePage'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWith(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/reminders/unsubscribe${search}`]}>
      <UnsubscribePage />
    </MemoryRouter>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UnsubscribePage', () => {
  beforeEach(() => {
    mockUnsubscribeReminders.mockReset()
  })

  it('shows error when token query param is missing', () => {
    renderWith('')
    expect(screen.getByRole('heading')).toHaveTextContent(/Invalid link/i)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockUnsubscribeReminders).not.toHaveBeenCalled()
  })

  it('calls unsubscribeReminders with the token from the URL', async () => {
    mockUnsubscribeReminders.mockResolvedValueOnce({ ok: true })
    renderWith('?token=abc123')

    await waitFor(() =>
      expect(mockUnsubscribeReminders).toHaveBeenCalledWith('abc123')
    )
  })

  it('shows loading state initially when token is present', () => {
    // Never resolves during this check
    mockUnsubscribeReminders.mockReturnValueOnce(new Promise(() => {}))
    renderWith('?token=abc')
    expect(screen.getByText(/Unsubscribing/i)).toBeInTheDocument()
  })

  it('shows success message after successful unsubscribe', async () => {
    mockUnsubscribeReminders.mockResolvedValueOnce({ ok: true })
    renderWith('?token=abc')

    await waitFor(() =>
      expect(screen.getByText(/You've been unsubscribed/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/won't receive reminders/i)).toBeInTheDocument()
  })

  it('shows error state when unsubscribeReminders rejects', async () => {
    mockUnsubscribeReminders.mockRejectedValueOnce(new Error('Network error'))
    renderWith('?token=bad')

    await waitFor(() =>
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
