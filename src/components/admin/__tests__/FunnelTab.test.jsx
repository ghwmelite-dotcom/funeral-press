import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FunnelTab from '../FunnelTab.jsx'
import { useAdminStore } from '../../../stores/adminStore'

beforeEach(() => {
  useAdminStore.setState({
    analyticsFunnel: null,
    fetchFunnel: vi.fn().mockResolvedValue(),
  })
})

describe('FunnelTab', () => {
  it('shows loading state when funnel data is null', () => {
    render(<FunnelTab />)
    expect(screen.getByText(/loading funnel/i)).toBeInTheDocument()
  })

  it('renders 4 stages when funnel data is loaded', () => {
    useAdminStore.setState({
      analyticsFunnel: {
        days: 30,
        stages: [
          { key: 'signup', label: 'Signed up', count: 100, conversion_pct: 100 },
          { key: 'start_design', label: 'Started design', count: 60, conversion_pct: 60 },
          { key: 'complete_design', label: 'Completed design', count: 30, conversion_pct: 50 },
          { key: 'paid', label: 'Paid', count: 6, conversion_pct: 20 },
        ],
      },
    })
    render(<FunnelTab />)
    expect(screen.getByText('Signed up')).toBeInTheDocument()
    expect(screen.getByText('Started design')).toBeInTheDocument()
    expect(screen.getByText('Completed design')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('shows date range pills', () => {
    useAdminStore.setState({
      analyticsFunnel: {
        days: 30,
        stages: [
          { key: 'signup', label: 'Signed up', count: 0, conversion_pct: 100 },
          { key: 'start_design', label: 'Started design', count: 0, conversion_pct: 0 },
          { key: 'complete_design', label: 'Completed design', count: 0, conversion_pct: 0 },
          { key: 'paid', label: 'Paid', count: 0, conversion_pct: 0 },
        ],
      },
    })
    render(<FunnelTab />)
    expect(screen.getByRole('button', { name: /7 days/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /30 days/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /90 days/i })).toBeInTheDocument()
  })

  it('calls fetchFunnel with the selected range on mount', async () => {
    const fetchFunnel = vi.fn().mockResolvedValue()
    useAdminStore.setState({ fetchFunnel })
    render(<FunnelTab />)
    await waitFor(() => expect(fetchFunnel).toHaveBeenCalledWith(30))
  })
})
