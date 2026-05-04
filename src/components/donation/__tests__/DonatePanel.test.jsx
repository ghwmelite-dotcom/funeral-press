import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DonatePanel } from '../DonatePanel.jsx'

describe('DonatePanel', () => {
  it('renders nothing when donation not enabled', () => {
    const { container } = render(
      <MemoryRouter>
        <DonatePanel memorial={{ id: 'm', donation: { enabled: false } }} />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when approval pending', () => {
    const { container } = render(
      <MemoryRouter>
        <DonatePanel memorial={{ id: 'm', donation: { enabled: true, approval_status: 'pending' } }} />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders donate button when donation is approved', () => {
    render(
      <MemoryRouter>
        <DonatePanel memorial={{
          id: 'm',
          slug: 'akua-mensah',
          deceased_name: 'Akua Mensah',
          donation: { enabled: true, approval_status: 'approved' },
        }} />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: 'Donate' })).toBeInTheDocument()
  })

  it('shows raised amount and donor count from memorial fallback values', () => {
    render(
      <MemoryRouter>
        <DonatePanel memorial={{
          id: 'm',
          slug: 'akua-mensah',
          deceased_name: 'Akua Mensah',
          donation: {
            enabled: true,
            approval_status: 'approved',
            total_raised_pesewas: 50000, // GHS 500
            total_donor_count: 7,
          },
        }} />
      </MemoryRouter>
    )
    expect(screen.getByText(/raised/i)).toBeInTheDocument()
    expect(screen.getByText(/7 people have donated/i)).toBeInTheDocument()
  })

  it('uses singular "person has" when donor count is 1', () => {
    render(
      <MemoryRouter>
        <DonatePanel memorial={{
          id: 'm',
          slug: 'akua-mensah',
          deceased_name: 'Akua Mensah',
          donation: {
            enabled: true,
            approval_status: 'approved',
            total_raised_pesewas: 5000,
            total_donor_count: 1,
          },
        }} />
      </MemoryRouter>
    )
    expect(screen.getByText(/1 person has donated/i)).toBeInTheDocument()
  })
})
