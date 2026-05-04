import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DonorWall } from '../DonorWall.jsx'
import { useDonationStore } from '../../../stores/donationStore.js'

beforeEach(() => {
  useDonationStore.setState({ walls: {}, wallLoading: {} })
})

describe('DonorWall', () => {
  it('renders nothing when no wall data is loaded', () => {
    const { container } = render(<DonorWall memorialId="m1" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows donor names in names_only mode but hides amounts', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'names_only',
          donations: [{ id: 'd1', display_name: 'John Mensah', amount_pesewas: 5000, created_at: Date.now() }],
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText('John Mensah')).toBeInTheDocument()
    expect(screen.queryByText(/GHS/)).toBeNull()
  })

  it('shows amount in full mode', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'Akua Boateng', amount_pesewas: 5000, created_at: Date.now() }],
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText('Akua Boateng')).toBeInTheDocument()
    expect(screen.getByText(/GHS\s*50/)).toBeInTheDocument()
  })

  it('shows Anonymous label for anonymous donations', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'Anonymous', amount_pesewas: 1000, created_at: Date.now() }],
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('renders Show more button when next_cursor exists', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'A', amount_pesewas: 1000, created_at: Date.now() }],
          next_cursor: 'cursor_xyz',
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
  })

  it('hides Show more button when next_cursor is missing/null', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'A', amount_pesewas: 1000, created_at: Date.now() }],
          next_cursor: null,
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.queryByRole('button', { name: /show more/i })).toBeNull()
  })

  it('Show more button shows loading state when wallLoading[memorialId] is true', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'A', amount_pesewas: 1000, created_at: Date.now() }],
          next_cursor: 'cursor_xyz',
        },
      },
      wallLoading: { m: true },
    })
    render(<DonorWall memorialId="m" />)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.textContent).toMatch(/loading/i)
  })

  it('formats relative time as "Nm ago" for recent donations', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'A', amount_pesewas: 1000, created_at: Date.now() - 5 * 60000 }], // 5 min ago
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText(/5m ago/)).toBeInTheDocument()
  })

  it('formats relative time as "Nh ago" for hour-old donations', () => {
    useDonationStore.setState({
      walls: {
        m: {
          wall_mode: 'full',
          donations: [{ id: 'd1', display_name: 'A', amount_pesewas: 1000, created_at: Date.now() - 3 * 3600000 }], // 3h ago
        },
      },
      wallLoading: {},
    })
    render(<DonorWall memorialId="m" />)
    expect(screen.getByText(/3h ago/)).toBeInTheDocument()
  })
})
