import { create } from 'zustand'
import { apiFetch } from '../utils/apiClient'

const CACHE_KEY = 'fp-purchases'

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveCache(data) {
  try {
    if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    else localStorage.removeItem(CACHE_KEY)
  } catch { /* ignore */ }
}

export const usePurchaseStore = create((set, get) => ({
  credits: 0,
  unlockedDesigns: [],
  isUnlimited: false,
  isLoading: false,
  checkoutOpen: false,
  pendingDownload: null, // { designId, productType }

  fetchStatus: async () => {
    set({ isLoading: true })
    try {
      const data = await apiFetch('/payments/status')
      const state = {
        credits: data.credits,
        isUnlimited: data.isUnlimited,
        unlockedDesigns: data.unlockedDesigns || [],
      }
      set({ ...state, isLoading: false })
      saveCache(state)
    } catch {
      // Fall back to cache
      const cached = loadCache()
      if (cached) set({ ...cached, isLoading: false })
      else set({ isLoading: false })
    }
  },

  hydrateFromUser: (user) => {
    if (!user) return
    const state = {
      credits: user.credits ?? 0,
      isUnlimited: user.isUnlimited ?? false,
      unlockedDesigns: user.unlockedDesigns ?? [],
    }
    set(state)
    saveCache(state)
  },

  canDownload: (designId) => {
    const { isUnlimited, unlockedDesigns } = get()
    return isUnlimited || unlockedDesigns.includes(designId)
  },

  requestDownload: (designId, productType) => {
    if (get().canDownload(designId)) return true // already unlocked
    set({ checkoutOpen: true, pendingDownload: { designId, productType } })
    return false
  },

  handlePaymentSuccess: async (reference) => {
    try {
      const data = await apiFetch('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ reference }),
      })
      const state = {
        credits: data.credits,
        isUnlimited: data.isUnlimited,
        unlockedDesigns: data.unlockedDesigns || [],
      }
      set(state)
      saveCache(state)
      return data
    } catch (err) {
      throw err
    }
  },

  unlockDesign: async (designId, productType) => {
    try {
      const data = await apiFetch('/payments/unlock-design', {
        method: 'POST',
        body: JSON.stringify({ designId, productType }),
      })
      const state = {
        credits: data.credits,
        isUnlimited: data.isUnlimited,
        unlockedDesigns: data.unlockedDesigns || [],
      }
      set(state)
      saveCache(state)
      return data
    } catch (err) {
      throw err
    }
  },

  closeCheckout: () => set({ checkoutOpen: false, pendingDownload: null }),

  clear: () => {
    set({ credits: 0, unlockedDesigns: [], isUnlimited: false, isLoading: false, checkoutOpen: false, pendingDownload: null })
    saveCache(null)
  },
}))
