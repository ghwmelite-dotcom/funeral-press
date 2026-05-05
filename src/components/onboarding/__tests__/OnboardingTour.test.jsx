import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingTour } from '../OnboardingTour.jsx'
import { useAuthStore } from '../../../stores/authStore.js'

beforeEach(() => {
  localStorage.clear()
  // Reset the auth store to a clean slate for each test. The store is a
  // module-level singleton, so leaks from prior tests would otherwise
  // pollute state.
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    markOnboarded: vi.fn(),
  })
})

describe('OnboardingTour', () => {
  it('does not render when user is logged out', () => {
    const { container } = render(<OnboardingTour />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when localStorage flag is set', () => {
    localStorage.setItem('fp-onboarded', '1')
    useAuthStore.setState({ user: { id: 'u1', name: 'A' } })
    const { container } = render(<OnboardingTour />)
    // Even though user is logged in, the flag suppresses it
    expect(container.firstChild).toBeNull()
  })

  it('does not render when user.onboarded_at is set (server side)', () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'A', onboarded_at: '2025-01-01T00:00:00Z' },
    })
    const { container } = render(<OnboardingTour />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tour for logged-in non-onboarded user (after delay)', async () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'A' }, markOnboarded: vi.fn() })
    render(<OnboardingTour />)
    await waitFor(() => {
      expect(screen.getByText(/welcome to funeralpress/i)).toBeInTheDocument()
    })
  })

  it('advances through steps on Next click', async () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'A' }, markOnboarded: vi.fn() })
    render(<OnboardingTour />)
    await waitFor(() => screen.getByText(/welcome to funeralpress/i))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/choose a product/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument()
  })

  it('shows Done button on last step', async () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'A' }, markOnboarded: vi.fn() })
    render(<OnboardingTour />)
    await waitFor(() => screen.getByText(/welcome to funeralpress/i))
    // Click Next 3 times to reach last step (4 steps total)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
    }
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('Skip button dismisses immediately and sets localStorage', async () => {
    const markOnboarded = vi.fn()
    useAuthStore.setState({ user: { id: 'u1', name: 'A' }, markOnboarded })
    render(<OnboardingTour />)
    await waitFor(() => screen.getByText(/welcome to funeralpress/i))
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(localStorage.getItem('fp-onboarded')).toBe('1')
    expect(markOnboarded).toHaveBeenCalled()
  })

  it('Done on last step dismisses + marks onboarded', async () => {
    const markOnboarded = vi.fn()
    useAuthStore.setState({ user: { id: 'u1', name: 'A' }, markOnboarded })
    render(<OnboardingTour />)
    await waitFor(() => screen.getByText(/welcome to funeralpress/i))
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
    }
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(localStorage.getItem('fp-onboarded')).toBe('1')
    expect(markOnboarded).toHaveBeenCalled()
  })
})
