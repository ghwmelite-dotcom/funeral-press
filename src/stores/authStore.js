import { create } from 'zustand'
import { getStoredReferralCode, clearStoredReferralCode } from '../utils/referralTracker'
import { trackEvent } from '../utils/trackEvent'
import { usePurchaseStore } from './purchaseStore'

const AUTH_KEY = 'fp-auth'
const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveAuth(data) {
  try {
    if (data) localStorage.setItem(AUTH_KEY, JSON.stringify(data))
    else localStorage.removeItem(AUTH_KEY)
  } catch { /* ignore */ }
}

function normalizeUser(user) {
  if (!user) return user
  return {
    ...user,
    partnerType: user.partnerType || null,
    partnerLogoUrl: user.partnerLogoUrl || null,
    partnerDenomination: user.partnerDenomination || null,
  }
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000 < Date.now() - 60000 // 1 min buffer
  } catch {
    return true
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isSyncing: false,
  hasMigrated: false,

  hydrate: () => {
    const saved = loadAuth()
    if (saved) {
      set({
        user: normalizeUser(saved.user),
        accessToken: saved.accessToken,
        refreshToken: saved.refreshToken,
        hasMigrated: saved.hasMigrated || false,
      })
    }
  },

  isLoggedIn: () => {
    const { user, accessToken } = get()
    return !!(user && accessToken)
  },

  handleGoogleLogin: async (credential) => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Login failed (${res.status})`)
      }
      const data = await res.json()
      const state = {
        user: normalizeUser(data.user),
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }
      set({ ...state, isLoading: false })
      saveAuth({ ...state, hasMigrated: get().hasMigrated })

      trackEvent('signup_completed', { method: 'google' })

      // Hydrate purchase data from login response
      usePurchaseStore.getState().hydrateFromUser(data.user)

      // Track referral (fire-and-forget)
      const refCode = getStoredReferralCode()
      if (refCode && data.accessToken) {
        fetch(`${API_BASE}/referrals/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.accessToken}` },
          body: JSON.stringify({ referralCode: refCode }),
        }).catch(() => {}).finally(() => clearStoredReferralCode())
      }

      return data
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  getToken: async () => {
    const { accessToken, refreshToken } = get()
    if (!accessToken) return null
    if (!isTokenExpired(accessToken)) return accessToken

    // Refresh
    if (!refreshToken) {
      get().clearAuth()
      return null
    }

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        get().clearAuth()
        return null
      }
      const data = await res.json()
      const refreshedUser = normalizeUser(data.user)
      set({ user: refreshedUser, accessToken: data.accessToken, refreshToken: data.refreshToken })
      saveAuth({ user: refreshedUser, accessToken: data.accessToken, refreshToken: data.refreshToken, hasMigrated: get().hasMigrated })

      // Hydrate purchase data from refresh response
      usePurchaseStore.getState().hydrateFromUser(data.user)

      return data.accessToken
    } catch {
      get().clearAuth()
      return null
    }
  },

  logout: async () => {
    const { accessToken, refreshToken } = get()
    try {
      if (accessToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch { /* best effort */ }
    trackEvent('user_logout')
    get().clearAuth()
  },

  clearAuth: () => {
    set({ user: null, accessToken: null, refreshToken: null })
    saveAuth(null)
    usePurchaseStore.getState().clear()
  },

  setMigrated: () => {
    set({ hasMigrated: true })
    const saved = loadAuth()
    if (saved) saveAuth({ ...saved, hasMigrated: true })
  },

  getReferralLink: () => {
    const user = get().user
    if (!user) return null
    const code = user.referralCode || user.partnerCode || user.id
    return `https://funeralpress.org/?ref=${code}`
  },

  setSyncing: (v) => set({ isSyncing: v }),

  // Establish a session from any auth handshake response (phone OTP verify, etc.)
  // Mirrors the post-success path of handleGoogleLogin without re-doing Google checks.
  setSession: (data) => {
    if (!data || !data.accessToken) return
    const state = {
      user: normalizeUser(data.user),
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }
    set({ ...state, isLoading: false })
    saveAuth({ ...state, hasMigrated: get().hasMigrated })

    // Hydrate purchase state from the user payload (best-effort, same as Google flow)
    usePurchaseStore.getState().hydrateFromUser(data.user)
  },

  // Link a verified phone to the currently-authenticated account.
  // Caller has already collected an OTP code via /auth/phone/send-otp + /auth/phone/verify.
  linkPhone: async (phone, code) => {
    const { phoneAuthApi } = await import('../utils/donationApi.js')
    const res = await phoneAuthApi.link(phone, code)
    set(s => {
      const updatedUser = {
        ...(s.user || {}),
        phone_e164: res.phone_e164,
        auth_methods: res.auth_methods,
      }
      saveAuth({
        user: updatedUser,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        hasMigrated: s.hasMigrated,
      })
      return { user: updatedUser }
    })
    return res
  },

  // Mark the welcome tour as completed/dismissed.
  // Persists onboarded_at to the backend so the tour does not re-show
  // across devices/sessions; updates the local user object so any
  // currently-mounted gates re-render past the tour.
  markOnboarded: async () => {
    try {
      const { apiFetch } = await import('../utils/apiClient.js')
      await apiFetch('/users/me/onboarded', { method: 'POST' })
    } catch (err) {
      // Non-fatal — localStorage flag still suppresses the tour for this
      // device and the backend can be retried on a future session.
      console.error('markOnboarded failed:', err)
    }
    set((s) => {
      if (!s.user) return s
      const updatedUser = { ...s.user, onboarded_at: new Date().toISOString() }
      saveAuth({
        user: updatedUser,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        hasMigrated: s.hasMigrated,
      })
      return { user: updatedUser }
    })
  },

  // Fetch fresh user data from the server (updates isAdmin, isPartner, etc.)
  refreshUser: async () => {
    const token = await get().getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const current = get()
      const meUser = normalizeUser(data.user)
      set({ user: meUser })
      saveAuth({ user: meUser, accessToken: current.accessToken, refreshToken: current.refreshToken, hasMigrated: current.hasMigrated })
    } catch { /* ignore */ }
  },
}))
