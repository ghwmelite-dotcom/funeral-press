# Paystack-USD Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route diaspora USD payments through Paystack (Ghana merchants cannot open Stripe accounts), retiring GBP to dormant and leaving the Stripe code dormant behind its existing 503 guards.

**Architecture:** The price book's `providerFor`/`CURRENCIES` flags are the single control point: USD flips to `provider: 'paystack'` and ships `enabled: false` (dormant) until the owner's Paystack account has USD activated — until then `currencyForCountry` falls back to GHS for everyone, which replaces today's broken behavior (diaspora sees USD prices → Stripe 503). The Paystack initialize handlers (one-time, memorial lifetime inline, Pro + memorial annual subscriptions) become currency-aware, resolving amounts from the price book and selecting per-currency Paystack plan codes from env. Activation later = flip one flag in two mirrored files + add four USD plan-code env vars.

**Tech Stack:** Cloudflare Workers + D1, Paystack (GHS + USD), React 19, Vitest.

---

## Decisions fixed by this plan

1. **Partner commission stays GHS-only:** `commission_amount` is summed across orders in admin/partner payout views assuming one currency; mixing USD rows in would corrupt those sums. Non-GHS orders get `partner_id` recorded (attribution) but `commission_rate`/`commission_amount` NULL. Revisit if diaspora partner volume materializes.
2. **Referral-balance discount stays GHS-only** (the balance is denominated in pesewas) — already true via `applyReferralDiscount` being fed only in the GHS path; this plan makes the guard explicit.
3. **Bulk institutional plans stay GHS-only** (already gated in the UI; the worker now also rejects them for non-GHS).
4. **GBP retires to dormant** with `provider: 'stripe'` retained — if a UK entity ever exists, GBP reactivates on the Stripe rail without rework. UK/EU visitors resolve to USD (when enabled), else GHS.
5. **Stripe code is NOT removed** — endpoints stay 503-guarded and unreachable from the UI (no enabled currency maps to provider 'stripe').

## Owner activation checklist (later, when Paystack confirms USD)

1. Paystack dashboard/support: USD activation for the business.
2. Create 4 USD Paystack plans (Pro Monthly $15, Pro Annual $149, Memorial Premium Annual $39, Memorial Heritage Annual $59 — amounts in cents must match the price book: 1500 / 14900 / 3900 / 5900).
3. Add to `workers/auth-api-wrangler.toml` `[vars]`: `PAYSTACK_PLAN_MONTHLY_USD`, `PAYSTACK_PLAN_ANNUAL_USD`, `PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL_USD`, `PAYSTACK_PLAN_MEMORIAL_HERITAGE_ANNUAL_USD`.
4. Flip `CURRENCIES.USD.enabled` to `true` in BOTH `workers/priceBook.js` and `src/config/priceBook.js` (drift test enforces they match).
5. Deploy; test a USD card charge end-to-end.
6. Pre-activation engineering gates: (a) admin revenue dashboards are GHS-scoped — build multi-currency admin reporting (or accept GHS-only admin totals with USD visible in the weekly growth report); (b) run one real staged USD card charge end-to-end (initialize → webhook → credits) before announcing.
7. Known scope note: candles/tributes, print orders, and bulk plans remain GHS-only — a USD-display visitor buying a candle is charged in GHS (working, but no UI signal). Extend if diaspora candle volume appears.

---

### Task 1: Price book provider flip + dormancy fallback chain (TDD)

**Files:**
- Modify: `workers/priceBook.js`, `src/config/priceBook.js` (mirror — keep byte-identical for shared members)
- Test: `workers/__tests__/priceBook.test.js`
- Modify: `src/components/pricing/CurrencySwitcher.jsx` (hide when only one currency)

- [ ] **Step 1: Update the failing tests first.** In `workers/__tests__/priceBook.test.js`, replace the `currencyForCountry` and `providerFor` describe blocks and the dormancy test with:

```javascript
describe('currencyForCountry', () => {
  it('maps Ghana to GHS', () => expect(currencyForCountry('GH')).toBe('GHS'))
  it('falls back to GHS everywhere while USD is dormant', () => {
    expect(currencyForCountry('NG')).toBe('GHS')
    expect(currencyForCountry('GB')).toBe('GHS')
    expect(currencyForCountry('DE')).toBe('GHS')
    expect(currencyForCountry('US')).toBe('GHS')
    expect(currencyForCountry(null)).toBe('GHS')
  })
  it('routes non-Ghana traffic to USD once USD is enabled', () => {
    CURRENCIES.USD.enabled = true
    try {
      expect(currencyForCountry('US')).toBe('USD')
      expect(currencyForCountry('NG')).toBe('USD')   // NGN still dormant
      expect(currencyForCountry('GB')).toBe('USD')   // GBP still dormant
      expect(currencyForCountry('GH')).toBe('GHS')
    } finally {
      CURRENCIES.USD.enabled = false
    }
  })
  it('prefers GBP for UK/EU when GBP is enabled', () => {
    CURRENCIES.GBP.enabled = true
    try {
      expect(currencyForCountry('GB')).toBe('GBP')
      expect(currencyForCountry('FR')).toBe('GBP')
      expect(currencyForCountry('US')).toBe('GHS') // USD still dormant
    } finally {
      CURRENCIES.GBP.enabled = false
    }
  })
})

describe('providerFor', () => {
  it('routes GHS, NGN, and USD to paystack', () => {
    expect(providerFor('GHS')).toBe('paystack')
    expect(providerFor('NGN')).toBe('paystack')
    expect(providerFor('USD')).toBe('paystack')
  })
  it('keeps GBP on stripe (dormant, pending a UK entity)', () => {
    expect(providerFor('GBP')).toBe('stripe')
  })
})
```

And in the `product metadata` describe block, replace the dormancy assertion:

```javascript
  it('only GHS is enabled until Paystack activates USD', () => {
    expect(CURRENCIES.GHS.enabled).toBe(true)
    expect(CURRENCIES.USD.enabled).toBe(false)
    expect(CURRENCIES.GBP.enabled).toBe(false)
    expect(CURRENCIES.NGN.enabled).toBe(false)
  })
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run workers/__tests__/priceBook.test.js`)
- [ ] **Step 3: Implement in `workers/priceBook.js`** — change the `CURRENCIES` block and `currencyForCountry`:

```javascript
export const CURRENCIES = {
  GHS: { enabled: true,  symbol: 'GHS', provider: 'paystack' },
  NGN: { enabled: false, symbol: '₦',   provider: 'paystack' },
  // GBP dormant pending a UK entity (Stripe doesn't onboard Ghana merchants).
  GBP: { enabled: false, symbol: '£',   provider: 'stripe' },
  // USD via Paystack Ghana — flip enabled once Paystack activates USD for the
  // business (see the activation checklist in the 2026-06-12 paystack-usd plan).
  USD: { enabled: false, symbol: '$',   provider: 'paystack' },
}
```

```javascript
export function currencyForCountry(country) {
  if (country === 'GH') return 'GHS'
  if (country === 'NG' && CURRENCIES.NGN.enabled) return 'NGN'
  if ((country === 'GB' || EU.includes(country)) && CURRENCIES.GBP.enabled) return 'GBP'
  return CURRENCIES.USD.enabled ? 'USD' : 'GHS'
}
```

Mirror BOTH changes verbatim into `src/config/priceBook.js` (the drift test compares `CURRENCIES` objects and `currencyForCountry` behavior).

- [ ] **Step 4: Run — expect PASS**, plus `npx vitest run src/config/__tests__/priceBook.drift.test.js` PASS.
- [ ] **Step 5: Hide the switcher when only one currency is enabled.** In `src/components/pricing/CurrencySwitcher.jsx`, after computing `enabled`, add:

```jsx
  if (enabled.length < 2) return null
```

- [ ] **Step 6: Full `npx vitest run` — fix any test that asserted the old behavior (e.g., currencyStore tests stubbing `/geo` responses still pass because the store trusts the server's resolved currency; the store's "rejects disabled currencies" test may use 'GBP' — if so, change its accepted-currency fixture to 'GHS'-only semantics or mutate-and-restore as above). All green.**
- [ ] **Step 7: Commit**

```bash
git add workers/priceBook.js src/config/priceBook.js workers/__tests__/priceBook.test.js src/components/pricing/CurrencySwitcher.jsx src/stores/__tests__/currencyStore.test.js
git commit -m "feat(pricing): route USD via Paystack, retire GBP to dormant, GHS fallback while USD awaits activation"
```

---

### Task 2: Currency-aware `handlePaymentInitialize` (worker)

**Files:**
- Modify: `workers/auth-api.js` (`handlePaymentInitialize`, ~line 866)

- [ ] **Step 0: Extend the price-book import** at the top of `workers/auth-api.js` — `CURRENCIES` is not currently imported:

```javascript
import { PRODUCTS, CURRENCIES, priceFor, currencyForCountry, providerFor, isSubscription } from './priceBook.js'
```

- [ ] **Step 1: Read the current handler in full**, then rework its body to:

```javascript
async function handlePaymentInitialize(request, env, userId) {
  const { plan, currency: rawCurrency } = await request.json()
  if (!plan || !PLANS[plan]) return error('Invalid plan', 400, request)

  const currency = rawCurrency || 'GHS'
  if (currency !== 'GHS') {
    if (!CURRENCIES[currency]?.enabled || providerFor(currency) !== 'paystack') {
      return error('Unsupported currency', 400, request)
    }
    if (PLANS[plan].institutional) return error('Institutional plans are GHS-only', 400, request)
  }

  const planInfo = PLANS[plan]
  const user = await env.DB.prepare('SELECT id, email, referral_balance_pesewas FROM users WHERE id = ?').bind(userId).first()
  if (!user) return error('User not found', 404, request)

  // Base amount in the charge currency. GHS amounts come from PLANS (which
  // derives from the price book); other currencies resolve directly.
  const baseAmount = currency === 'GHS' ? planInfo.amount : priceFor(plan, currency)

  // Partner commission: GHS-only (commission sums assume one currency —
  // plan decision #1). Attribution (partner_id) is still recorded.
  const referral = await env.DB.prepare("SELECT partner_id FROM referrals WHERE referred_user_id = ? AND type = 'partner'").bind(userId).first()
  const partnerId = referral?.partner_id || null
  let commissionRate = null
  let commissionAmount = null
  if (partnerId && currency === 'GHS') {
    const partner = await env.DB.prepare('SELECT partner_commission_override FROM users WHERE id = ?').bind(partnerId).first()
    commissionRate = partner?.partner_commission_override || 0.10
    commissionAmount = Math.round(baseAmount * commissionRate)
  }

  // Referral balance discount: GHS-only (balance is denominated in pesewas).
  let referralDiscount = 0
  let chargeAmount = baseAmount
  if (currency === 'GHS') {
    const applied = applyReferralDiscount({
      balancePesewas: user.referral_balance_pesewas || 0,
      amountPesewas: baseAmount,
    })
    referralDiscount = applied.discount
    chargeAmount = applied.amount
  }

  const reference = `fp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const orderId = generateId()

  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, partner_id, commission_rate, commission_amount, referral_discount_pesewas, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, userId, plan, chargeAmount, reference, partnerId, commissionRate, commissionAmount, referralDiscount, currency).run()

  return json({
    reference,
    amount: chargeAmount,
    email: user.email,
    currency,
  }, 200, request)
}
```

Preserve any code in the current handler not shown above (read first — if the deployed version has additional lines, integrate rather than overwrite). The amount-match guards in `handlePaymentVerify` and the webhook compare against `order.amount_pesewas` and are currency-agnostic — no changes there. `markOrderPaid` grants credits from `PLANS[order.plan].credits` — currency-agnostic — and its referral-balance decrement is a no-op for USD orders (`referral_discount_pesewas` = 0).

- [ ] **Step 2:** `npx vitest run` PASS; `node --check workers/auth-api.js` clean.
- [ ] **Step 3: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(payments): currency-aware Paystack initialize with GHS-only commission and referral discount"
```

---

### Task 3: Currency-aware memorial premium + subscriptions (worker)

**Files:**
- Modify: `workers/auth-api.js` (`handlePremiumInitialize` ~line 1308, `handleSubscriptionCreate` ~line 2600, `handleMemorialSubscriptionCreate` ~line 2750)

- [ ] **Step 1: `handlePremiumInitialize` (memorial lifetime/annual inline).** Read it in full. Add `currency` to the destructured body with the same validation as Task 2:

```javascript
  const { memorialId, tier: rawTier, planType: rawPlanType, currency: rawCurrency } = await request.json().catch(() => ({}))
  // ... after tier/planType resolution:
  const currency = rawCurrency || 'GHS'
  if (currency !== 'GHS' && (!CURRENCIES[currency]?.enabled || providerFor(currency) !== 'paystack')) {
    return error('Unsupported currency', 400, request)
  }
```

Where the amount resolves from `TIERS[tier].lifetimePesewas` (or annual), make it currency-aware via the price book product keys:

```javascript
  const productKey = planType === 'lifetime' ? `memorial_${tier}_lifetime` : `memorial_${tier}_annual`
  const amountPesewas = currency === 'GHS'
    ? /* existing TIERS-based amount, unchanged */
    : priceFor(productKey, currency)
```

Record `currency` in the `memorial_premium` INSERT (the column exists; the current INSERT hardcodes `'GHS'` — bind the variable) and return `currency` in the JSON response instead of the hardcoded `'GHS'`. The verify path compares `psData.data.amount !== row.amount_pesewas` — currency-agnostic, unchanged.

- [ ] **Step 2: `handleSubscriptionCreate` (Pro plans).** Accept `currency`; per-currency plan codes:

```javascript
  const { plan, currency: rawCurrency } = await request.json()
  // ... existing plan validation, duplicate-sub guard, user lookup ...
  const currency = rawCurrency || 'GHS'
  if (currency !== 'GHS' && (!CURRENCIES[currency]?.enabled || providerFor(currency) !== 'paystack')) {
    return error('Unsupported currency', 400, request)
  }

  let planCode
  if (currency === 'USD') {
    planCode = plan === 'pro_monthly' ? env.PAYSTACK_PLAN_MONTHLY_USD : env.PAYSTACK_PLAN_ANNUAL_USD
    if (!planCode) return error('USD subscriptions are not configured yet', 503, request)
  } else {
    planCode = plan === 'pro_monthly' ? env.PAYSTACK_PLAN_MONTHLY : env.PAYSTACK_PLAN_ANNUAL
  }
```

(The rest of the handler — Paystack initialize with `plan: planCode` — is unchanged; Paystack derives currency/amount from the plan.)

- [ ] **Step 3: `handleMemorialSubscriptionCreate` (memorial annual).** Same pattern: accept `currency`; for USD use `env[TIERS[tier].planCodeAnnual + '_USD']` (i.e. `PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL_USD` / `..._HERITAGE_ANNUAL_USD`) with the same 503 guard, and make the initialize body's `amount`/`currency` currency-aware:

```javascript
  const amountPesewas = currency === 'GHS' ? TIERS[tier].annualPesewas : priceFor(`memorial_${tier}_annual`, currency)
  // in the Paystack body: amount: amountPesewas, currency,
```

Also check the memorial-annual WEBHOOK amount guard (it compares `data.amount !== TIERS[tier].annualPesewas`): make it accept either the GHS or USD catalog price for the tier:

```javascript
  const expectedAmounts = [TIERS[tier].annualPesewas, PRODUCTS[`memorial_${tier}_annual`].prices.USD]
  if (data.amount != null && !expectedAmounts.includes(data.amount)) { /* existing mismatch handling */ }
```

- [ ] **Step 4: Document the future env vars** in `workers/auth-api-wrangler.toml`'s `[vars]` comment area:

```toml
# USD Paystack plan codes — create in the Paystack dashboard once USD is
# activated for the business, then uncomment (see the 2026-06-12 paystack-usd
# plan's activation checklist). USD subscriptions 503 until these exist.
# PAYSTACK_PLAN_MONTHLY_USD = ""
# PAYSTACK_PLAN_ANNUAL_USD = ""
# PAYSTACK_PLAN_MEMORIAL_PREMIUM_ANNUAL_USD = ""
# PAYSTACK_PLAN_MEMORIAL_HERITAGE_ANNUAL_USD = ""
```

- [ ] **Step 5:** `npx vitest run` PASS; `node --check workers/auth-api.js` clean.
- [ ] **Step 6: Commit**

```bash
git add workers/auth-api.js workers/auth-api-wrangler.toml
git commit -m "feat(payments): currency-aware memorial premium and subscription creation with USD plan codes"
```

---

### Task 4: Frontend passes currency through the Paystack flows

**Files:**
- Modify: `src/components/editor/CheckoutDialog.jsx` (~lines 107–110 and 166–169), `src/utils/memorialApi.js` (lines 47–70), `src/components/memorial/UpgradeDialog.jsx` (~line 228 + the lifetime/Stripe branch area), `src/components/memorial/__tests__/UpgradeDialog.test.jsx` (subscribe assertions)

- [ ] **Step 1: CheckoutDialog.** Both Paystack bodies gain the currency (read the handlers first; `currency` is already read from `useCurrencyStore` in this component):

```javascript
        body: JSON.stringify({ plan: planKey, currency }),
```

— in BOTH `apiFetch('/payments/initialize', ...)` (~line 109) and `apiFetch('/subscriptions/create', ...)` (~line 168). If the handlers read currency via `useCurrencyStore.getState().currency` instead of a hook variable, match the file's existing pattern. The Stripe branch above each stays as-is (dead while no enabled currency maps to stripe).

- [ ] **Step 2: memorialApi.** Thread currency as an explicit argument (callers pass it; the util stays store-free):

```javascript
export async function initMemorialPremium(memorialId, currency = 'GHS') {
  return apiFetch('/memorial-premium/initialize', {
    method: 'POST',
    body: JSON.stringify({ memorialId, currency }),
  })
}

export async function initMemorialTierLifetime(memorialId, tier, currency = 'GHS') {
  return apiFetch('/memorial-premium/initialize', {
    method: 'POST',
    body: JSON.stringify({ memorialId, tier, planType: 'lifetime', currency }),
  })
}

export async function subscribeMemorialTier(memorialId, tier, currency = 'GHS') {
  return apiFetch(`/memorial-premium/${memorialId}/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ tier, currency }),
  })
}
```

- [ ] **Step 3: UpgradeDialog.** Pass the store currency into both calls: `initMemorialTierLifetime(memorialId, selectedTier, currency)` and `subscribeMemorialTier(memorialId, selectedTier, currency)` (the component already reads `currency` from `useCurrencyStore` — verify the variable name). Update the existing test assertions: `expect(mockSubscribe).toHaveBeenCalledWith('m1', 'premium', 'GHS')` (and the heritage variant) — the dialog renders with the store default GHS in tests.

- [ ] **Step 4:** `npx vitest run` PASS, `npm run lint` clean, `npm run build` green.
- [ ] **Step 5: Commit**

```bash
git add src/components/editor/CheckoutDialog.jsx src/utils/memorialApi.js src/components/memorial/UpgradeDialog.jsx src/components/memorial/__tests__/UpgradeDialog.test.jsx
git commit -m "feat(payments): thread display currency through Paystack checkout and memorial flows"
```

---

### Task 5: Spec amendment + verification

**Files:**
- Modify: `docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md` (§3.3)

- [ ] **Step 1: Amend §3.3** — append after the existing Stripe correction line:

```markdown
- *Correction (2026-06-12):* **Stripe does not onboard Ghana-registered merchants**, so the Stripe rail is unusable without a UK/US entity. The diaspora rail is **Paystack USD** (supported for Ghana businesses, requires account activation by Paystack). GBP is dormant pending a UK entity; UK/EU visitors pay in USD. The Stripe integration remains in the codebase, dormant behind 503 guards, for a future entity.
```

- [ ] **Step 2: Final verification.** `npm run lint` clean; `npx vitest run` ALL pass; `npm run build` green. Behavior sanity: with everything dormant except GHS, `currencyForCountry` returns GHS for any country — the site renders GHS everywhere (replacing the current broken USD→Stripe-503 experience), and all four payment flows accept an explicit currency for the day USD flips on.
- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md
git commit -m "docs(spec): record Stripe Ghana-merchant correction; Paystack USD is the diaspora rail"
```

---

## Coverage map

| Requirement | Task |
|---|---|
| USD provider → Paystack, dormant until activation | 1 |
| GBP dormant, GHS fallback chain, switcher hidden when single-currency | 1 |
| One-time purchases in USD (Paystack) | 2 |
| Memorial lifetime in USD | 3 |
| Pro + memorial annual subscriptions in USD (per-currency plan codes, 503 until configured) | 3 |
| Commission + referral discount stay GHS-only | 2 (decision #1, #2) |
| Frontend currency threading | 4 |
| Spec correction + owner activation checklist | 5 + plan header |

Out of scope: removing Stripe code (kept dormant), NGN activation, multi-currency partner commission accounting.
