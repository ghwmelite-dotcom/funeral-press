import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import UpgradeTributeCard from '../UpgradeTributeCard.jsx'

describe('UpgradeTributeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the Forever Tribute badge (not the offer card) when premium', () => {
    render(<UpgradeTributeCard deceasedName="Ama" premium onUpgrade={() => {}} />)
    expect(screen.getByTestId('premium-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('upgrade-tribute-card')).not.toBeInTheDocument()
  })

  it('shows the offer card with the deceased name when not premium', () => {
    render(<UpgradeTributeCard deceasedName="Ama Mensah" premium={false} onUpgrade={() => {}} />)
    expect(screen.getByTestId('upgrade-tribute-card')).toBeInTheDocument()
    expect(screen.getByText(/Honor Ama Mensah/i)).toBeInTheDocument()
    expect(screen.queryByTestId('premium-badge')).not.toBeInTheDocument()
  })

  it('CTA button label is "View premium plans" (no hardcoded price)', () => {
    render(<UpgradeTributeCard deceasedName="Ama" premium={false} onUpgrade={() => {}} />)
    expect(screen.getByRole('button', { name: /View premium plans/i })).toBeInTheDocument()
  })

  it('clicking the CTA calls onUpgrade exactly once', () => {
    const onUpgrade = vi.fn()
    render(<UpgradeTributeCard deceasedName="Ama" premium={false} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByRole('button', { name: /View premium plans/i }))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })
})
