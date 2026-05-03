import { create } from 'zustand'
import { phoneAuthApi } from '../utils/donationApi.js'
import { useAuthStore } from './authStore.js'

export const usePhoneAuthStore = create((set, get) => ({
  step: 'phone',                   // 'phone' | 'code'
  phone: '',
  countryCode: 'GH',
  purpose: 'login',                // 'login' | 'link' | 'family_head_approval'
  provider: null,                  // 'termii' | 'twilio'
  resendAvailableAt: 0,
  attemptsLeft: 5,
  locked: false,
  error: null,
  loading: false,

  setPhone: (phone) => set({ phone }),
  setCountryCode: (countryCode) => set({ countryCode }),
  setPurpose: (purpose) => set({ purpose }),

  reset: () => set({
    step: 'phone', phone: '', error: null, locked: false, loading: false,
    resendAvailableAt: 0, attemptsLeft: 5, provider: null,
  }),

  sendOtp: async () => {
    set({ loading: true, error: null })
    try {
      const res = await phoneAuthApi.sendOtp(get().phone, get().purpose)
      set({
        loading: false,
        step: 'code',
        provider: res.provider || null,
        resendAvailableAt: Date.now() + (res.resend_after || 30) * 1000,
      })
    } catch (e) {
      const locked = e.status === 429 || /lock/i.test(e.message || '')
      set({ loading: false, error: e.message || 'Could not send code', locked })
    }
  },

  verify: async (code) => {
    set({ loading: true, error: null })
    try {
      const res = await phoneAuthApi.verify(get().phone, code, get().purpose)
      set({ loading: false })

      // Login purpose: hand off to authStore so the rest of the app sees an authenticated user
      if (get().purpose === 'login' && res.accessToken) {
        useAuthStore.getState().setSession(res)
      }
      return res
    } catch (e) {
      set({
        loading: false,
        error: e.message || 'Wrong code',
        attemptsLeft: Math.max(0, get().attemptsLeft - 1),
      })
      throw e
    }
  },
}))
