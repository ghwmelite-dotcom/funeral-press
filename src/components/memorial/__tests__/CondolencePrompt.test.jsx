import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CondolencePrompt, { hasSeenCondolencePrompt, markCondolencePromptSeen } from '../CondolencePrompt.jsx'

describe('CondolencePrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('thanks the visitor by the deceased first name', () => {
    render(
      <MemoryRouter>
        <CondolencePrompt slug="akua-mensah" deceasedFirstName="Akua" onDismiss={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByText(/thank you for honouring akua/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /funeralpress is here/i }))
      .toHaveAttribute('href', '/honour?from=post_condolence')
  })

  it('calls onDismiss when dismissed', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <CondolencePrompt slug="akua-mensah" deceasedFirstName="Akua" onDismiss={onDismiss} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('tracks seen-state per guest book slug', () => {
    expect(hasSeenCondolencePrompt('akua-mensah')).toBe(false)
    markCondolencePromptSeen('akua-mensah')
    expect(hasSeenCondolencePrompt('akua-mensah')).toBe(true)
    expect(hasSeenCondolencePrompt('other-slug')).toBe(false)
  })
})
