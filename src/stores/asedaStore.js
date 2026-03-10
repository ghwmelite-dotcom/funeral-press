import { create } from 'zustand'
import { asedaDefaultDesign } from '../utils/asedaDefaultData'

const STORAGE_KEY = 'funeralpress_aseda'
const CURRENT_KEY = 'funeralpress_aseda_current'

function loadDesigns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveDesigns(designs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs))
  } catch { /* ignore */ }
}

function loadCurrentDesign() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.deceasedName !== undefined) return parsed
    }
  } catch { /* ignore */ }
  return null
}

function saveCurrentDesign(design) {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(design))
  } catch { /* ignore */ }
}

export const useAsedaStore = create((set, get) => ({
  designs: loadDesigns(),
  currentDesign: loadCurrentDesign() || { ...asedaDefaultDesign },

  createDesign: () => {
    const state = get()
    const design = {
      ...state.currentDesign,
      id: `aseda-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const designs = [...state.designs, design]
    saveDesigns(designs)
    saveCurrentDesign(design)
    set({ designs, currentDesign: design })
    return design.id
  },

  updateDesign: (updates) => {
    const state = get()
    const updated = { ...state.currentDesign, ...updates, updatedAt: new Date().toISOString() }
    saveCurrentDesign(updated)
    set({ currentDesign: updated })

    if (updated.id) {
      const designs = state.designs.map(d => d.id === updated.id ? updated : d)
      saveDesigns(designs)
      set({ designs })
    }
  },

  deleteDesign: (id) => {
    const state = get()
    const designs = state.designs.filter(d => d.id !== id)
    saveDesigns(designs)
    set({ designs })
    if (state.currentDesign?.id === id) {
      const fresh = { ...asedaDefaultDesign }
      saveCurrentDesign(fresh)
      set({ currentDesign: fresh })
    }
  },

  loadDesign: (id) => {
    const state = get()
    const design = state.designs.find(d => d.id === id)
    if (design) {
      saveCurrentDesign(design)
      set({ currentDesign: { ...design } })
    }
  },

  resetDesign: () => {
    const fresh = { ...asedaDefaultDesign }
    saveCurrentDesign(fresh)
    set({ currentDesign: fresh })
  },

  updateField: (field, value) => {
    const state = get()
    const updated = { ...state.currentDesign, [field]: value, updatedAt: new Date().toISOString() }
    saveCurrentDesign(updated)
    set({ currentDesign: updated })
  },
}))
