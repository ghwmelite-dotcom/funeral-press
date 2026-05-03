import { create } from 'zustand'
import { donationApi } from '../utils/donationApi.js'

// Powers two surfaces:
//  1. Tokenized approval page (/approve/:token) — anonymous, calls approve/reject with token+otp+phone
//  2. Authenticated family-head dashboard — load totals/wall, update settings, change payout
export const useFamilyHeadStore = create((set) => ({
  // Approval flow (token-based, no JWT)
  approvalStatus: 'idle',          // 'idle' | 'submitting' | 'approved' | 'rejected' | 'error'
  approvalError: null,

  // Settings flow (authed)
  settingsLoading: false,
  settingsError: null,

  approve: async (memorialId, body) => {
    set({ approvalStatus: 'submitting', approvalError: null })
    try {
      const res = await donationApi.approve(memorialId, body)
      set({ approvalStatus: 'approved' })
      return res
    } catch (e) {
      set({ approvalStatus: 'error', approvalError: e.message || 'Approval failed' })
      throw e
    }
  },

  reject: async (memorialId, body) => {
    set({ approvalStatus: 'submitting', approvalError: null })
    try {
      const res = await donationApi.reject(memorialId, body)
      set({ approvalStatus: 'rejected' })
      return res
    } catch (e) {
      set({ approvalStatus: 'error', approvalError: e.message || 'Rejection failed' })
      throw e
    }
  },

  updateSettings: async (memorialId, body) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const res = await donationApi.updateSettings(memorialId, body)
      set({ settingsLoading: false })
      return res
    } catch (e) {
      set({ settingsLoading: false, settingsError: e.message || 'Update failed' })
      throw e
    }
  },

  resetApproval: () => set({ approvalStatus: 'idle', approvalError: null }),
}))
