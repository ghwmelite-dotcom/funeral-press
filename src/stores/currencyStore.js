// src/stores/currencyStore.js
// Display-currency resolution (spec §3.1): geo default via GET /geo, manual
// override persisted per session. Existing purchases keep their original
// currency forever — this store only affects what NEW purchases display/charge.
import { create } from 'zustand'
import { CURRENCIES } from '../config/priceBook'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'
const SESSION_KEY = 'fp-currency'

function readOverride() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    return v && CURRENCIES[v]?.enabled ? v : null
  } catch { return null }
}

export const useCurrencyStore = create((set, get) => ({
  currency: 'GHS',
  country: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const override = readOverride()
    try {
      const res = await fetch(`${API_BASE}/geo`)
      const data = await res.json()
      set({
        country: data.country || null,
        currency: override || (CURRENCIES[data.currency]?.enabled ? data.currency : 'GHS'),
        hydrated: true,
      })
    } catch {
      set({ currency: override || 'GHS', hydrated: true })
    }
  },

  setCurrency: (currency) => {
    if (!CURRENCIES[currency]?.enabled) return
    try { sessionStorage.setItem(SESSION_KEY, currency) } catch { /* ignore */ }
    set({ currency })
  },
}))
