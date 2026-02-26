import { create } from 'zustand'
import { apiFetch } from '../utils/apiClient'

const GHANA_REGIONS = [
  { value: 'greater-accra', label: 'Greater Accra' },
  { value: 'ashanti', label: 'Ashanti' },
  { value: 'western', label: 'Western' },
  { value: 'eastern', label: 'Eastern' },
  { value: 'central', label: 'Central' },
  { value: 'volta', label: 'Volta' },
  { value: 'northern', label: 'Northern' },
  { value: 'upper-east', label: 'Upper East' },
  { value: 'upper-west', label: 'Upper West' },
  { value: 'bono', label: 'Bono' },
  { value: 'bono-east', label: 'Bono East' },
  { value: 'ahafo', label: 'Ahafo' },
  { value: 'western-north', label: 'Western North' },
  { value: 'oti', label: 'Oti' },
  { value: 'north-east', label: 'North East' },
  { value: 'savannah', label: 'Savannah' },
]

const MIN_QUANTITIES = {
  brochure: 10, poster: 5, invitation: 20, booklet: 10, banner: 1, thankYou: 20,
}

const PRODUCT_SIZES = {
  brochure:   { sizes: ['A5', 'A4', 'A3'], default: 'A4', labels: { A5: 'A5 (folded)', A4: 'A4 (folded)', A3: 'A3 (folded)' } },
  poster:     { sizes: ['A3', 'A2', 'A1', 'A0'], default: 'A2', labels: { A3: 'A3 (29.7 x 42cm)', A2: 'A2 (42 x 59.4cm)', A1: 'A1 (59.4 x 84.1cm)', A0: 'A0 (84.1 x 118.9cm)' } },
  invitation: { sizes: ['A6', 'A5'], default: 'A5', labels: { A6: 'A6 (10.5 x 14.8cm)', A5: 'A5 (14.8 x 21cm)' } },
  booklet:    { sizes: ['A5', 'A4'], default: 'A5', labels: { A5: 'A5 (14.8 x 21cm)', A4: 'A4 (21 x 29.7cm)' } },
  banner:     { sizes: ['3x6', '4x8', '5x10'], default: '4x8', labels: { '3x6': 'Small (3 x 6 ft)', '4x8': 'Medium (4 x 8 ft)', '5x10': 'Large (5 x 10 ft)' } },
  thankYou:   { sizes: ['A7', 'A6', 'A5'], default: 'A6', labels: { A7: 'A7 (7.4 x 10.5cm)', A6: 'A6 (10.5 x 14.8cm)', A5: 'A5 (14.8 x 21cm)' } },
}

const initialFormState = {
  quantity: 10,
  size: '',
  paperQuality: 'standard',
  recipientName: '',
  recipientPhone: '',
  deliveryCity: '',
  deliveryArea: '',
  deliveryLandmark: '',
  deliveryRegion: 'greater-accra',
}

export { GHANA_REGIONS, MIN_QUANTITIES, PRODUCT_SIZES }

export const usePrintOrderStore = create((set, get) => ({
  dialogOpen: false,
  currentDesign: null, // { designId, productType, designName, designSnapshot }
  ...initialFormState,
  pricing: null,
  isPricingLoading: false,
  stage: 'form', // form | loading | paying | verifying | success | error | not-logged-in
  errorMsg: '',
  orderId: null,
  orders: [],
  isLoadingOrders: false,

  openDialog: (designId, productType, designName, designSnapshot) => {
    const minQty = MIN_QUANTITIES[productType] || 10
    const productSizes = PRODUCT_SIZES[productType]
    const defaultSize = productSizes?.default || ''
    set({
      dialogOpen: true,
      currentDesign: { designId, productType, designName, designSnapshot },
      ...initialFormState,
      quantity: minQty,
      size: defaultSize,
      pricing: null,
      stage: 'form',
      errorMsg: '',
      orderId: null,
    })
    // Auto-calculate initial price
    setTimeout(() => get().calculatePrice(), 0)
  },

  closeDialog: () => set({ dialogOpen: false, currentDesign: null, stage: 'form', errorMsg: '' }),

  setField: (field, value) => {
    set({ [field]: value })
    const pricingFields = ['quantity', 'size', 'paperQuality', 'deliveryRegion']
    if (pricingFields.includes(field)) {
      // Debounce price calculation
      clearTimeout(get()._priceTimer)
      const timer = setTimeout(() => get().calculatePrice(), 300)
      set({ _priceTimer: timer })
    }
  },

  setStage: (stage) => set({ stage }),
  setError: (errorMsg) => set({ stage: 'error', errorMsg }),

  calculatePrice: async () => {
    const { currentDesign, quantity, size, paperQuality, deliveryRegion } = get()
    if (!currentDesign) return

    set({ isPricingLoading: true })
    try {
      const data = await apiFetch('/print-orders/calculate', {
        method: 'POST',
        body: JSON.stringify({
          productType: currentDesign.productType,
          quantity,
          size,
          paperQuality,
          deliveryRegion,
        }),
      })
      set({ pricing: data.pricing, isPricingLoading: false })
    } catch (err) {
      set({ pricing: null, isPricingLoading: false })
    }
  },

  fetchOrders: async () => {
    set({ isLoadingOrders: true })
    try {
      const data = await apiFetch('/print-orders')
      set({ orders: data.orders, isLoadingOrders: false })
    } catch {
      set({ isLoadingOrders: false })
    }
  },
}))
