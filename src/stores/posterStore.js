import { create } from 'zustand'
import { posterDefaultData } from '../utils/posterDefaultData'

const STORAGE_KEY = 'obituary-poster-data'
const POSTERS_KEY = 'obituary-posters-list'

function loadFromStorage(id) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${id}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function saveToStorage(id, data) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(data))
  } catch { /* ignore */ }
}

function loadPostersList() {
  try {
    const raw = localStorage.getItem(POSTERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function savePostersList(list) {
  try {
    localStorage.setItem(POSTERS_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const MAX_HISTORY = 30
const MAX_SNAPSHOTS = 5

export const usePosterStore = create((set, get) => ({
  // Current poster data
  ...posterDefaultData,
  currentId: null,
  isDirty: false,

  // History for undo/redo
  history: [],
  historyIndex: -1,

  // Posters list
  postersList: loadPostersList(),

  // Edit tracking, auto-save, and snapshots
  editCountSinceLastSave: 0,
  lastAutoSaveAt: null,
  snapshots: [],

  // Push state for undo
  _pushHistory: () => {
    const state = get()
    const snapshot = extractData(state)
    const history = state.history.slice(0, state.historyIndex + 1)
    history.push(snapshot)
    if (history.length > MAX_HISTORY) history.shift()
    set({ history, historyIndex: history.length - 1 })
  },

  // Update a field
  updateField: (field, value) => {
    const state = get()
    state._pushHistory()
    set({ [field]: value, isDirty: true, editCountSinceLastSave: state.editCountSinceLastSave + 1 })
  },

  // Update nested fields
  updateNested: (path, value) => {
    const state = get()
    state._pushHistory()
    const parts = path.split('.')
    if (parts.length === 2) {
      const [parent, child] = parts
      set({
        [parent]: { ...state[parent], [child]: value },
        isDirty: true,
        editCountSinceLastSave: state.editCountSinceLastSave + 1,
      })
    }
  },

  // Update a funeral arrangement item
  updateFuneralArrangement: (index, field, value) => {
    const state = get()
    state._pushHistory()
    const arrangements = [...state.funeralArrangements]
    arrangements[index] = { ...arrangements[index], [field]: value }
    set({
      funeralArrangements: arrangements,
      isDirty: true,
      editCountSinceLastSave: state.editCountSinceLastSave + 1,
    })
  },

  // Add a funeral arrangement item
  addFuneralArrangement: () => {
    const state = get()
    state._pushHistory()
    set({
      funeralArrangements: [...state.funeralArrangements, { label: '', value: '' }],
      isDirty: true,
    })
  },

  // Remove a funeral arrangement item
  removeFuneralArrangement: (index) => {
    const state = get()
    state._pushHistory()
    set({
      funeralArrangements: state.funeralArrangements.filter((_, i) => i !== index),
      isDirty: true,
    })
  },

  // Undo/Redo
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({ ...prev, historyIndex: historyIndex - 1, history, isDirty: true })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({ ...next, historyIndex: historyIndex + 1, history, isDirty: true })
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Snapshot management
  createSnapshot: (label) => {
    const state = get()
    const data = extractData(state)
    const snap = {
      id: `snap-${Date.now()}`,
      label: label || 'Manual snapshot',
      timestamp: new Date().toISOString(),
      data,
    }
    const snapshots = [snap, ...state.snapshots].slice(0, MAX_SNAPSHOTS)
    set({ snapshots })
  },

  restoreSnapshot: (id) => {
    const state = get()
    const snap = state.snapshots.find(s => s.id === id)
    if (snap) {
      set({ ...snap.data, isDirty: true, history: [], historyIndex: -1 })
    }
  },

  deleteSnapshot: (id) => {
    set({ snapshots: get().snapshots.filter(s => s.id !== id) })
  },

  // Smart filename helper
  getSmartFilename: (ext) => {
    const state = get()
    const name = state.fullName?.trim()
    if (name) {
      return `${name.replace(/\s+/g, '-')}-Obituary-Poster.${ext}`
    }
    return `Obituary-Poster.${ext}`
  },

  // Save / Load
  savePoster: () => {
    const state = get()
    let id = state.currentId
    if (!id) {
      id = `poster-${Date.now()}`
      set({ currentId: id })
    }
    const data = extractData(state)
    saveToStorage(id, data)

    const list = loadPostersList()
    const existing = list.findIndex((p) => p.id === id)
    const entry = {
      id,
      name: `${state.headerTitle} ${state.fullName}`.trim(),
      updatedAt: new Date().toISOString(),
    }
    if (existing >= 0) {
      list[existing] = entry
    } else {
      list.push(entry)
    }
    savePostersList(list)
    set({ isDirty: false, postersList: list, editCountSinceLastSave: 0, lastAutoSaveAt: new Date().toISOString() })
    return id
  },

  loadPoster: (id) => {
    const data = loadFromStorage(id)
    if (data) {
      set({ ...data, currentId: id, isDirty: false, history: [], historyIndex: -1 })
    }
  },

  deletePoster: (id) => {
    try { localStorage.removeItem(`${STORAGE_KEY}-${id}`) } catch { /* ignore */ }
    const list = loadPostersList().filter((p) => p.id !== id)
    savePostersList(list)
    set({ postersList: list })
  },

  newPoster: () => {
    set({
      ...posterDefaultData,
      currentId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
      editCountSinceLastSave: 0,
      lastAutoSaveAt: null,
    })
  },

  loadTemplate: (data) => {
    set({
      ...posterDefaultData,
      ...data,
      currentId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
      editCountSinceLastSave: 0,
      lastAutoSaveAt: null,
    })
  },

  // Export/Import JSON
  exportJSON: () => {
    const data = extractData(get())
    return JSON.stringify(data, null, 2)
  },

  importJSON: (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr)
      return data
    } catch {
      return false
    }
  },

  applyImport: (data) => {
    set({ ...data, isDirty: true, history: [], historyIndex: -1 })
  },
}))

function extractData(state) {
  const {
    currentId, isDirty, history, historyIndex, postersList,
    editCountSinceLastSave, lastAutoSaveAt, snapshots,
    _pushHistory, updateField, updateNested,
    updateFuneralArrangement, addFuneralArrangement, removeFuneralArrangement,
    undo, redo, canUndo, canRedo,
    savePoster, loadPoster, deletePoster, newPoster, loadTemplate,
    exportJSON, importJSON, applyImport,
    createSnapshot, restoreSnapshot, deleteSnapshot,
    getSmartFilename,
    ...data
  } = state
  return data
}
