import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { ShareDonationDialog } from '../ShareDonationDialog.jsx'

const memorial = {
  id: 'mem_abc',
  slug: 'akua-mensah',
  deceased_name: 'Akua Mensah',
}

beforeEach(() => {
  // Mock window.open
  globalThis.open = vi.fn()
  // Mock clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue() },
    configurable: true,
  })
})

describe('ShareDonationDialog', () => {
  it('renders Share button initially (dialog closed)', () => {
    render(<ShareDonationDialog memorial={memorial} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(screen.queryByText(/share donation link/i)).toBeNull()
  })

  it('opens dialog when Share is clicked', async () => {
    render(<ShareDonationDialog memorial={memorial} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => {
      expect(screen.getByText(/share donation link/i)).toBeInTheDocument()
    })
  })

  it('shows three share options: WhatsApp, Copy link, Print QR poster', async () => {
    render(<ShareDonationDialog memorial={memorial} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /print qr poster/i })).toBeInTheDocument()
    })
  })

  it('WhatsApp button opens wa.me URL with deceased name and donate link', async () => {
    render(<ShareDonationDialog memorial={memorial} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => screen.getByRole('button', { name: /whatsapp/i }))
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    expect(globalThis.open).toHaveBeenCalledTimes(1)
    const url = globalThis.open.mock.calls[0][0]
    expect(url).toContain('https://wa.me/')
    expect(decodeURIComponent(url)).toContain('Akua Mensah')
    expect(decodeURIComponent(url)).toContain('https://funeralpress.org/m/akua-mensah/donate')
  })

  it('Copy link button calls clipboard.writeText with the donate URL', async () => {
    render(<ShareDonationDialog memorial={memorial} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => screen.getByRole('button', { name: /copy link/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://funeralpress.org/m/akua-mensah/donate'
    )
  })

  it('Print QR poster link points to /family-head/:id/qr', async () => {
    render(<ShareDonationDialog memorial={memorial} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => screen.getByRole('link', { name: /print qr poster/i }))
    const link = screen.getByRole('link', { name: /print qr poster/i })
    expect(link.getAttribute('href')).toBe('/family-head/mem_abc/qr')
  })
})
