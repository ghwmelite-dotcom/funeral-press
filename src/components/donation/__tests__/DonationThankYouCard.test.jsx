import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DonationThankYouCard } from '../DonationThankYouCard.jsx'

describe('DonationThankYouCard', () => {
  it('renders deceased name and dates', () => {
    render(
      <DonationThankYouCard
        memorial={{ deceased_name: 'Akua Mensah', dates: '1948 — 2025' }}
        donor={{ display_name: 'Kwame B.' }}
      />
    )
    expect(screen.getByText('Akua Mensah')).toBeInTheDocument()
    expect(screen.getByText('1948 — 2025')).toBeInTheDocument()
  })

  it('renders donor display name', () => {
    render(
      <DonationThankYouCard
        memorial={{ deceased_name: 'A', dates: 'd' }}
        donor={{ display_name: 'Kwame B.' }}
      />
    )
    expect(screen.getByText('Kwame B.')).toBeInTheDocument()
  })

  it('shows formatted amount when amountMinor + currency provided', () => {
    render(
      <DonationThankYouCard
        memorial={{ deceased_name: 'A', dates: 'd' }}
        donor={{ display_name: 'X' }}
        amountMinor={5000}
        currency="GHS"
      />
    )
    expect(screen.getByText(/GHS\s*50/)).toBeInTheDocument()
  })

  it('omits amount line when amountMinor is undefined', () => {
    render(
      <DonationThankYouCard
        memorial={{ deceased_name: 'A', dates: 'd' }}
        donor={{ display_name: 'X' }}
      />
    )
    expect(screen.queryByText(/GHS/)).toBeNull()
  })
})
