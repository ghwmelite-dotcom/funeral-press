import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FamilyHeadApprovalPage from '../FamilyHeadApprovalPage.jsx'

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderRoute(token = 'tok_xyz') {
  return render(
    <MemoryRouter initialEntries={[`/approve/${token}`]}>
      <Routes>
        <Route path="/approve/:token" element={<FamilyHeadApprovalPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FamilyHeadApprovalPage', () => {
  it('shows Loading initially', () => {
    globalThis.fetch.mockImplementation(() => new Promise(() => {})) // never resolves
    renderRoute()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows the approval view when memorial loads', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'mem_abc',
        family_head_name: 'Akosua',
        family_head_phone: '+233244111222',
        deceased_name: 'Akua Mensah',
        creator_name: 'Kwame',
        donation: { payout_momo_provider: 'mtn', payout_momo_number: '+233244111222', payout_account_name: 'X', wall_mode: 'full' },
      }),
    })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText('Akua Mensah')).toBeInTheDocument()
    })
  })

  it('shows error when token lookup fails', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false })
    renderRoute()
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument()
    })
  })
})
