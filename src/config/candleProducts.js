// Frontend mirror of workers/candleConfig.js — must stay identical.
// Drift is enforced by src/config/__tests__/candleProducts.test.js.
export const CANDLE_PRODUCTS = {
  candle: { label: 'Light a candle', icon: 'candle', pesewas: 1000, maxMessage: 80 },
  flowers: { label: 'Lay flowers', icon: 'flower', pesewas: 2000, maxMessage: 160 },
  tribute: { label: 'Leave a tribute', icon: 'feather', pesewas: 5000, maxMessage: 500 },
}

// Returns the product for a type, or null for an unknown type.
export function candleProduct(type) {
  return CANDLE_PRODUCTS[type] || null
}
