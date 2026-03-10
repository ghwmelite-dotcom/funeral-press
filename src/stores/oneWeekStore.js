import { create } from 'zustand'
import { oneWeekDefaultData } from '../utils/oneWeekDefaultData'
import { syncDesign, deleteDesignFromCloud } from '../utils/syncEngine'
import { useAuthStore } from './authStore'

const STORAGE_KEY = 'oneweek-poster-data'
const LIST_KEY = 'oneweek-posters-list'

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

function loadList() {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveList(list) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const MAX_HISTORY = 30
const MAX_SNAPSHOTS = 5

export const useOneWeekStore = create((set, get) => ({
  ...oneWeekDefaultData,
  currentId: null,
  isDirty: false,
  history: [],
  historyIndex: -1,
  designsList: loadList(),
  editCountSinceLastSave: 0,
  lastAutoSaveAt: null,
  snapshots: [],

  _pushHistory: () => {
    const state = get()
    const snapshot = extractData(state)
    const history = state.history.slice(0, state.historyIndex + 1)
    history.push(snapshot)
    if (history.length > MAX_HISTORY) history.shift()
    set({ history, historyIndex: history.length - 1 })
  },

  updateField: (field, value) => {
    const state = get()
    state._pushHistory()
    set({ [field]: value, isDirty: true, editCountSinceLastSave: state.editCountSinceLastSave + 1 })
  },

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

  getSmartFilename: (ext) => {
    const state = get()
    const name = state.fullName?.trim()
    if (name) {
      return `${name.replace(/\s+/g, '-')}-One-Week-Poster.${ext}`
    }
    return `One-Week-Poster.${ext}`
  },

  saveDesign: () => {
    const state = get()
    let id = state.currentId
    if (!id) {
      id = `oneweek-${Date.now()}`
      set({ currentId: id })
    }
    const data = extractData(state)
    saveToStorage(id, data)

    const list = loadList()
    const existing = list.findIndex((p) => p.id === id)
    const entry = {
      id,
      name: `${state.headerTitle} - ${state.fullName}`.trim(),
      updatedAt: new Date().toISOString(),
    }
    if (existing >= 0) {
      list[existing] = entry
    } else {
      list.push(entry)
    }
    saveList(list)
    set({ isDirty: false, designsList: list, editCountSinceLastSave: 0, lastAutoSaveAt: new Date().toISOString() })

    if (useAuthStore.getState().isLoggedIn()) {
      syncDesign('oneweek', id, data, entry.name, entry.updatedAt)
    }

    return id
  },

  loadDesign: (id) => {
    const data = loadFromStorage(id)
    if (data) {
      set({ ...data, currentId: id, isDirty: false, history: [], historyIndex: -1 })
    }
  },

  deleteDesign: (id) => {
    try { localStorage.removeItem(`${STORAGE_KEY}-${id}`) } catch { /* ignore */ }
    const list = loadList().filter((p) => p.id !== id)
    saveList(list)
    set({ designsList: list })
    deleteDesignFromCloud(id)
  },

  newDesign: () => {
    set({
      ...oneWeekDefaultData,
      currentId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
      editCountSinceLastSave: 0,
      lastAutoSaveAt: null,
    })
  },

  loadFromCloudData: (id, data, name) => {
    saveToStorage(id, data)
    const list = loadList()
    if (!list.find((p) => p.id === id)) {
      list.push({ id, name, updatedAt: new Date().toISOString() })
    }
    saveList(list)
    set({ ...data, currentId: id, isDirty: false, designsList: list, history: [], historyIndex: -1 })
  },

  exportJSON: () => {
    const data = extractData(get())
    return JSON.stringify(data, null, 2)
  },

  importJSON: (jsonStr) => {
    try {
      return JSON.parse(jsonStr)
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
    currentId, isDirty, history, historyIndex, designsList,
    editCountSinceLastSave, lastAutoSaveAt, snapshots,
    _pushHistory, updateField,
    undo, redo, canUndo, canRedo,
    saveDesign, loadDesign, deleteDesign, newDesign, loadFromCloudData,
    exportJSON, importJSON, applyImport,
    createSnapshot, restoreSnapshot, deleteSnapshot,
    getSmartFilename,
    ...data
  } = state
  return data
}
