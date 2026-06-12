// src/config/priceBook.js
// MIRROR of workers/priceBook.js — kept byte-identical except this header.
// Do NOT edit independently; update workers/priceBook.js and copy here.
// Drift is caught by src/config/__tests__/priceBook.drift.test.js.
// Amounts in minor units. NGN dormant until a Paystack Nigeria account exists.

export const CURRENCIES = {
  GHS: { enabled: true,  symbol: 'GHS', provider: 'paystack' },
  NGN: { enabled: false, symbol: '₦',   provider: 'paystack' },
  // GBP dormant pending a UK entity (Stripe doesn't onboard Ghana merchants).
  GBP: { enabled: false, symbol: '£',   provider: 'stripe' },
  // USD via Paystack Ghana — flip enabled once Paystack activates USD for the
  // business (see the activation checklist in the 2026-06-12 paystack-usd plan).
  USD: { enabled: false, symbol: '$',   provider: 'paystack' },
}

// kind: 'one_time' grants credits via the existing waterfall; 'subscription'
// creates a subscriptions row; memorial_* attach to a memorial via metadata.
export const PRODUCTS = {
  single:  { kind: 'one_time', credits: 1,  label: 'Single Design',
    prices: { GHS: 3500,  NGN: 450000,   GBP: 900,   USD: 1200 } },
  bundle:  { kind: 'one_time', credits: 3,  label: 'Bundle (3 Designs)',
    prices: { GHS: 7500,  NGN: 950000,   GBP: 1900,  USD: 2500 } },
  suite:   { kind: 'one_time', credits: -1, label: 'Unlimited Suite',
    prices: { GHS: 12000, NGN: 1500000,  GBP: 2900,  USD: 3900 } },
  pro_monthly: { kind: 'subscription', interval: 'month', label: 'Pro Monthly',
    prices: { GHS: 8500,  NGN: 1100000,  GBP: 1200,  USD: 1500 } },
  pro_annual:  { kind: 'subscription', interval: 'year', label: 'Pro Annual',
    prices: { GHS: 85000, NGN: 11000000, GBP: 11900, USD: 14900 } },
  memorial_premium_annual:  { kind: 'subscription', interval: 'year', memorial: true, tier: 'premium',  label: 'Memorial Premium (Annual)',
    prices: { GHS: 12000, NGN: 1500000,  GBP: 2900,  USD: 3900 } },
  memorial_heritage_annual: { kind: 'subscription', interval: 'year', memorial: true, tier: 'heritage', label: 'Memorial Heritage (Annual)',
    prices: { GHS: 28000, NGN: 3600000,  GBP: 4900,  USD: 5900 } },
  memorial_premium_lifetime:  { kind: 'one_time', memorial: true, tier: 'premium',  label: 'Memorial Premium (Lifetime)',
    prices: { GHS: 30000, NGN: 3800000,  GBP: 6900,  USD: 8900 } },
  memorial_heritage_lifetime: { kind: 'one_time', memorial: true, tier: 'heritage', label: 'Memorial Heritage (Lifetime)',
    prices: { GHS: 70000, NGN: 8800000,  GBP: 11900, USD: 14900 } },
}

const EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']

export function currencyForCountry(country) {
  if (country === 'GH') return 'GHS'
  if (country === 'NG' && CURRENCIES.NGN.enabled) return 'NGN'
  if ((country === 'GB' || EU.includes(country)) && CURRENCIES.GBP.enabled) return 'GBP'
  return CURRENCIES.USD.enabled ? 'USD' : 'GHS'
}

export function priceFor(productKey, currency) {
  const product = PRODUCTS[productKey]
  if (!product) throw new Error(`Unknown product: ${productKey}`)
  const amount = product.prices[currency]
  if (amount == null) throw new Error(`No ${currency} price for ${productKey}`)
  return amount
}

export function providerFor(currency) {
  const c = CURRENCIES[currency]
  if (!c) throw new Error(`Unknown currency: ${currency}`)
  return c.provider
}

export function isSubscription(productKey) {
  return PRODUCTS[productKey]?.kind === 'subscription'
}

export function formatMoney(minorUnits, currency) {
  const c = CURRENCIES[currency]
  if (!c) throw new Error(`Unknown currency: ${currency}`)
  const amount = minorUnits / 100
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return c.symbol === 'GHS' ? `GHS ${formatted}` : `${c.symbol}${formatted}`
}
