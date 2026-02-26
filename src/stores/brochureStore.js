import { create } from 'zustand'
import { defaultData, defaultOrderOfService } from '../utils/defaultData'
import { syncDesign, deleteDesignFromCloud } from '../utils/syncEngine'
import { useAuthStore } from './authStore'

const STORAGE_KEY = 'funeral-brochure-data'
const BROCHURES_KEY = 'funeral-brochures-list'
const ACTIVE_KEY = 'funeral-brochure-active-id'

function loadFromStorage(id) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${id}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function getActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}

function setActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch { /* ignore */ }
}

function migrateOrderOfService(data) {
  if (!data || !data.orderOfService) return data
  const church = data.orderOfService.churchService
  // Detect old generic template by first item
  if (church && church.length > 0 && /Arrival of Body/i.test(church[0].description)) {
    data.orderOfService = { ...data.orderOfService, churchService: defaultOrderOfService.churchService }
  }
  // Migrate privateBurial if still generic
  const burial = data.orderOfService.privateBurial
  if (burial && burial.length > 0 && !burial[0].time && /Delegation Departs with Body$/i.test(burial[0].description)) {
    data.orderOfService = { ...data.orderOfService, privateBurial: defaultOrderOfService.privateBurial }
  }
  return data
}

function loadInitialState() {
  const activeId = getActiveId()
  if (activeId) {
    const data = loadFromStorage(activeId)
    if (data) return { ...migrateOrderOfService(data), currentId: activeId }
  }
  return {}
}

function saveToStorage(id, data) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(data))
  } catch { /* ignore */ }
}

function loadBrochuresList() {
  try {
    const raw = localStorage.getItem(BROCHURES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveBrochuresList(list) {
  try {
    localStorage.setItem(BROCHURES_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

const MAX_HISTORY = 30
const MAX_SNAPSHOTS = 5

const _initial = loadInitialState()

export const useBrochureStore = create((set, get) => ({
  // Current brochure data (restored from localStorage if available)
  ...defaultData,
  ..._initial,
  currentId: _initial.currentId || null,
  isDirty: false,

  // History for undo/redo
  history: [],
  historyIndex: -1,

  // Brochures list
  brochuresList: loadBrochuresList(),

  // New state for edit tracking, auto-save, and snapshots
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

  // Update order of service
  updateServiceItem: (section, index, field, value) => {
    const state = get()
    state._pushHistory()
    const items = [...state.orderOfService[section]]
    items[index] = { ...items[index], [field]: value }
    set({
      orderOfService: { ...state.orderOfService, [section]: items },
      isDirty: true,
      editCountSinceLastSave: state.editCountSinceLastSave + 1,
    })
  },

  addServiceItem: (section) => {
    const state = get()
    state._pushHistory()
    const items = [...state.orderOfService[section], { time: '', description: '' }]
    set({
      orderOfService: { ...state.orderOfService, [section]: items },
      isDirty: true,
    })
  },

  removeServiceItem: (section, index) => {
    const state = get()
    state._pushHistory()
    const items = state.orderOfService[section].filter((_, i) => i !== index)
    set({
      orderOfService: { ...state.orderOfService, [section]: items },
      isDirty: true,
    })
  },

  moveServiceItem: (section, from, to) => {
    const state = get()
    state._pushHistory()
    const items = [...state.orderOfService[section]]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)
    set({
      orderOfService: { ...state.orderOfService, [section]: items },
      isDirty: true,
    })
  },

  // Update tributes
  updateTribute: (index, field, value) => {
    const state = get()
    state._pushHistory()
    const tributes = [...state.tributes]
    tributes[index] = { ...tributes[index], [field]: value }
    set({ tributes, isDirty: true, editCountSinceLastSave: state.editCountSinceLastSave + 1 })
  },

  updateTributePhoto: (tributeIndex, photoIndex, src) => {
    const state = get()
    state._pushHistory()
    const tributes = [...state.tributes]
    const photos = [...(tributes[tributeIndex].photos || [null, null, null])]
    photos[photoIndex] = src
    tributes[tributeIndex] = { ...tributes[tributeIndex], photos }
    set({ tributes, isDirty: true })
  },

  updateTributeCaption: (tributeIndex, captionIndex, caption) => {
    const state = get()
    state._pushHistory()
    const tributes = [...state.tributes]
    const photoCaptions = [...(tributes[tributeIndex].photoCaptions || ['', '', ''])]
    photoCaptions[captionIndex] = caption
    tributes[tributeIndex] = { ...tributes[tributeIndex], photoCaptions }
    set({ tributes, isDirty: true })
  },

  addTribute: () => {
    const state = get()
    state._pushHistory()
    set({
      tributes: [
        ...state.tributes,
        {
          id: `trib-${Date.now()}`,
          title: 'New Tribute',
          subtitle: '',
          openingVerse: '',
          body: '',
          closingLine: 'Rest in Perfect Peace',
          photos: [null, null, null],
          photoCaptions: ['', '', ''],
        },
      ],
      isDirty: true,
    })
  },

  removeTribute: (index) => {
    const state = get()
    state._pushHistory()
    set({
      tributes: state.tributes.filter((_, i) => i !== index),
      isDirty: true,
    })
  },

  // Update officials
  updateOfficial: (section, index, field, value) => {
    const state = get()
    state._pushHistory()
    const list = [...state.officials[section]]
    list[index] = { ...list[index], [field]: value }
    set({
      officials: { ...state.officials, [section]: list },
      isDirty: true,
      editCountSinceLastSave: state.editCountSinceLastSave + 1,
    })
  },

  addOfficial: (section) => {
    const state = get()
    state._pushHistory()
    set({
      officials: {
        ...state.officials,
        [section]: [...state.officials[section], { role: '', name: '' }],
      },
      isDirty: true,
    })
  },

  removeOfficial: (section, index) => {
    const state = get()
    state._pushHistory()
    set({
      officials: {
        ...state.officials,
        [section]: state.officials[section].filter((_, i) => i !== index),
      },
      isDirty: true,
    })
  },

  // Gallery photos
  updateGalleryPhoto: (index, field, value) => {
    const state = get()
    const photos = [...state.galleryPhotos]
    photos[index] = { ...photos[index], [field]: value }
    set({ galleryPhotos: photos, isDirty: true })
  },

  addGalleryPhoto: () => {
    const state = get()
    set({
      galleryPhotos: [
        ...state.galleryPhotos,
        { id: `photo-${Date.now()}`, src: null, caption: '', pageTitle: 'More Memories' },
      ],
      isDirty: true,
    })
  },

  removeGalleryPhoto: (index) => {
    const state = get()
    set({
      galleryPhotos: state.galleryPhotos.filter((_, i) => i !== index),
      isDirty: true,
    })
  },

  // Biography photos
  updateBiographyPhoto: (index, src) => {
    const state = get()
    const photos = [...state.biographyPhotos]
    photos[index] = src
    set({ biographyPhotos: photos, isDirty: true })
  },

  updateBiographyCaption: (index, caption) => {
    const state = get()
    const captions = [...state.biographyPhotoCaptions]
    captions[index] = caption
    set({ biographyPhotoCaptions: captions, isDirty: true })
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
      return `${name.replace(/\s+/g, '-')}-Memorial-Brochure.${ext}`
    }
    return `Memorial-Brochure.${ext}`
  },

  // Load template data (like newBrochure but merges template data with defaults)
  loadTemplate: (data) => {
    set({
      ...defaultData,
      ...data,
      currentId: null,
      isDirty: false,
      history: [],
      historyIndex: -1,
      editCountSinceLastSave: 0,
      lastAutoSaveAt: null,
    })
  },

  // Save / Load
  saveBrochure: () => {
    const state = get()
    let id = state.currentId
    if (!id) {
      id = `brochure-${Date.now()}`
      set({ currentId: id })
    }
    const data = extractData(state)
    saveToStorage(id, data)
    setActiveId(id)

    const list = loadBrochuresList()
    const existing = list.findIndex((b) => b.id === id)
    const entry = {
      id,
      name: `${state.title} ${state.fullName}`,
      updatedAt: new Date().toISOString(),
    }
    if (existing >= 0) {
      list[existing] = entry
    } else {
      list.push(entry)
    }
    saveBrochuresList(list)
    set({ isDirty: false, brochuresList: list, editCountSinceLastSave: 0, lastAutoSaveAt: new Date().toISOString() })

    // Cloud sync
    if (useAuthStore.getState().isLoggedIn()) {
      syncDesign('brochure', id, data, entry.name, entry.updatedAt)
    }

    return id
  },

  loadBrochure: (id) => {
    const data = loadFromStorage(id)
    if (data) {
      setActiveId(id)
      set({ ...data, currentId: id, isDirty: false, history: [], historyIndex: -1 })
    }
  },

  deleteBrochure: (id) => {
    try { localStorage.removeItem(`${STORAGE_KEY}-${id}`) } catch { /* ignore */ }
    const list = loadBrochuresList().filter((b) => b.id !== id)
    saveBrochuresList(list)
    set({ brochuresList: list })
    deleteDesignFromCloud(id)
  },

  newBrochure: () => {
    setActiveId(null)
    set({
      ...defaultData,
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
    setActiveId(id)
    const list = loadBrochuresList()
    if (!list.find((b) => b.id === id)) {
      list.push({ id, name, updatedAt: new Date().toISOString() })
    }
    saveBrochuresList(list)
    set({ ...data, currentId: id, isDirty: false, brochuresList: list, history: [], historyIndex: -1 })
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
    currentId, isDirty, history, historyIndex, brochuresList,
    editCountSinceLastSave, lastAutoSaveAt, snapshots,
    _pushHistory, updateField, updateNested, updateServiceItem,
    addServiceItem, removeServiceItem, moveServiceItem,
    updateTribute, updateTributePhoto, updateTributeCaption, addTribute, removeTribute,
    updateOfficial, addOfficial, removeOfficial,
    updateGalleryPhoto, addGalleryPhoto, removeGalleryPhoto,
    updateBiographyPhoto, updateBiographyCaption,
    undo, redo, canUndo, canRedo,
    saveBrochure, loadBrochure, deleteBrochure, newBrochure, loadFromCloudData,
    exportJSON, importJSON, applyImport,
    createSnapshot, restoreSnapshot, deleteSnapshot,
    getSmartFilename, loadTemplate,
    ...data
  } = state
  return data
}
