import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock donationApi BEFORE importing the store so the store binds to the mock.
vi.mock('../../utils/donationApi.js', () => ({
  donationApi: {
    charge: vi.fn(),
    getWall: vi.fn(),
    getTotals: vi.fn(),
  },
}))

import { useDonationStore } from '../../stores/donationStore.js'
import { donationApi } from '../../utils/donationApi.js'

beforeEach(() => {
  useDonationStore.getState().reset()
  // Also clear walls explicitly (reset() doesn't touch walls — that's intentional cache, but tests need clean state)
  useDonationStore.setState({ walls: {}, wallLoading: {} })
  vi.clearAllMocks()
})

describe('donationStore — wizard state', () => {
  it('starts at the amount step with empty donor + zero amount', () => {
    const s = useDonationStore.getState()
    expect(s.chargeStep).toBe('amount')
    expect(s.amount.displayMinor).toBe(0)
    expect(s.amount.displayCurrency).toBe('GHS')
    expect(s.donor.display_name).toBe('')
  })

  it('setStep moves the wizard forward', () => {
    useDonationStore.getState().setStep('donor')
    expect(useDonationStore.getState().chargeStep).toBe('donor')
  })

  it('setAmount merges patches without dropping other fields', () => {
    useDonationStore.getState().setAmount({ displayMinor: 5000, tipPesewas: 250 })
    const a = useDonationStore.getState().amount
    expect(a.displayMinor).toBe(5000)
    expect(a.tipPesewas).toBe(250)
    expect(a.displayCurrency).toBe('GHS')   // untouched
    expect(a.includeTip).toBe(true)         // untouched
  })

  it('setDonor merges patches', () => {
    useDonationStore.getState().setDonor({ display_name: 'Akua', visibility: 'public' })
    const d = useDonationStore.getState().donor
    expect(d.display_name).toBe('Akua')
    expect(d.visibility).toBe('public')
    expect(d.country_code).toBe('GH')       // untouched
  })

  it('reset returns wizard fields to blank', () => {
    const store = useDonationStore.getState()
    store.setStep('review')
    store.setAmount({ displayMinor: 9999 })
    store.setDonor({ display_name: 'Kofi' })
    store.reset()
    const after = useDonationStore.getState()
    expect(after.chargeStep).toBe('amount')
    expect(after.amount.displayMinor).toBe(0)
    expect(after.donor.display_name).toBe('')
  })
})

describe('donationStore — initiateCharge', () => {
  it('passes amount, currency, tip, and donor to donationApi.charge and advances to redirecting', async () => {
    donationApi.charge.mockResolvedValueOnce({ authorization_url: 'https://paystack/x', donation_id: 'don_1' })
    const store = useDonationStore.getState()
    store.setAmount({ displayMinor: 5000, tipPesewas: 250 })
    store.setDonor({ display_name: 'Akua', visibility: 'public' })
    const res = await store.initiateCharge('mem_abc')
    expect(donationApi.charge).toHaveBeenCalledWith('mem_abc', expect.objectContaining({
      display_amount_minor: 5000,
      display_currency: 'GHS',
      tip_pesewas: 250,
      donor: expect.objectContaining({ display_name: 'Akua', visibility: 'public' }),
    }))
    expect(res.authorization_url).toContain('paystack')
    expect(useDonationStore.getState().chargeStep).toBe('redirecting')
    expect(useDonationStore.getState().chargeLoading).toBe(false)
  })

  it('sends tip_pesewas: 0 when donor opted out via includeTip=false', async () => {
    donationApi.charge.mockResolvedValueOnce({ authorization_url: 'p', donation_id: 'd' })
    const store = useDonationStore.getState()
    store.setAmount({ displayMinor: 5000, tipPesewas: 250, includeTip: false })
    await store.initiateCharge('mem_abc')
    const sent = donationApi.charge.mock.calls[0][1]
    expect(sent.tip_pesewas).toBe(0)
  })

  it('records chargeError and re-throws when the API call fails', async () => {
    donationApi.charge.mockRejectedValueOnce(new Error('Invalid tip amount'))
    const store = useDonationStore.getState()
    store.setAmount({ displayMinor: 5000, tipPesewas: 999 })
    await expect(store.initiateCharge('mem_abc')).rejects.toThrow('Invalid tip amount')
    expect(useDonationStore.getState().chargeError).toBe('Invalid tip amount')
    expect(useDonationStore.getState().chargeLoading).toBe(false)
    // Wizard does NOT advance on failure
    expect(useDonationStore.getState().chargeStep).toBe('amount')
  })
})

describe('donationStore — wall + totals', () => {
  it('loadWall populates walls[memorialId] on first load', async () => {
    donationApi.getWall.mockResolvedValueOnce({
      wall_mode: 'full',
      donations: [{ id: 'd1', display_name: 'Akua', amount_pesewas: 5000 }],
      next_cursor: null,
      total_raised_pesewas: 5000,
      total_donor_count: 1,
    })
    await useDonationStore.getState().loadWall('mem_abc')
    const w = useDonationStore.getState().walls.mem_abc
    expect(w.donations).toHaveLength(1)
    expect(w.total_raised_pesewas).toBe(5000)
    expect(useDonationStore.getState().wallLoading.mem_abc).toBe(false)
  })

  it('loadWall with cursor appends to existing donations', async () => {
    donationApi.getWall.mockResolvedValueOnce({
      wall_mode: 'full',
      donations: [{ id: 'd1', display_name: 'Akua' }],
      next_cursor: 'abc',
      total_raised_pesewas: 5000, total_donor_count: 1,
    })
    await useDonationStore.getState().loadWall('mem_abc')

    donationApi.getWall.mockResolvedValueOnce({
      wall_mode: 'full',
      donations: [{ id: 'd2', display_name: 'Kofi' }],
      next_cursor: null,
      total_raised_pesewas: 5000, total_donor_count: 1,
    })
    await useDonationStore.getState().loadWall('mem_abc', 'abc')

    const w = useDonationStore.getState().walls.mem_abc
    expect(w.donations.map(d => d.id)).toEqual(['d1', 'd2'])
    expect(w.next_cursor).toBeNull()
  })

  it('loadTotals merges into existing wall entry without clobbering donations', async () => {
    useDonationStore.setState({
      walls: { mem_abc: { donations: [{ id: 'd1' }], total_raised_pesewas: 0 } },
    })
    donationApi.getTotals.mockResolvedValueOnce({
      total_raised_pesewas: 9999, total_donor_count: 7, wall_mode: 'full',
    })
    await useDonationStore.getState().loadTotals('mem_abc')
    const w = useDonationStore.getState().walls.mem_abc
    expect(w.donations).toEqual([{ id: 'd1' }])
    expect(w.total_raised_pesewas).toBe(9999)
    expect(w.total_donor_count).toBe(7)
  })
})
