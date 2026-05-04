import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DonationPrivacyPage from '../DonationPrivacyPage.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <DonationPrivacyPage />
    </MemoryRouter>
  )
}

describe('DonationPrivacyPage', () => {
  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByText(/donation privacy notice/i)).toBeInTheDocument()
  })

  it('lists what data is collected', () => {
    renderPage()
    expect(screen.getByText(/what we collect/i)).toBeInTheDocument()
  })

  it('mentions Hubtel and Twilio (NOT Termii)', () => {
    renderPage()
    expect(screen.getByText(/hubtel/i)).toBeInTheDocument()
    expect(screen.getByText(/twilio/i)).toBeInTheDocument()
    // Termii was the previous provider; the privacy notice must reflect Hubtel
    const html = document.body.innerHTML.toLowerCase()
    expect(html.includes('termii')).toBe(false)
  })

  it('mentions right to erasure', () => {
    renderPage()
    // Phrase appears in both H2 heading and the data-retention paragraph;
    // assert at least one match.
    expect(screen.getAllByText(/right to erasure/i).length).toBeGreaterThan(0)
  })

  it('explains what becomes public via wall_mode', () => {
    renderPage()
    expect(screen.getAllByText(/public/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/wall_mode|wall mode/i).length).toBeGreaterThan(0)
  })
})
