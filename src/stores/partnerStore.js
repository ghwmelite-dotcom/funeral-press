import { create } from 'zustand'
import { apiFetch } from '../utils/apiClient'

export const usePartnerStore = create((set) => ({
  profile: null,
  referrals: [],
  isLoadingProfile: false,
  isLoadingReferrals: false,

  fetchProfile: async () => {
    set({ isLoadingProfile: true })
    try {
      const data = await apiFetch('/partner/me')
      set({ profile: data.partner, isLoadingProfile: false })
    } catch {
      set({ profile: null, isLoadingProfile: false })
    }
  },

  fetchReferrals: async () => {
    set({ isLoadingReferrals: true })
    try {
      const data = await apiFetch('/partner/referrals')
      set({ referrals: data.referrals || [], isLoadingReferrals: false })
    } catch {
      set({ referrals: [], isLoadingReferrals: false })
    }
  },

  clear: () => set({ profile: null, referrals: [], isLoadingProfile: false, isLoadingReferrals: false }),
}))
