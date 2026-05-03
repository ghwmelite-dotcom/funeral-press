import { create } from 'zustand'
import { donationApi } from '../utils/donationApi.js'

const blankAmount = () => ({
  displayMinor: 0,
  displayCurrency: 'GHS',
  tipPesewas: 0,
  includeTip: true,
})

const blankDonor = () => ({
  display_name: '',
  visibility: 'names_only',
  email: '',
  phone: '',
  country_code: 'GH',
})

export const useDonationStore = create((set, get) => ({
  // Charge wizard state
  chargeStep: 'amount',  // 'amount' | 'donor' | 'review' | 'redirecting'
  amount: blankAmount(),
  donor: blankDonor(),
  chargeError: null,
  chargeLoading: false,

  // Wall + totals state, keyed by memorialId
  walls: {},          // { [memorialId]: { wall_mode, donations, next_cursor, total_raised_pesewas, total_donor_count, goal_amount_pesewas } }
  wallLoading: {},

  setStep: (chargeStep) => set({ chargeStep }),
  setAmount: (patch) => set({ amount: { ...get().amount, ...patch } }),
  setDonor: (patch) => set({ donor: { ...get().donor, ...patch } }),

  reset: () => set({
    chargeStep: 'amount',
    amount: blankAmount(),
    donor: blankDonor(),
    chargeError: null,
    chargeLoading: false,
  }),

  initiateCharge: async (memorialId) => {
    set({ chargeLoading: true, chargeError: null })
    const { amount, donor } = get()
    try {
      const res = await donationApi.charge(memorialId, {
        display_amount_minor: amount.displayMinor,
        display_currency: amount.displayCurrency,
        tip_pesewas: amount.includeTip ? amount.tipPesewas : 0,
        donor,
      })
      set({ chargeLoading: false, chargeStep: 'redirecting' })
      return res
    } catch (e) {
      set({ chargeLoading: false, chargeError: e.message || 'Could not start payment' })
      throw e
    }
  },

  loadWall: async (memorialId, cursor = null) => {
    set(s => ({ wallLoading: { ...s.wallLoading, [memorialId]: true } }))
    try {
      const res = await donationApi.getWall(memorialId, cursor)
      set(s => ({
        walls: {
          ...s.walls,
          [memorialId]: cursor
            ? {
                ...s.walls[memorialId],
                ...res,
                donations: [...(s.walls[memorialId]?.donations || []), ...(res.donations || [])],
              }
            : res,
        },
        wallLoading: { ...s.wallLoading, [memorialId]: false },
      }))
    } catch {
      set(s => ({ wallLoading: { ...s.wallLoading, [memorialId]: false } }))
    }
  },

  loadTotals: async (memorialId) => {
    try {
      const res = await donationApi.getTotals(memorialId)
      set(s => ({
        walls: { ...s.walls, [memorialId]: { ...(s.walls[memorialId] || {}), ...res } },
      }))
    } catch { /* totals failure is non-fatal — UI can show '—' */ }
  },
}))
