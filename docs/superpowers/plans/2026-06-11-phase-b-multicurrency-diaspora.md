# Phase B: Multi-Currency Pricing + Diaspora Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diaspora visitors see and pay value-based GBP/USD prices via Stripe Checkout while Ghana keeps GHS via Paystack — plus five diaspora landing pages — per spec `docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md` §3.

**Architecture:** A pure price-book module (`workers/priceBook.js`, mirrored to `src/config/priceBook.js` with a drift test, following the existing `tierConfig`/`memorialTiers` pattern) is the single source of truth for all sellable products in 4 currencies. A tiny `GET /geo` endpoint exposes `request.cf.country`; a Zustand `currencyStore` resolves display currency (geo default, manual override per session). GHS payments keep the existing Paystack flows untouched; GBP/USD route to new Stripe Checkout Session endpoints (REST via `fetch`, no SDK, inline `price_data` so no dashboard product setup), with a signature-verified webhook + a verify-on-return endpoint mirroring the Paystack verify pattern. Five diaspora landing pages are data-driven: one shared component + one content data file.

**Tech Stack:** Cloudflare Workers + D1, Paystack (GHS), Stripe Checkout + Billing (GBP/USD, REST API `2023-10-16`+), React 19, Zustand, Vitest.

---

## Spec corrections discovered during planning (owner-visible)

1. **Stripe is NOT already integrated** (spec §3.3 said it was — wrong; the codebase is Paystack-only). This plan builds it. **Owner prerequisite:** create a Stripe account and set two secrets before deploy (Task 8 Step 5). Code is testable with `sk_test_` keys.
2. **Paystack Ghana cannot charge NGN** (Paystack currencies are per-business-country). NGN price book ships **dormant** (`enabled: false`); `NG` visitors get USD until a Paystack Nigeria account exists. Spec §3.1's `NG → NGN` mapping activates by flipping one flag.
3. **Spec §3.2 price table corrections:** "Memorial Forever Tribute GHS 150" doesn't exist in the product catalog (real one-time memorial products: Premium lifetime GHS 300, Heritage lifetime GHS 700); Suite (GHS 120 unlimited) was omitted. Derived prices below are marked ★ and need owner confirmation at plan review; all other GBP/USD figures are fixed by the approved spec.
4. **Diaspora page length:** spec §3.4 said 1,200+ words/page; the copy in Task 13 runs ~800–1,100 words/page — dense and complete rather than padded. FAQ schema, currency auto-set, and testimonial-free launch (testimonial slots can be added when real diaspora testimonials exist; fabricating them is off-brand).

## The price book (authoritative for this plan)

All amounts in **minor units** (pesewas / kobo / pence / cents). `credits` consumed by the existing waterfall, currency-agnostic.

| key | kind | GHS | NGN (dormant) | GBP | USD |
|---|---|---|---|---|---|
| `single` | one-time, 1 credit | 3500 | 450000 | 900 | 1200 |
| `bundle` | one-time, 3 credits | 7500 | 950000 | 1900 | 2500 |
| `suite` | one-time, unlimited (−1) | 12000 | 1500000 ★ | 2900 ★ | 3900 ★ |
| `pro_monthly` | subscription /mo | 8500 | 1100000 | 1200 | 1500 |
| `pro_annual` | subscription /yr | 85000 | 11000000 | 11900 | 14900 |
| `memorial_premium_annual` | subscription /yr per memorial | 12000 | 1500000 | 2900 | 3900 |
| `memorial_heritage_annual` | subscription /yr per memorial | 28000 | 3600000 | 4900 | 5900 |
| `memorial_premium_lifetime` | one-time per memorial | 30000 | 3800000 ★ | 6900 ★ | 8900 ★ |
| `memorial_heritage_lifetime` | one-time per memorial | 70000 | 8800000 ★ | 11900 ★ | 14900 ★ |

Out of scope (stay GHS-only, per spec): bulk institutional plans, donations, candles/tributes, print orders. The referral-balance discount (Phase A) applies **only to GHS Paystack charges** — the balance is denominated in pesewas.

Country→currency: `GH`→GHS; `NG`→NGN *when enabled, else USD*; `GB` + EU-27 →GBP; everything else→USD.

---

### Task 1: Price book module (worker, pure, TDD)

**Files:**
- Create: `workers/priceBook.js`
- Test: `workers/__tests__/priceBook.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// workers/__tests__/priceBook.test.js
import { describe, it, expect } from 'vitest'
import {
  PRODUCTS,
  CURRENCIES,
  currencyForCountry,
  priceFor,
  providerFor,
  isSubscription,
} from '../priceBook.js'

describe('currencyForCountry', () => {
  it('maps Ghana to GHS', () => expect(currencyForCountry('GH')).toBe('GHS'))
  it('maps Nigeria to USD while NGN is dormant', () => expect(currencyForCountry('NG')).toBe('USD'))
  it('maps UK and EU to GBP', () => {
    expect(currencyForCountry('GB')).toBe('GBP')
    expect(currencyForCountry('DE')).toBe('GBP')
    expect(currencyForCountry('IE')).toBe('GBP')
  })
  it('maps everything else (and unknown) to USD', () => {
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry(null)).toBe('USD')
    expect(currencyForCountry(undefined)).toBe('USD')
  })
})

describe('priceFor', () => {
  it('returns spec prices for single', () => {
    expect(priceFor('single', 'GHS')).toBe(3500)
    expect(priceFor('single', 'GBP')).toBe(900)
    expect(priceFor('single', 'USD')).toBe(1200)
  })
  it('returns spec prices for memorial heritage annual', () => {
    expect(priceFor('memorial_heritage_annual', 'GBP')).toBe(4900)
    expect(priceFor('memorial_heritage_annual', 'USD')).toBe(5900)
  })
  it('throws on unknown product or currency', () => {
    expect(() => priceFor('nope', 'GHS')).toThrow()
    expect(() => priceFor('single', 'EUR')).toThrow()
  })
})

describe('providerFor', () => {
  it('routes GHS and NGN to paystack', () => {
    expect(providerFor('GHS')).toBe('paystack')
    expect(providerFor('NGN')).toBe('paystack')
  })
  it('routes GBP and USD to stripe', () => {
    expect(providerFor('GBP')).toBe('stripe')
    expect(providerFor('USD')).toBe('stripe')
  })
})

describe('product metadata', () => {
  it('keeps existing GHS plan amounts and credits intact', () => {
    expect(PRODUCTS.single).toMatchObject({ credits: 1, kind: 'one_time' })
    expect(PRODUCTS.bundle).toMatchObject({ credits: 3 })
    expect(PRODUCTS.suite).toMatchObject({ credits: -1 })
    expect(priceFor('suite', 'GHS')).toBe(12000)
  })
  it('flags subscriptions with interval', () => {
    expect(isSubscription('pro_monthly')).toBe(true)
    expect(PRODUCTS.pro_monthly.interval).toBe('month')
    expect(PRODUCTS.pro_annual.interval).toBe('year')
    expect(PRODUCTS.memorial_premium_annual.interval).toBe('year')
    expect(isSubscription('single')).toBe(false)
  })
  it('declares NGN dormant and the other three enabled', () => {
    expect(CURRENCIES.NGN.enabled).toBe(false)
    expect(CURRENCIES.GHS.enabled).toBe(true)
    expect(CURRENCIES.GBP.enabled).toBe(true)
    expect(CURRENCIES.USD.enabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL (module not found)**

Run: `npx vitest run workers/__tests__/priceBook.test.js`

- [ ] **Step 3: Implement**

```javascript
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
```

- [ ] **Step 4: Run — expect PASS (12 tests)**
- [ ] **Step 5: Commit**

```bash
git add workers/priceBook.js workers/__tests__/priceBook.test.js
git commit -m "feat(pricing): add multi-currency price book (GHS/NGN-dormant/GBP/USD)"
```

---

### Task 2: Frontend price-book mirror + drift test + formatter

**Files:**
- Create: `src/config/priceBook.js`
- Test: `src/config/__tests__/priceBook.drift.test.js`, `src/config/__tests__/formatMoney.test.js`

- [ ] **Step 1: Write the failing drift test** (pattern: the existing `memorialTiers`/`tierConfig` drift test — find it with `grep -r "tierConfig" src --include=*.test.*` and match its style)

```javascript
// src/config/__tests__/priceBook.drift.test.js
import { describe, it, expect } from 'vitest'
import * as frontend from '../priceBook.js'
import * as worker from '../../../workers/priceBook.js'

describe('priceBook mirror drift', () => {
  it('PRODUCTS are identical between src/config and workers', () => {
    expect(frontend.PRODUCTS).toEqual(worker.PRODUCTS)
  })
  it('CURRENCIES are identical between src/config and workers', () => {
    expect(frontend.CURRENCIES).toEqual(worker.CURRENCIES)
  })
})
```

```javascript
// src/config/__tests__/formatMoney.test.js
import { describe, it, expect } from 'vitest'
import { formatMoney } from '../priceBook.js'

describe('formatMoney', () => {
  it('formats whole amounts without decimals', () => {
    expect(formatMoney(3500, 'GHS')).toBe('GHS 35')
    expect(formatMoney(900, 'GBP')).toBe('£9')
    expect(formatMoney(1200, 'USD')).toBe('$12')
    expect(formatMoney(450000, 'NGN')).toBe('₦4,500')
  })
  it('keeps two decimals for fractional amounts', () => {
    expect(formatMoney(1250, 'USD')).toBe('$12.50')
  })
})
```

- [ ] **Step 2: Run both — expect FAIL**
- [ ] **Step 3: Implement the mirror**

`src/config/priceBook.js` = byte-identical copy of the `CURRENCIES`, `PRODUCTS`, `EU`, `currencyForCountry`, `priceFor`, `providerFor`, `isSubscription` definitions from `workers/priceBook.js` (copy the file, update the header comment to say it's the mirror), PLUS:

```javascript
export function formatMoney(minorUnits, currency) {
  const c = CURRENCIES[currency]
  if (!c) throw new Error(`Unknown currency: ${currency}`)
  const amount = minorUnits / 100
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return c.symbol === 'GHS' ? `GHS ${formatted}` : `${c.symbol}${formatted}`
}
```

- [ ] **Step 4: Run — expect PASS (4 tests)**
- [ ] **Step 5: Commit**

```bash
git add src/config/priceBook.js src/config/__tests__/
git commit -m "feat(pricing): mirror price book to frontend with drift test and money formatter"
```

---

### Task 3: `GET /geo` endpoint

**Files:**
- Modify: `workers/auth-api.js` (import; public route near the `/analytics/event` route ~line 3346)

- [ ] **Step 1: Import** — next to the `familyReferral.js` import at the top of `workers/auth-api.js`, add:

```javascript
import { currencyForCountry } from './priceBook.js'
```

- [ ] **Step 2: Add the route** — in the PUBLIC routing section (same block as `POST /analytics/event`, which requires no auth), add:

```javascript
    if (method === 'GET' && path === '/geo') {
      const country = request.cf?.country || null
      return json({ country, currency: currencyForCountry(country) }, 200, request)
    }
```

- [ ] **Step 3: Verify** — `npx vitest run` (no regressions; `currencyForCountry` is covered by Task 1).
- [ ] **Step 4: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(pricing): GET /geo resolves visitor country to display currency at the edge"
```

---

### Task 4: Currency store + switcher component (TDD)

**Files:**
- Create: `src/stores/currencyStore.js`, `src/components/pricing/CurrencySwitcher.jsx`
- Test: `src/stores/__tests__/currencyStore.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// src/stores/__tests__/currencyStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrencyStore } from '../currencyStore'

describe('currencyStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useCurrencyStore.setState({ currency: 'GHS', country: null, hydrated: false })
  })

  it('defaults to GHS', () => {
    expect(useCurrencyStore.getState().currency).toBe('GHS')
  })

  it('hydrates from /geo and stores the result', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GB', currency: 'GBP' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GBP')
    expect(useCurrencyStore.getState().country).toBe('GB')
    vi.unstubAllGlobals()
  })

  it('a manual session override beats geo', async () => {
    sessionStorage.setItem('fp-currency', 'USD')
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ country: 'GH', currency: 'GHS' }),
    })))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('USD')
    vi.unstubAllGlobals()
  })

  it('setCurrency persists per session and rejects disabled currencies', () => {
    useCurrencyStore.getState().setCurrency('GBP')
    expect(useCurrencyStore.getState().currency).toBe('GBP')
    expect(sessionStorage.getItem('fp-currency')).toBe('GBP')
    useCurrencyStore.getState().setCurrency('NGN') // dormant
    expect(useCurrencyStore.getState().currency).toBe('GBP')
  })

  it('falls back silently to GHS when /geo fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await useCurrencyStore.getState().hydrate()
    expect(useCurrencyStore.getState().currency).toBe('GHS')
    expect(useCurrencyStore.getState().hydrated).toBe(true)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement the store**

```javascript
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
```

- [ ] **Step 4: Run — expect PASS (5 tests)**
- [ ] **Step 5: Switcher component**

```jsx
// src/components/pricing/CurrencySwitcher.jsx
// Manual currency override (spec §3.1) — shown next to pricing displays.
// Only enabled currencies are offered; NGN appears automatically once enabled.
import { useCurrencyStore } from '../../stores/currencyStore'
import { CURRENCIES } from '../../config/priceBook'

export default function CurrencySwitcher({ className = '' }) {
  const currency = useCurrencyStore((s) => s.currency)
  const setCurrency = useCurrencyStore((s) => s.setCurrency)
  const enabled = Object.keys(CURRENCIES).filter((c) => CURRENCIES[c].enabled)

  return (
    <label className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      Prices in
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label="Display currency"
        className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {enabled.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 6: Hydrate on boot** — in `src/App.jsx`, inside the existing bootstrap `useEffect` (the one calling `useAuthStore.getState().hydrate()`, ~line 111), add as the first line:

```javascript
  import { useCurrencyStore } from './stores/currencyStore'   // with the other store imports
  // inside the effect:
  useCurrencyStore.getState().hydrate()
```

- [ ] **Step 7: `npx vitest run` — full suite PASS. Commit**

```bash
git add src/stores/currencyStore.js src/stores/__tests__/currencyStore.test.js src/components/pricing/CurrencySwitcher.jsx src/App.jsx
git commit -m "feat(pricing): currency store with geo hydration, session override, and switcher"
```

---

### Task 5: D1 migration for multi-currency

**Files:**
- Create: `workers/migrations/migration-multi-currency.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Multi-currency support (spec §3, 2026-06-11-automated-growth-flywheel-design.md)
-- orders.amount_pesewas is reinterpreted as "amount in minor units of `currency`";
-- the column is not renamed to avoid touching every existing query.

ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'GHS';
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;

ALTER TABLE subscriptions ADD COLUMN currency TEXT DEFAULT 'GHS';
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;

-- Plain (non-partial) unique indexes: SQLite allows unlimited NULLs in a UNIQUE
-- index, and the ON CONFLICT(stripe_subscription_id) upserts in the webhook
-- require a non-partial conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_stripe_sub ON subscriptions(stripe_subscription_id);
```

- [ ] **Step 2: Validate locally** — `npx wrangler d1 execute funeralpress-db --local --file=workers/migrations/migration-multi-currency.sql` (if the local DB lacks base tables, note it and rely on the staging apply at deploy time, as with Phase A's migration).
- [ ] **Step 3: Commit**

```bash
git add workers/migrations/migration-multi-currency.sql
git commit -m "feat(pricing): migration for order/subscription currency and stripe ids"
```

---

### Task 6: Unify PLANS with the price book (worker, refactor)

**Files:**
- Modify: `workers/auth-api.js` (`PLANS` object ~lines 271–278; `handlePaymentInitialize`)

- [ ] **Step 1: Derive PLANS from the price book** — replace the hardcoded `single`/`bundle`/`suite` entries so the GHS amounts have one source of truth (bulk institutional tiers stay hardcoded, GHS-only, out of price-book scope):

```javascript
import { PRODUCTS, priceFor, currencyForCountry } from './priceBook.js'  // extend the Task 3 import

const PLANS = {
  single: { amount: priceFor('single', 'GHS'), credits: PRODUCTS.single.credits },
  bundle: { amount: priceFor('bundle', 'GHS'), credits: PRODUCTS.bundle.credits },
  suite:  { amount: priceFor('suite', 'GHS'),  credits: PRODUCTS.suite.credits }, // -1 = unlimited
  bulk10: { amount: 25000, credits: 10, institutional: true },
  bulk25: { amount: 50000, credits: 25, institutional: true },
  bulk50: { amount: 80000, credits: 50, institutional: true },
}
```

- [ ] **Step 2: Record currency on Paystack orders** — in `handlePaymentInitialize`, the orders INSERT (the 9-column version from Phase A) becomes 10 columns; add `currency` with value `'GHS'`:

```javascript
  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, partner_id, commission_rate, commission_amount, referral_discount_pesewas, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'GHS')`
  ).bind(orderId, userId, plan, chargeAmount, reference, partnerId, commissionRate, commissionAmount, referralDiscount).run()
```

- [ ] **Step 3: `npx vitest run` — PASS (the existing `payments.test.js` and Task 1 tests pin the amounts). Commit**

```bash
git add workers/auth-api.js
git commit -m "refactor(pricing): derive Paystack PLANS from the price book, record order currency"
```

---

### Task 7: Stripe client module (worker, pure parts TDD)

**Files:**
- Create: `workers/stripeClient.js`
- Test: `workers/__tests__/stripeClient.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// workers/__tests__/stripeClient.test.js
import { describe, it, expect } from 'vitest'
import { encodeForm, verifyStripeSignature, checkoutSessionParams } from '../stripeClient.js'

describe('encodeForm', () => {
  it('flattens nested objects into Stripe bracket notation', () => {
    expect(encodeForm({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: 900 } }],
      metadata: { userId: 'u1' },
    })).toBe(
      'mode=payment' +
      '&line_items[0][quantity]=1' +
      '&line_items[0][price_data][currency]=gbp' +
      '&line_items[0][price_data][unit_amount]=900' +
      '&metadata[userId]=u1'
    )
  })
  it('url-encodes values', () => {
    expect(encodeForm({ success_url: 'https://x.org/a?b=1' }))
      .toBe('success_url=' + encodeURIComponent('https://x.org/a?b=1'))
  })
})

describe('verifyStripeSignature', () => {
  // Signed payload format: `${t}.${body}`, HMAC-SHA256 hex with the webhook secret.
  async function sign(body, t, secret) {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`))
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  it('accepts a valid recent signature', async () => {
    const body = '{"id":"evt_1"}'
    const t = Math.floor(Date.now() / 1000)
    const v1 = await sign(body, t, 'whsec_test')
    const ok = await verifyStripeSignature(body, `t=${t},v1=${v1}`, 'whsec_test', Date.now())
    expect(ok).toBe(true)
  })
  it('rejects a bad signature', async () => {
    const t = Math.floor(Date.now() / 1000)
    const ok = await verifyStripeSignature('{"id":"evt_1"}', `t=${t},v1=deadbeef`, 'whsec_test', Date.now())
    expect(ok).toBe(false)
  })
  it('rejects a stale timestamp (replay)', async () => {
    const body = '{"id":"evt_1"}'
    const t = Math.floor(Date.now() / 1000) - 600 // 10 min old, tolerance is 5
    const v1 = await sign(body, t, 'whsec_test')
    const ok = await verifyStripeSignature(body, `t=${t},v1=${v1}`, 'whsec_test', Date.now())
    expect(ok).toBe(false)
  })
  it('rejects a missing/malformed header', async () => {
    expect(await verifyStripeSignature('{}', null, 'whsec_test', Date.now())).toBe(false)
    expect(await verifyStripeSignature('{}', 'garbage', 'whsec_test', Date.now())).toBe(false)
  })
})

describe('checkoutSessionParams', () => {
  const base = {
    productKey: 'single', currency: 'GBP', amount: 900, label: 'Single Design',
    email: 'a@b.com', successUrl: 'https://funeralpress.org/my-designs?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://funeralpress.org/', metadata: { userId: 'u1', productKey: 'single' },
  }
  it('builds a one-time payment session', () => {
    const p = checkoutSessionParams({ ...base, interval: null })
    expect(p.mode).toBe('payment')
    expect(p.line_items[0].price_data.currency).toBe('gbp')
    expect(p.line_items[0].price_data.unit_amount).toBe(900)
    expect(p.line_items[0].price_data.product_data.name).toBe('Single Design')
    expect(p.metadata.userId).toBe('u1')
    expect(p.customer_email).toBe('a@b.com')
  })
  it('builds a subscription session with recurring interval and mirrored metadata', () => {
    const p = checkoutSessionParams({ ...base, productKey: 'pro_monthly', interval: 'month' })
    expect(p.mode).toBe('subscription')
    expect(p.line_items[0].price_data.recurring.interval).toBe('month')
    expect(p.subscription_data.metadata.userId).toBe('u1')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement**

```javascript
// workers/stripeClient.js
// Minimal Stripe REST client for Workers — no SDK. Form-encoded requests,
// inline price_data (no dashboard product setup), webhook signature
// verification per https://stripe.com/docs/webhooks/signatures.

const STRIPE_API = 'https://api.stripe.com/v1'
const SIGNATURE_TOLERANCE_SECONDS = 300

export function encodeForm(obj, prefix = '') {
  const parts = []
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => parts.push(encodeForm(item, `${name}[${i}]`)))
    } else if (typeof value === 'object') {
      parts.push(encodeForm(value, name))
    } else {
      parts.push(`${name}=${encodeURIComponent(value)}`)
    }
  }
  return parts.filter(Boolean).join('&')
}

export async function stripeRequest(env, path, params, method = 'POST') {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : encodeForm(params || {}),
  })
  const data = await res.json()
  if (!res.ok) {
    const message = data?.error?.message || `Stripe ${path} failed (${res.status})`
    throw new Error(message)
  }
  return data
}

export async function verifyStripeSignature(body, header, secret, nowMs) {
  if (!header || typeof header !== 'string') return false
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=')).filter((kv) => kv.length === 2)
  )
  const t = parseInt(parts.t, 10)
  const v1 = parts.v1
  if (!t || !v1) return false
  if (Math.abs(nowMs / 1000 - t) > SIGNATURE_TOLERANCE_SECONDS) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return expected === v1
}

export function checkoutSessionParams({ productKey, currency, amount, label, interval, email, successUrl, cancelUrl, metadata }) {
  const priceData = {
    currency: currency.toLowerCase(),
    unit_amount: amount,
    product_data: { name: label },
  }
  if (interval) priceData.recurring = { interval }

  const params = {
    mode: interval ? 'subscription' : 'payment',
    line_items: [{ quantity: 1, price_data: priceData }],
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  }
  // Stripe copies session metadata to the PaymentIntent but NOT to the
  // Subscription — mirror it so renewal webhooks can identify the plan.
  if (interval) params.subscription_data = { metadata }
  return params
}
```

- [ ] **Step 4: Run — expect PASS (9 tests)**
- [ ] **Step 5: Commit**

```bash
git add workers/stripeClient.js workers/__tests__/stripeClient.test.js
git commit -m "feat(stripe): minimal REST client with form encoding and webhook signature verification"
```

---

### Task 8: `POST /stripe/checkout` (worker)

**Files:**
- Modify: `workers/auth-api.js` (imports; new handler; authenticated route)
- Modify: `workers/auth-api-wrangler.toml` (document new secrets)

- [ ] **Step 1: Imports** — extend the price-book import and add the Stripe client:

```javascript
import { PRODUCTS, priceFor, currencyForCountry, providerFor, isSubscription } from './priceBook.js'
import { stripeRequest, verifyStripeSignature, checkoutSessionParams } from './stripeClient.js'
```

- [ ] **Step 2: Handler** — insert near `handlePaymentInitialize`:

```javascript
async function handleStripeCheckout(request, env, userId) {
  if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured', 503, request)
  const { productKey, currency, memorialId } = await request.json()

  const product = PRODUCTS[productKey]
  if (!product) return error('Unknown product', 400, request)
  if (providerFor(currency) !== 'stripe') return error('Use Paystack for this currency', 400, request)
  if (product.memorial && !memorialId) return error('Missing memorialId', 400, request)

  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  if (isSubscription(productKey) && !product.memorial) {
    const existing = await getUserSubscription(env, userId)
    if (existing && existing.status === 'active') return error('Already have an active subscription', 400, request)
  }

  const amount = priceFor(productKey, currency)
  const metadata = {
    userId,
    productKey,
    currency,
    ...(product.memorial ? { memorialId, tier: product.tier } : {}),
  }

  const successUrl = product.memorial
    ? `${env.CORS_ORIGIN}/memorial/${encodeURIComponent(memorialId)}?stripe_session={CHECKOUT_SESSION_ID}`
    : `${env.CORS_ORIGIN}/my-designs?stripe_session={CHECKOUT_SESSION_ID}`

  const session = await stripeRequest(env, '/checkout/sessions', checkoutSessionParams({
    productKey,
    currency,
    amount,
    label: product.label,
    interval: product.interval || null,
    email: user.email,
    successUrl,
    cancelUrl: `${env.CORS_ORIGIN}/`,
    metadata,
  }))

  // One-time credit purchases get a pending orders row so markOrderPaid can
  // grant credits idempotently from either the webhook or the verify endpoint.
  if (product.kind === 'one_time' && !product.memorial) {
    await env.DB.prepare(
      `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, currency, stripe_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(generateId(), userId, productKey, amount, `stripe-${session.id}`, currency, session.id).run()
  }

  return json({ url: session.url }, 200, request)
}
```

(`paystack_reference` gets `stripe-${session.id}` to satisfy its NOT NULL/UNIQUE constraint — verify the constraint by reading the orders schema; if the column is nullable, still write it for queryability.)

- [ ] **Step 3: Route** — in the authenticated block next to `/payments/initialize`:

```javascript
      if (method === 'POST' && path === '/stripe/checkout') return await handleStripeCheckout(request, env, userId)
```

- [ ] **Step 4: Document secrets** — in `workers/auth-api-wrangler.toml`, extend the "Required secrets" comment block:

```toml
# STRIPE_SECRET_KEY         — Stripe secret key (sk_live_/sk_test_) for GBP/USD checkout
# STRIPE_WEBHOOK_SECRET     — Stripe webhook signing secret (whsec_) for /stripe/webhook
```

- [ ] **Step 5: Owner prerequisite note (no code)** — before production deploy the owner must run `wrangler secret put STRIPE_SECRET_KEY` and `wrangler secret put STRIPE_WEBHOOK_SECRET` (per environment), and register the webhook endpoint `https://auth-api.funeralpress.org/stripe/webhook` in the Stripe dashboard for events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`. The 503 guard in Step 2 keeps the endpoint safe until then.
- [ ] **Step 6: `npx vitest run` — PASS. Commit**

```bash
git add workers/auth-api.js workers/auth-api-wrangler.toml
git commit -m "feat(stripe): checkout session endpoint for GBP/USD one-time and subscription products"
```

---

### Task 9: Stripe fulfillment core + webhook (worker)

**Files:**
- Modify: `workers/auth-api.js` (fulfillment functions + public webhook route)

- [ ] **Step 1: Shared fulfillment functions** — insert near `markOrderPaid`. Both the webhook (Step 2) and the verify endpoint (Task 10) call these; all writes are idempotent so double-delivery is safe:

```javascript
// ─── Stripe fulfillment (shared by webhook + verify; all paths idempotent) ──

async function fulfillStripeOneTime(env, session) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').bind(session.id).first()
  if (!order) return
  await markOrderPaid(env, order) // idempotent via status === 'success' early return
}

async function fulfillStripeSubscription(env, session) {
  const meta = session.metadata || {}
  const subscriptionId = session.subscription
  if (!subscriptionId || !meta.userId || !meta.productKey) return

  const product = PRODUCTS[meta.productKey]
  if (!product) return
  const now = new Date().toISOString()
  const days = product.interval === 'year' ? 365 : 30
  const periodEnd = new Date(Date.now() + days * 86400000).toISOString()

  if (product.memorial) {
    await env.DB.prepare(
      `INSERT INTO subscriptions
         (id, user_id, plan, status, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, monthly_credits_remaining, memorial_id, memorial_tier, currency)
       VALUES (?, ?, 'memorial_annual', 'active', ?, ?, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         status = 'active', current_period_end = excluded.current_period_end, updated_at = datetime('now')`
    ).bind(generateId(), meta.userId, subscriptionId, session.customer || null, now, periodEnd, meta.memorialId, meta.tier, meta.currency).run()

    await env.DB.prepare(
      `INSERT INTO memorial_premium
         (id, memorial_id, tier, plan_type, paystack_reference, status, amount_pesewas, currency, buyer_user_id, expires_at, created_at)
       VALUES (?, ?, ?, 'annual', ?, 'succeeded', ?, ?, ?, ?, ?)
       ON CONFLICT(memorial_id, plan_type) DO UPDATE SET
         tier = excluded.tier, status = 'succeeded', amount_pesewas = excluded.amount_pesewas,
         currency = excluded.currency, expires_at = excluded.expires_at, updated_at = datetime('now')`
    ).bind(generateId(), meta.memorialId, meta.tier, `stripe-${session.id}`, session.amount_total, meta.currency, meta.userId, new Date(periodEnd).getTime(), now).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions
         (id, user_id, plan, status, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, monthly_credits_remaining, currency)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, 15, ?)
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         status = 'active', current_period_end = excluded.current_period_end, updated_at = datetime('now')`
    ).bind(generateId(), meta.userId, meta.productKey, subscriptionId, session.customer || null, now, periodEnd, meta.currency).run()
  }
}

async function fulfillStripeMemorialLifetime(env, session) {
  const meta = session.metadata || {}
  if (!meta.memorialId || !meta.tier) return
  await env.DB.prepare(
    `INSERT INTO memorial_premium
       (id, memorial_id, tier, plan_type, paystack_reference, status, amount_pesewas, currency, buyer_user_id, created_at)
     VALUES (?, ?, ?, 'lifetime', ?, 'succeeded', ?, ?, ?, ?)
     ON CONFLICT(memorial_id, plan_type) DO UPDATE SET
       tier = excluded.tier, status = 'succeeded', amount_pesewas = excluded.amount_pesewas,
       currency = excluded.currency, updated_at = datetime('now')`
  ).bind(generateId(), meta.memorialId, meta.tier, `stripe-${session.id}`, session.amount_total, meta.currency, meta.userId || null, new Date().toISOString()).run()
}

async function fulfillStripeSession(env, session) {
  if (session.payment_status && session.payment_status !== 'paid') return
  const meta = session.metadata || {}
  const product = PRODUCTS[meta.productKey]
  if (!product) return
  if (product.kind === 'subscription') return await fulfillStripeSubscription(env, session)
  if (product.memorial) return await fulfillStripeMemorialLifetime(env, session)
  return await fulfillStripeOneTime(env, session)
}
```

- [ ] **Step 2: Webhook handler + PUBLIC route** — add the handler and register the route in the public section (webhooks carry no JWT):

```javascript
async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return error('Stripe is not configured', 503, request)
  const body = await request.text()
  const ok = await verifyStripeSignature(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET, Date.now())
  if (!ok) return error('Invalid signature', 401, request)

  const event = JSON.parse(body)
  const obj = event.data?.object || {}

  if (event.type === 'checkout.session.completed') {
    await fulfillStripeSession(env, obj)
    notifyAdmin(env, 'payment', `Stripe checkout completed: ${obj.metadata?.productKey || 'unknown'} ${obj.currency?.toUpperCase() || ''}`, { sessionId: obj.id || '' })
  }

  if (event.type === 'invoice.paid' && obj.billing_reason === 'subscription_cycle') {
    // Renewal: extend the period and reset monthly credits (mirrors the
    // Paystack charge.success renewal logic).
    const sub = await env.DB.prepare('SELECT id, plan, memorial_id FROM subscriptions WHERE stripe_subscription_id = ?').bind(obj.subscription).first()
    if (sub) {
      const days = sub.plan === 'pro_monthly' ? 30 : 365
      const periodEnd = new Date(Date.now() + days * 86400000).toISOString()
      await env.DB.prepare(
        "UPDATE subscriptions SET monthly_credits_remaining = CASE WHEN plan = 'memorial_annual' THEN monthly_credits_remaining ELSE 15 END, current_period_start = datetime('now'), current_period_end = ?, status = 'active', updated_at = datetime('now') WHERE id = ?"
      ).bind(periodEnd, sub.id).run()
      if (sub.memorial_id) {
        await env.DB.prepare(
          "UPDATE memorial_premium SET expires_at = ?, updated_at = datetime('now') WHERE memorial_id = ? AND plan_type = 'annual'"
        ).bind(new Date(periodEnd).getTime(), sub.memorial_id).run()
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    await env.DB.prepare(
      "UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE stripe_subscription_id = ?"
    ).bind(obj.id).run()
  }

  return json({ received: true }, 200, request)
}
```

Route (public section, next to the Paystack webhook routes):

```javascript
    if (method === 'POST' && path === '/stripe/webhook') return await handleStripeWebhook(request, env)
```

- [ ] **Step 3: Stripe-aware cancellation** — in the existing subscription-cancel handler (find it via `grep -n "subscriptions/cancel\|handleSubscriptionCancel" workers/auth-api.js`), add a branch BEFORE the Paystack disable call:

```javascript
  if (sub.stripe_subscription_id) {
    await stripeRequest(env, `/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: true })
    await env.DB.prepare(
      "UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(sub.id).run()
    return json({ ok: true, cancelsAt: sub.current_period_end }, 200, request)
  }
```

(Adapt the response shape to match what the existing Paystack branch returns — read it first.)

- [ ] **Step 4: `npx vitest run` — PASS. Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(stripe): webhook fulfillment, renewals, cancellation for GBP/USD purchases"
```

---

### Task 10: `GET /stripe/verify` (worker) — verify-on-return

**Files:**
- Modify: `workers/auth-api.js`

- [ ] **Step 1: Handler** — mirrors `handlePaymentVerify`: the buyer returns from Stripe before the webhook may have landed; retrieve the session and fulfill idempotently:

```javascript
async function handleStripeVerify(request, env, userId) {
  if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured', 503, request)
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) return error('Missing session_id', 400, request)

  const session = await stripeRequest(env, `/checkout/sessions/${encodeURIComponent(sessionId)}`, null, 'GET')
  if (session.metadata?.userId !== userId) return error('Not your session', 403, request)
  if (session.payment_status !== 'paid') return json({ verified: false }, 200, request)

  await fulfillStripeSession(env, session)
  const purchaseData = await getUserPurchaseData(env, userId)
  return json({ verified: true, ...purchaseData }, 200, request)
}
```

- [ ] **Step 2: Route** (authenticated block):

```javascript
      if (method === 'GET' && path === '/stripe/verify') return await handleStripeVerify(request, env, userId)
```

- [ ] **Step 3: `npx vitest run` — PASS. Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(stripe): verify-on-return endpoint with idempotent fulfillment"
```

---

### Task 11: Frontend checkout routing (CheckoutDialog + UpgradeDialog + return handling)

**Files:**
- Modify: `src/components/editor/CheckoutDialog.jsx`, `src/components/memorial/UpgradeDialog.jsx`, `src/pages/MyDesignsPage.jsx`

- [ ] **Step 1: CheckoutDialog — display prices from the price book and route non-GHS to Stripe.**

Add imports:

```javascript
import { useCurrencyStore } from '../../stores/currencyStore'
import { PRODUCTS, priceFor, providerFor, formatMoney } from '../../config/priceBook'
import CurrencySwitcher from '../pricing/CurrencySwitcher'
```

Replace the hardcoded plan arrays (`price: 35` etc. at lines ~17–32) with price-book-driven rendering — wherever a plan card displays `GHS {price}`, render `formatMoney(priceFor(planKey, currency), currency)` using `const currency = useCurrencyStore((s) => s.currency)`. Keys map 1:1: `single`, `bundle`, `suite`, `pro_monthly`, `pro_annual`. Add `<CurrencySwitcher className="mb-3" />` at the top of the plan-selection stage. (Bulk institutional cards, if shown, stay GHS-labelled.)

In `handleSelectPlan`, branch on provider:

```javascript
  const handleSelectPlan = useCallback(async (planKey) => {
    setStage('loading')
    try {
      const currency = useCurrencyStore.getState().currency
      if (providerFor(currency) === 'stripe') {
        // Persist the pending unlock across the full-page redirect.
        if (pendingDownload) {
          try { localStorage.setItem('fp-pending-download', JSON.stringify(pendingDownload)) } catch { /* ignore */ }
        }
        const data = await apiFetch('/stripe/checkout', {
          method: 'POST',
          body: JSON.stringify({ productKey: planKey, currency }),
        })
        window.location.href = data.url
        return
      }
      // ... existing Paystack inline flow unchanged ...
```

Apply the same branch in `handleSelectSubscription` (productKey = `pro_monthly`/`pro_annual`; the Stripe path is identical — `/stripe/checkout` then redirect).

- [ ] **Step 2: UpgradeDialog — memorial tiers.** Add the same imports. Where `formatGHS(pesewas)` renders tier prices, switch to `formatMoney(priceFor(productKey, currency), currency)` with productKey = `memorial_${tier}_lifetime` or `memorial_${tier}_annual`. In the purchase handlers, branch: if `providerFor(currency) === 'stripe'`, call `apiFetch('/stripe/checkout', { method: 'POST', body: JSON.stringify({ productKey, currency, memorialId }) })` and `window.location.href = data.url`; else keep the existing Paystack inline (lifetime) / hosted redirect (annual) flows. Add `<CurrencySwitcher />` near the tier cards.

- [ ] **Step 3: Return handling on `/my-designs`.** In `src/pages/MyDesignsPage.jsx`, add a one-shot effect (imports: `useSearchParams` from react-router-dom, `apiFetch` from `../utils/apiClient`, `usePurchaseStore` already available via existing imports — check and add if missing):

```jsx
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const sessionId = searchParams.get('stripe_session')
    if (!sessionId) return
    apiFetch(`/stripe/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (data) => {
        if (data.verified) {
          usePurchaseStore.getState().hydrateFromUser(data)
          const pending = localStorage.getItem('fp-pending-download')
          if (pending) {
            try {
              const { designId, productType } = JSON.parse(pending)
              await usePurchaseStore.getState().unlockDesign(designId, productType)
            } catch { /* credit stays available; user can re-export */ }
            localStorage.removeItem('fp-pending-download')
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        searchParams.delete('stripe_session')
        setSearchParams(searchParams, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

(Verify `hydrateFromUser`'s expected shape by reading `src/stores/purchaseStore.js` — if it expects `{credits, isUnlimited, unlockedDesigns}` directly, pass `data` as the verify endpoint returns exactly that spread; adapt the call if the shape differs.)

Memorial returns need no handler: the memorial page already refreshes entitlement on load, and `handleStripeVerify` is for logged-in buyers — the `?stripe_session` param on memorial URLs is cosmetic confirmation; the webhook fulfills.

- [ ] **Step 4: `npx vitest run` + `npm run build` — both green. Commit**

```bash
git add src/components/editor/CheckoutDialog.jsx src/components/memorial/UpgradeDialog.jsx src/pages/MyDesignsPage.jsx
git commit -m "feat(pricing): currency-aware checkout routing with Stripe redirect and return verify"
```

---

### Task 12: Price display sweep (landing/product pages)

**Files:**
- Modify: `src/pages/landing/BrochureDesignerPage.jsx` (pricing array ~lines 96–100) and the equivalent pricing arrays in `src/pages/landing/PosterMakerPage.jsx`, `src/pages/landing/MemorialCreatorPage.jsx`, `src/pages/landing/ProgrammeBookletPage.jsx`, plus the pricing section in `src/pages/LandingPage.jsx` (find with `grep -rn "GHS " src/pages --include=*.jsx`)

- [ ] **Step 1:** In each file, replace hardcoded `price: 'GHS 35'`-style strings with price-book lookups. Pattern (BrochureDesignerPage example):

```jsx
import { useCurrencyStore } from '../../stores/currencyStore'
import { priceFor, formatMoney } from '../../config/priceBook'
import CurrencySwitcher from '../../components/pricing/CurrencySwitcher'

// inside the component:
const currency = useCurrencyStore((s) => s.currency)
const pricing = [
  { name: 'Single', price: formatMoney(priceFor('single', currency), currency), desc: 'One brochure design download', cta: 'Get Started', primary: false },
  { name: 'Bundle', price: formatMoney(priceFor('bundle', currency), currency), desc: 'Brochure + poster + invitation', cta: 'Best Value', primary: true },
  { name: 'Suite', price: formatMoney(priceFor('suite', currency), currency), desc: 'All designs, unlimited downloads', cta: 'Go Unlimited', primary: false },
]
```

Add `<CurrencySwitcher />` adjacent to each pricing card grid (right-aligned above the cards). Prices that are NOT in the price book (print, candles, donations, bulk) stay as-is — do not touch them.

- [ ] **Step 2:** Memorial tier prices on MemorialCreatorPage map to `memorial_premium_annual` / `memorial_heritage_annual` (and lifetime keys if shown).
- [ ] **Step 3:** `npx vitest run` + `npm run build` — green. Manually grep for leftovers: `grep -rn "'GHS 35'\|'GHS 75'\|'GHS 120'\|GHS 85\|GHS 850\|GHS 280" src/pages src/components` — every remaining hit must be a deliberately-GHS surface (print/candles/bulk/partner docs); list them in the commit body.
- [ ] **Step 4: Commit**

```bash
git add src/pages src/components
git commit -m "feat(pricing): price displays resolve from the price book in the visitor's currency"
```

---

### Task 13: Diaspora pages — shared component + data file (TDD)

**Files:**
- Create: `src/pages/landing/DiasporaPage.jsx`, `src/data/diasporaPages.js`
- Modify: `src/App.jsx` (5 routes), `vite-plugins/sitemap.js` (5 entries)
- Test: `src/pages/__tests__/DiasporaPage.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/__tests__/DiasporaPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import DiasporaPage from '../landing/DiasporaPage.jsx'
import { DIASPORA_PAGES } from '../../data/diasporaPages.js'

describe('DiasporaPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ country: 'GB', currency: 'GBP' }) })))
  })

  function renderSlug(slug) {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/diaspora/${slug}`]}>
          <Routes>
            <Route path="/diaspora/:slug" element={<DiasporaPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    )
  }

  it('declares all five spec pages with required fields', () => {
    expect(Object.keys(DIASPORA_PAGES)).toEqual([
      'plan-a-funeral-in-ghana-from-abroad',
      'watch-a-funeral-from-abroad',
      'funeral-order-of-service-template',
      'send-condolences-to-ghana',
      'nigeria',
    ])
    for (const page of Object.values(DIASPORA_PAGES)) {
      expect(page.title.length).toBeGreaterThan(10)
      expect(page.description.length).toBeGreaterThan(50)
      expect(page.h1.length).toBeGreaterThan(10)
      expect(page.sections.length).toBeGreaterThanOrEqual(4)
      expect(page.faqs.length).toBeGreaterThanOrEqual(5)
    }
  })

  it('renders the hub page with its H1 and FAQs', () => {
    renderSlug('plan-a-funeral-in-ghana-from-abroad')
    expect(screen.getByRole('heading', { level: 1, name: /plan a funeral in ghana from abroad/i })).toBeInTheDocument()
    expect(screen.getAllByText(/shared budget planner/i).length).toBeGreaterThan(0)
  })

  it('renders a 404-style fallback for unknown slugs', () => {
    renderSlug('not-a-page')
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: The shared component**

```jsx
// src/pages/landing/DiasporaPage.jsx
// Data-driven diaspora landing pages (spec §3.4). One component, five pages —
// content lives in src/data/diasporaPages.js. Currency display defaults to the
// visitor's geo currency (GBP/USD for the diaspora audience).
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageMeta from '../../components/seo/PageMeta'
import FAQSection from '../../components/seo/FAQSection'
import CurrencySwitcher from '../../components/pricing/CurrencySwitcher'
import { useCurrencyStore } from '../../stores/currencyStore'
import { priceFor, formatMoney } from '../../config/priceBook'
import { DIASPORA_PAGES } from '../../data/diasporaPages'

export default function DiasporaPage() {
  const { slug } = useParams()
  const page = DIASPORA_PAGES[slug]
  const currency = useCurrencyStore((s) => s.currency)
  const hydrate = useCurrencyStore((s) => s.hydrate)

  useEffect(() => { hydrate() }, [hydrate])

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-semibold text-card-foreground mb-2">Page not found</h1>
          <Link to="/" className="text-sm text-primary hover:underline">Back to FuneralPress</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={page.title}
        description={page.description}
        path={`/diaspora/${slug}`}
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Diaspora', path: `/diaspora/${slug}` }, { name: page.breadcrumb, path: `/diaspora/${slug}` }]}
        faqs={page.faqs}
      />

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {page.h1}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-2xl mx-auto mb-8">{page.intro}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to={page.cta.to} className="px-6 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors">
            {page.cta.label}
          </Link>
          <Link to="/honour" className="px-6 py-3 border border-border text-sm text-card-foreground rounded-lg hover:border-primary/40 transition-colors">
            Explore all tools
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-10">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold text-card-foreground mb-3">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{p}</p>
            ))}
            {s.link && (
              <Link to={s.link.to} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                {s.link.label} <ArrowRight size={14} />
              </Link>
            )}
          </section>
        ))}
      </div>

      {/* Pricing strip */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="flex justify-end mb-2"><CurrencySwitcher /></div>
          <p className="text-sm text-muted-foreground mb-1">A complete set of funeral designs from</p>
          <p className="text-3xl font-bold text-card-foreground mb-1">{formatMoney(priceFor('bundle', currency), currency)}</p>
          <p className="text-xs text-muted-foreground">One-time. Unlimited designs from {formatMoney(priceFor('suite', currency), currency)} · Pro from {formatMoney(priceFor('pro_monthly', currency), currency)}/month</p>
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold text-card-foreground mb-5">Frequently asked questions</h2>
        <FAQSection faqs={page.faqs} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: The content data file.** Create `src/data/diasporaPages.js` exporting `DIASPORA_PAGES` keyed by the five slugs. The complete content is specified below — copy it verbatim (voice: warm, practical, dignified; UK spelling; no exclamation marks). Every feature referenced exists today.

```javascript
// src/data/diasporaPages.js
// Diaspora landing page content (spec §3.4). Pure messaging — every feature
// referenced already exists. Voice: Solemn Radiance — warm, practical, dignified.

export const DIASPORA_PAGES = {
  'plan-a-funeral-in-ghana-from-abroad': {
    breadcrumb: 'Plan from abroad',
    title: 'Plan a Funeral in Ghana From Abroad | FuneralPress',
    description: 'Organise a dignified funeral in Ghana from the UK, US, or anywhere abroad: shared budget planner, remote design collaboration, print delivery in Ghana, and live-streamed services.',
    h1: 'Plan a funeral in Ghana from abroad',
    intro: 'When you lose someone at home while you are far away, the distance hurts twice. Calls at strange hours, money sent in pieces, decisions made without you. FuneralPress was built in Ghana for exactly this moment — one place where your family at home and your family abroad plan together, see the same numbers, and honour your loved one properly.',
    cta: { to: '/budget-planner', label: 'Start a shared budget' },
    sections: [
      {
        heading: 'One budget the whole family can see',
        paragraphs: [
          'Ghanaian funerals are funded by many hands — siblings in London, cousins in Accra, an aunt in New Jersey. The shared budget planner tracks every line: casket, venue, catering, cloth, printing, transport. Each family member sees what has been pledged and what remains, in real time, on any phone.',
          'No more conflicting figures over WhatsApp. When the family head updates a cost in Accra, you see it in Manchester the same minute. Contributions are recorded against names, so the accounting at the family meeting takes minutes, not hours.',
        ],
        link: { to: '/budget-planner', label: 'Open the budget planner' },
      },
      {
        heading: 'Design the brochure together, print it in Ghana',
        paragraphs: [
          'The funeral brochure carries the weight of how your person is remembered. With FuneralPress you design it yourself in minutes — choose a theme, add their photo, write the biography with help from the AI tribute writer, pick hymns from a library of more than ten thousand.',
          'Designs save to the cloud, so your sister in Kumasi can review and edit the same brochure you started in Toronto. When it is ready, order printing inside the app and have finished brochures delivered to the family house in Ghana — you never need to courier anything across an ocean.',
        ],
        link: { to: '/funeral-brochure-designer', label: 'See the brochure designer' },
      },
      {
        heading: 'A memorial page for everyone who cannot travel',
        paragraphs: [
          'Not everyone can board a flight. A memorial page gives your loved one a permanent online tribute — their story, their photographs, a guest book where friends from every country leave condolences, and a live-stream link for the service itself.',
          'Share one link on WhatsApp and the whole diaspora attends, contributes, and grieves together. QR codes printed on the brochure connect the physical ceremony to the online tribute, so even guests at the graveside can sign the guest book from their phones.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
      {
        heading: 'Watch the service live from anywhere',
        paragraphs: [
          'When travel is impossible — visa timing, work, young children — you should still be in the room. FuneralPress live service pages let the family stream the funeral and one-week observance to relatives abroad, with the order of service alongside the video so you can follow every hymn and tribute.',
        ],
        link: { to: '/diaspora/watch-a-funeral-from-abroad', label: 'How live streaming works' },
      },
      {
        heading: 'Pay in pounds or dollars, deliver in Ghana',
        paragraphs: [
          'You can pay for designs, memorial pages, and printing in GBP or USD with your usual card — no forex transfers, no asking family at home to front the cost. Family in Ghana can pay their own way in cedis with mobile money. Same tools, same account, each person in their own currency.',
        ],
        link: null,
      },
    ],
    faqs: [
      { question: 'Can I plan a Ghanaian funeral entirely from the UK or US?', answer: 'Yes. The budget planner, brochure designer, memorial pages, and print ordering all work from anywhere. You design and coordinate online; printing is produced and delivered inside Ghana to your family. Many families split the work — relatives abroad handle design and contributions, relatives at home handle venue and logistics — inside one shared account.' },
      { question: 'How do family members in different countries work on the same funeral?', answer: 'Designs and budgets are cloud-synced. Anyone you share access with sees the latest version instantly — edits made in Accra appear in London the moment they save. The budget planner records each contribution against a name so the family accounting stays transparent.' },
      { question: 'Can I pay in pounds or dollars?', answer: 'Yes. Card payments in GBP and USD are processed securely through Stripe. Family members in Ghana pay in cedis via mobile money or card through Paystack. Prices are shown in your local currency automatically, and you can switch currency at any time.' },
      { question: 'How does printed material reach the family in Ghana?', answer: 'Order printing directly inside FuneralPress. Brochures, posters, and invitation cards are printed in Ghana and delivered to any of the sixteen regions — you choose the delivery address, typically the family house or the funeral venue.' },
      { question: 'What does it cost?', answer: 'Creating designs is free — you pay only to download finished, watermark-free files. A single design, a three-design bundle, or unlimited access are all one-time purchases, with Pro subscriptions for families who need more. Prices display in your currency on every page.' },
      { question: 'Is FuneralPress only for Ghanaian funerals?', answer: 'FuneralPress is built around Ghanaian funeral traditions — Adinkra symbolism, one-week observances, aseda cloth, and a hymn library spanning English, Twi, and Ga — but families across West Africa and the diaspora use it wherever they are.' },
    ],
  },

  'watch-a-funeral-from-abroad': {
    breadcrumb: 'Watch from abroad',
    title: 'Watch a Funeral in Ghana Live From Abroad | FuneralPress',
    description: 'Attend a funeral in Ghana from anywhere: live-streamed services with the order of service on screen, memorial pages, and a digital guest book for condolences from overseas.',
    h1: 'Be present, even from far away',
    intro: 'Sometimes the flight is impossible. A visa that will not come in time, children who cannot miss school, work that will not release you. Missing the funeral of someone you love is one of the quiet griefs of diaspora life. FuneralPress makes sure distance does not mean absence.',
    cta: { to: '/memorial-page-creator', label: 'Set up a memorial with live stream' },
    sections: [
      {
        heading: 'A live stream built into the memorial',
        paragraphs: [
          'Your family adds a live-stream link to the memorial page, and everyone abroad watches the service in real time — burial service, thanksgiving service, or the one-week observance. The page shows the order of service alongside the stream, so you can follow each hymn, tribute, and scripture reading as it happens.',
          'There is nothing to install. The memorial link opens in any phone or laptop browser, anywhere in the world.',
        ],
        link: null,
      },
      {
        heading: 'Sign the guest book from any country',
        paragraphs: [
          'The digital guest book collects condolence messages from everyone who could not travel — short tributes, memories, words of comfort for the family. Messages arrive instantly and remain part of the memorial permanently, so the family in Ghana feels the breadth of love their person commanded across the world.',
        ],
        link: { to: '/guest-book-creator', label: 'About digital guest books' },
      },
      {
        heading: 'Light a candle, lay flowers, leave a tribute',
        paragraphs: [
          'Beyond words, the memorial page lets you light a virtual candle or lay flowers in your loved one’s honour — small acts of presence that appear on the tribute wall with your name. For many in the diaspora these gestures matter deeply: a way of saying I was there, in the only way I could be.',
        ],
        link: null,
      },
      {
        heading: 'Contribute to the funeral from abroad',
        paragraphs: [
          'The shared budget planner records contributions from family members in every country, and memorial pages can accept donations directly. Your support reaches the family transparently — every pledge logged, every contribution acknowledged.',
        ],
        link: { to: '/budget-planner', label: 'See the shared budget planner' },
      },
    ],
    faqs: [
      { question: 'How do I watch a funeral in Ghana from the UK or US?', answer: 'Ask the family to add their live-stream link to the FuneralPress memorial page, then open the memorial link they share on WhatsApp. The stream plays in your browser with the order of service beside it — no app or account required to watch.' },
      { question: 'What if I miss the live service because of the time difference?', answer: 'The memorial page remains, with the photographs, biography, tributes, and guest book. Many families also keep the recording linked on the page, and premium memorials retain livestream links for years.' },
      { question: 'Can I send condolences if I cannot attend?', answer: 'Yes. Sign the digital guest book from anywhere, light a virtual candle, or lay virtual flowers. Your message appears on the memorial instantly and permanently, with your name.' },
      { question: 'Can I contribute money to the funeral from abroad?', answer: 'Yes. Memorial pages can accept donations, and the shared budget planner records pledges and contributions from relatives in every country, so the family accounting stays clear and transparent.' },
      { question: 'Does the family need technical skills to set this up?', answer: 'No. Creating a memorial page takes minutes on a phone — add photos, the biography, and the service details, then paste in any live-stream link. FuneralPress generates the shareable link and QR codes automatically.' },
    ],
  },

  'funeral-order-of-service-template': {
    breadcrumb: 'Order of service',
    title: 'Funeral Order of Service Template — Ghanaian Services | FuneralPress',
    description: 'Create a funeral order of service for a Ghanaian funeral: print-ready templates with hymns, tributes, biography, and photos. Designed in minutes, delivered in the UK terminology you search for.',
    h1: 'A funeral order of service, the Ghanaian way',
    intro: 'In the UK it is called an order of service; in Ghana we call it the funeral brochure or programme. Whatever name you use, it is the booklet every guest holds — the photographs, the biography, the hymns, the tributes, the order of events. FuneralPress creates it in minutes, properly and beautifully.',
    cta: { to: '/funeral-brochure-designer', label: 'Start your order of service' },
    sections: [
      {
        heading: 'Templates designed for Ghanaian services',
        paragraphs: [
          'Generic templates do not understand our services. A Ghanaian funeral programme carries the full order of both the burial service and the thanksgiving, the family tree, the appellations, tributes from children and grandchildren, and often Adinkra symbolism in the design itself.',
          'FuneralPress themes — Black and Gold, Kente Gold, Burgundy, Ivory and more — are designed for exactly this. Choose one, add your photographs and text, and the layout stays elegant whether your programme runs four pages or forty.',
        ],
        link: { to: '/themes', label: 'Browse the themes' },
      },
      {
        heading: 'Hymns, tributes, and the full order of events',
        paragraphs: [
          'Search a library of more than ten thousand hymns — English, Twi, and Ga — and add full lyrics to your programme with one tap. The AI tribute writer helps you shape the biography and tributes when the words will not come, guided by what you tell it about their life, faith, and family.',
        ],
        link: { to: '/hymns', label: 'Search the hymn library' },
      },
      {
        heading: 'Print in Ghana or download and print locally',
        paragraphs: [
          'Download a print-ready PDF and take it to any printer near you in the UK or US — or order printing inside the app and have finished booklets delivered to the family in Ghana. Both routes produce the same professional result; choose whichever suits the family plan.',
        ],
        link: null,
      },
      {
        heading: 'Designed together across continents',
        paragraphs: [
          'Order-of-service decisions are family decisions. Cloud-synced designs mean the daughter in London drafts the biography, the son in Accra corrects the family names, and the family head approves the final version — all in the same document, without emailing files back and forth.',
        ],
        link: { to: '/diaspora/plan-a-funeral-in-ghana-from-abroad', label: 'Planning from abroad — the full guide' },
      },
    ],
    faqs: [
      { question: 'What goes in a Ghanaian funeral order of service?', answer: 'Typically: a cover with the photograph and dates, the order of the burial and thanksgiving services, the biography, tributes from spouse, children, grandchildren and colleagues, hymns with full lyrics, the family tree or appellations, and acknowledgements. FuneralPress templates carry sections for all of these.' },
      { question: 'How quickly can I create one?', answer: 'A simple programme takes under thirty minutes: choose a theme, upload photographs, paste or write the biography and tributes, add hymns from the library, and export. The AI tribute writer speeds up the writing when grief makes it hard.' },
      { question: 'Can I print it in the UK instead of Ghana?', answer: 'Yes. Download the print-ready PDF and use any local printer. Files are produced at print resolution with proper margins. Alternatively, order printing in the app for delivery to the family in Ghana.' },
      { question: 'How much does an order of service template cost?', answer: 'Designing is free. A single watermark-free download is a small one-time payment shown in your currency — pounds, dollars, or cedis. Bundles and unlimited plans cover posters, invitations, and thank-you cards as well.' },
      { question: 'Can the family in Ghana edit the same programme?', answer: 'Yes. Designs sync to the cloud, so anyone with access edits the same document. Changes made in Ghana appear for relatives abroad immediately.' },
    ],
  },

  'send-condolences-to-ghana': {
    breadcrumb: 'Send condolences',
    title: 'Send Condolences to Ghana From Abroad | FuneralPress',
    description: 'Send condolences to a bereaved family in Ghana: sign the digital guest book, light a virtual candle, contribute to the funeral, or send a wreath card — from anywhere in the world.',
    h1: 'Send your condolences home',
    intro: 'When word reaches you that someone has passed at home, the first instinct is to be there. When you cannot, what matters is that the family feels you — your words, your support, your presence in whatever form it can take. Here is how to honour someone in Ghana from wherever you are.',
    cta: { to: '/honour', label: 'Honour someone you’ve lost' },
    sections: [
      {
        heading: 'Sign the guest book',
        paragraphs: [
          'If the family has a FuneralPress memorial or guest book page, your message of condolence reaches them instantly and stays forever. Write in English or your home language; speak to the family or to the one who has gone. These messages are read aloud at family gatherings and kept for years.',
        ],
        link: { to: '/guest-book-creator', label: 'How guest books work' },
      },
      {
        heading: 'Light a candle or lay flowers on the memorial',
        paragraphs: [
          'Memorial pages carry a tribute wall where you can light a virtual candle, lay flowers, or leave a longer tribute with your name. It is a small ceremony of its own — visible to the family and to every mourner who visits the page.',
        ],
        link: null,
      },
      {
        heading: 'Contribute to the funeral costs',
        paragraphs: [
          'Funerals at home are a collective duty, and distance does not excuse us from it — nsawa is nsawa. Where the family uses the shared budget planner, your contribution is pledged and recorded against your name transparently. Memorial pages can also accept direct donations.',
        ],
        link: { to: '/budget-planner', label: 'About the shared budget planner' },
      },
      {
        heading: 'Send a wreath card with your flowers',
        paragraphs: [
          'If you are arranging flowers or a wreath through family at home, design the accompanying wreath card yourself — your names, your message, properly typeset — and have it printed in Ghana with the rest of the funeral stationery.',
        ],
        link: { to: '/wreath-cards', label: 'Design a wreath card' },
      },
      {
        heading: 'When the family has no memorial page yet',
        paragraphs: [
          'Suggest one. A memorial page takes minutes to create and gives the whole diaspora a single place to mourn, contribute, and attend the live-streamed service. You can even create it yourself and hand it to the family head to approve and share.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
    ],
    faqs: [
      { question: 'How do I send condolences to a family in Ghana?', answer: 'The simplest way is the family’s memorial or guest book link — your message arrives instantly and permanently. If they do not have one, a memorial page takes minutes to set up and gives everyone abroad a place to mourn together.' },
      { question: 'What should I write in a condolence message?', answer: 'Speak plainly and from the heart. Name what the person meant to you, offer a memory if you have one, and address the family with respect — "Due, due, due" carries more comfort than perfect English. Messages in Twi, Ga, Ewe, or any language are welcome.' },
      { question: 'Can I send money for the funeral from abroad?', answer: 'Yes. Where the family uses the shared budget planner your pledge is recorded transparently against your name, and memorial pages can accept direct donations. This keeps the family accounting clear and your contribution acknowledged.' },
      { question: 'Can I attend the funeral remotely?', answer: 'If the family adds a live-stream link to the memorial page, you watch the service in real time from any browser, with the order of service displayed alongside.' },
      { question: 'Is it appropriate to light a virtual candle?', answer: 'Yes. Virtual candles, flowers, and tributes are widely embraced as acts of presence for those who cannot travel. They appear on the memorial’s tribute wall with your name, visible to the family and all mourners.' },
    ],
  },

  nigeria: {
    breadcrumb: 'Nigeria',
    title: 'Plan a Funeral in Nigeria From Abroad | FuneralPress',
    description: 'Organise a burial in Nigeria from the UK, US, or anywhere abroad: design the funeral programme, build a memorial page with live streaming, coordinate family contributions, and pay by card in pounds or dollars.',
    h1: 'Plan a funeral in Nigeria from abroad',
    intro: 'Burials at home are sacred obligations, and organising one from London, Houston, or Toronto is hard — the calls, the transfers, the programme that must be perfect because everyone will hold it. FuneralPress gives Nigerian families abroad one place to design, coordinate, and honour properly.',
    cta: { to: '/funeral-brochure-designer', label: 'Design the funeral programme' },
    sections: [
      {
        heading: 'The funeral programme, designed by you',
        paragraphs: [
          'The programme — order of service, biography, tributes, hymns, photographs — is the document every guest keeps. Design it yourself with templates built for West African services: space for the full order of the wake-keeping, funeral service, and outing service or thanksgiving, tributes from family and associations, and elegant layouts that hold many photographs well.',
          'Download a print-ready PDF to print anywhere — Lagos, London, or Houston — and share the design with family for review before anything goes to press.',
        ],
        link: { to: '/funeral-brochure-designer', label: 'Open the programme designer' },
      },
      {
        heading: 'A memorial page the whole family shares',
        paragraphs: [
          'A permanent online tribute with their story and photographs, a guest book for condolences from every continent, and a live-stream link so relatives who cannot travel attend the service in real time. One link on WhatsApp reaches the entire family network.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
      {
        heading: 'Coordinate contributions transparently',
        paragraphs: [
          'The shared budget planner tracks every cost and every pledge across the family — who is covering the casket, who the canopies, who the aso ebi. Everyone sees the same figures in real time, which keeps peace in the family and dignity in the planning.',
        ],
        link: { to: '/budget-planner', label: 'Open the budget planner' },
      },
      {
        heading: 'Pay by card in pounds or dollars',
        paragraphs: [
          'Pay for designs and memorial features in GBP or USD with your usual card, processed securely by Stripe. No forex transfers, no waiting for someone at home to pay first. Prices display in your currency across the site.',
        ],
        link: null,
      },
    ],
    faqs: [
      { question: 'Does FuneralPress work for Nigerian funerals?', answer: 'Yes. The programme designer, memorial pages, guest books, budget planner, and live-stream support all work for Nigerian services — wake-keeping, funeral service, and outing or thanksgiving service — from anywhere in the world.' },
      { question: 'Can I pay in naira?', answer: 'Naira payments are coming. Today you can pay by card in pounds, dollars, or Ghanaian cedis. Most diaspora families pay in GBP or USD; prices display automatically in your currency.' },
      { question: 'Can I print the programme in Nigeria?', answer: 'Download the print-ready PDF and take it to any printer in Nigeria — files are produced at print resolution with proper margins. In-app print fulfilment currently delivers within Ghana.' },
      { question: 'How do relatives abroad attend the burial?', answer: 'Add a live-stream link to the memorial page and relatives watch the service in real time from any browser, sign the guest book, and leave tributes — no app required.' },
      { question: 'How do we manage family contributions from three countries?', answer: 'The shared budget planner records every pledge and payment against a name, visible to all family members in real time. It replaces the spreadsheet, the group-chat arithmetic, and the arguments.' },
    ],
  },
}
```

- [ ] **Step 5: Routes** — in `src/App.jsx` add the lazy import and ONE route (the component resolves the slug):

```jsx
const DiasporaPage = lazy(() => import('./pages/landing/DiasporaPage'))
// in <Routes>, near the other landing pages:
              <Route path="/diaspora/:slug" element={<DiasporaPage />} />
```

- [ ] **Step 6: Sitemap** — in `vite-plugins/sitemap.js`, add to `STATIC_ROUTES` (match the existing entry format exactly — read the file first):

```javascript
  { path: '/diaspora/plan-a-funeral-in-ghana-from-abroad', priority: 0.9 },
  { path: '/diaspora/watch-a-funeral-from-abroad', priority: 0.8 },
  { path: '/diaspora/funeral-order-of-service-template', priority: 0.9 },
  { path: '/diaspora/send-condolences-to-ghana', priority: 0.8 },
  { path: '/diaspora/nigeria', priority: 0.8 },
```

ALSO: the build prerenders routes (the build log prints "53 routes prerendered") from a route list that is separate from the sitemap. Find it with `grep -rn "prerender" vite.config.js vite-plugins/` and add the same five `/diaspora/...` paths to that list so the pages ship as static HTML for crawlers. If prerendering turns out to derive from `STATIC_ROUTES` in `vite-plugins/sitemap.js`, no extra change is needed — state which it was in your report.

- [ ] **Step 7: Run tests + build — `npx vitest run` PASS, `npm run build` green (sitemap should now list 58 static routes). Commit**

```bash
git add src/pages/landing/DiasporaPage.jsx src/data/diasporaPages.js src/pages/__tests__/DiasporaPage.test.jsx src/App.jsx vite-plugins/sitemap.js
git commit -m "feat(diaspora): five data-driven diaspora landing pages with FAQ schema and currency-aware pricing"
```

---

### Task 14: Final verification + deployment checklist

- [ ] **Step 1:** `npx vitest run` — ALL pass. `npm run build` — green.
- [ ] **Step 2:** Grep sweep for orphaned hardcoded prices: `grep -rn "GHS 35\|GHS 75\|GHS 120\|GHS 85\|GHS 850\|GHS 280\|GHS 300\|GHS 700" src/` — every hit must be a deliberate GHS-only surface (print, candles, bulk, partner docs); list survivors in the report.
- [ ] **Step 3:** Confirm the existing Paystack flows are untouched for a GHS user: `handlePaymentInitialize` still returns `currency: 'GHS'`; subscriptions/create unchanged; memorial Paystack flows unchanged.
- [ ] **Step 4: Deployment notes (owner actions — do NOT run unattended):**

```bash
# 1. Apply migration BEFORE deploying the new auth-api (staging, then prod):
npx wrangler d1 execute funeralpress-db-staging --file=workers/migrations/migration-multi-currency.sql --remote
npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-multi-currency.sql --remote
# 2. Stripe setup (owner): create Stripe account; then per environment:
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# 3. In the Stripe dashboard, add webhook endpoint
#    https://auth-api.funeralpress.org/stripe/webhook
#    for events: checkout.session.completed, invoice.paid, customer.subscription.deleted
# 4. End-to-end test with sk_test_ keys + Stripe test cards (4242...) on staging
#    BEFORE switching to live keys.
```

- [ ] **Step 5:** Report: per-task summary, the ★-derived prices awaiting owner confirmation, and the NGN-dormant status.

---

## Spec coverage map (§ → Task)

| Spec §3 requirement | Task |
|---|---|
| §3.1 geo-detection via `request.cf.country` | 1 (mapping), 3 (endpoint), 4 (store) |
| §3.1 manual switcher, per-session persistence | 4 |
| §3.1 existing subscriptions keep original currency | structural (currency fixed at purchase; recorded by 5, 6, 9) |
| §3.2 price book (fixed GBP/USD, NGN flexible) | 1, 2 (+ corrections noted above) |
| §3.3 Paystack keeps GHS (+NGN when enabled) | 6 (and untouched existing flows) |
| §3.3 Stripe for GBP/USD, one-time + subscriptions, dunning via Stripe Billing | 7, 8, 9, 10 |
| §3.3 webhook idempotency + signature verification | 7 (verify), 9 (idempotent upserts) |
| §3.3 credit waterfall currency-agnostic | structural (credits are units; verified in 14) |
| §3.4 five diaspora landing pages | 13 |
| Currency-aware price display everywhere in scope | 11, 12, 13 |

Out of scope for this plan: NGN activation (owner business action + one flag), Paystack-USD as a Stripe alternative, currency conversion of historical analytics, the §5.3 weekly report worker (scheduled with Phase C).
