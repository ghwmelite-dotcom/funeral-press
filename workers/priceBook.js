// workers/priceBook.js
// Single source of truth for sellable products in all currencies — spec §3.2,
// docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md.
// Amounts in minor units. Mirrored to src/config/priceBook.js (drift-tested).
// NGN is dormant until a Paystack Nigeria account exists (spec correction #2).

export const CURRENCIES = {
  GHS: { enabled: true,  symbol: 'GHS', provider: 'paystack' },
  NGN: { enabled: false, symbol: '₦',   provider: 'paystack' },
  GBP: { enabled: true,  symbol: '£',   provider: 'stripe' },
  USD: { enabled: true,  symbol: '$',   provider: 'stripe' },
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
  if (country === 'NG') return CURRENCIES.NGN.enabled ? 'NGN' : 'USD'
  if (country === 'GB' || EU.includes(country)) return 'GBP'
  return 'USD'
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
