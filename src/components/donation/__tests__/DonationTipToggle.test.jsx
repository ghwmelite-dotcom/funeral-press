import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { DonationTipToggle } from '../DonationTipToggle.jsx'

describe('DonationTipToggle', () => {
  it('renders the tip label with default 5%', () => {
    render(
      <DonationTipToggle
        checked={true}
        onCheckedChange={() => {}}
        baseAmountMinor={10000}
        currency="GHS"
      />
    )
    expect(screen.getByText(/Add 5% to support FuneralPress/i)).toBeInTheDocument()
  })

  it('renders custom percent when passed', () => {
    render(
      <DonationTipToggle
        checked={true}
        onCheckedChange={() => {}}
        baseAmountMinor={10000}
        currency="GHS"
        percent={10}
      />
    )
    expect(screen.getByText(/Add 10% to support FuneralPress/i)).toBeInTheDocument()
  })

  it('shows the computed tip amount based on baseAmount × percent', () => {
    render(
      <DonationTipToggle
        checked={true}
        onCheckedChange={() => {}}
        baseAmountMinor={10000} // GHS 100
        currency="GHS"
        percent={5}
      />
    )
    // 5% of 10000 minor = 500 minor = GHS 5
    expect(screen.getByText(/GHS\s*5(\.|$)/)).toBeInTheDocument()
  })

  it('reflects the checked prop on the checkbox', () => {
    const { rerender } = render(
      <DonationTipToggle
        checked={false}
        onCheckedChange={() => {}}
        baseAmountMinor={10000}
        currency="GHS"
      />
    )
    expect(screen.getByRole('checkbox').checked).toBe(false)

    rerender(
      <DonationTipToggle
        checked={true}
        onCheckedChange={() => {}}
        baseAmountMinor={10000}
        currency="GHS"
      />
    )
    expect(screen.getByRole('checkbox').checked).toBe(true)
  })

  it('calls onCheckedChange when toggled', () => {
    const onCheckedChange = vi.fn()
    render(
      <DonationTipToggle
        checked={false}
        onCheckedChange={onCheckedChange}
        baseAmountMinor={10000}
        currency="GHS"
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
