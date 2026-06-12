# Phase A: Conversion Loop on Shared Artifacts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every shared funeral artifact (memorial page, guest book, printed QR) carries a dignified conversion pathway, plus a give-get family referral program — per spec `docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md` §2.1–2.6.

**Architecture:** Frontend surfaces (React 19 + react-router 7, Tailwind) fire loop events to GA4 and the existing `analytics_events` D1 table via the public `/analytics/event` endpoint. The family referral program reuses the existing `referrals` table + `users.referral_code` with a `type='family'` discriminator; reward rules live in a new pure module `workers/familyReferral.js` (precedent: `workers/tierConfig.js`) imported by `workers/auth-api.js`. Referrer rewards accrue as `users.referral_balance_pesewas` and auto-apply as a discount at Paystack payment initialize.

**Tech Stack:** React 19, react-router-dom 7, Zustand, Tailwind, Cloudflare Workers + D1, Vitest (+ Testing Library, jsdom).

**Voice constraint (spec §2.1):** All user-facing copy in this plan is final and was written for the Solemn Radiance voice — quiet attribution, no urgency, no discount language on grief surfaces, no exclamation marks. Do not "improve" the copy.

**Conventions used below:**
- Frontend API base: `import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'`
- Worker helpers that already exist in `workers/auth-api.js`: `json()`, `error()`, `generateId()` (line ~141), `generateReferralCode()` (line ~157), `hashToken()` (line ~145, SHA-256), `getClientIP()`, `notifyAdmin()`, `authenticate()`.
- Test commands: `npx vitest run <path>` (script `test` = `vitest run`).

---

### Task 1: Family referral rules module (pure logic, TDD)

**Files:**
- Create: `workers/familyReferral.js`
- Test: `workers/__tests__/familyReferral.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// workers/__tests__/familyReferral.test.js
import { describe, it, expect } from 'vitest'
import {
  FAMILY_REWARD_PESEWAS,
  FAMILY_REWARD_CAP_PER_YEAR,
  referralTypeFor,
  initialRewardStatus,
  canGrantReward,
  applyReferralDiscount,
} from '../familyReferral.js'

describe('referralTypeFor', () => {
  it('classifies partners as partner referrals', () => {
    expect(referralTypeFor({ is_partner: 1 })).toBe('partner')
  })
  it('classifies ordinary users as family referrals', () => {
    expect(referralTypeFor({ is_partner: 0 })).toBe('family')
    expect(referralTypeFor({ is_partner: null })).toBe('family')
  })
})

describe('initialRewardStatus', () => {
  it('flags same-IP referrer/referred pairs for review', () => {
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: 'abc' })).toBe('review')
  })
  it('is pending when IP hashes differ', () => {
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: 'def' })).toBe('pending')
  })
  it('is pending when either hash is missing', () => {
    expect(initialRewardStatus({ trackIpHash: null, codeIpHash: 'def' })).toBe('pending')
    expect(initialRewardStatus({ trackIpHash: 'abc', codeIpHash: null })).toBe('pending')
  })
})

describe('canGrantReward', () => {
  it('allows grants below the 12-month cap', () => {
    expect(canGrantReward({ grantedLast12Months: 0 })).toBe(true)
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR - 1 })).toBe(true)
  })
  it('blocks grants at or above the cap', () => {
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR })).toBe(false)
    expect(canGrantReward({ grantedLast12Months: FAMILY_REWARD_CAP_PER_YEAR + 5 })).toBe(false)
  })
})

describe('applyReferralDiscount', () => {
  it('returns zero discount when balance is empty', () => {
    expect(applyReferralDiscount({ balancePesewas: 0, amountPesewas: 3500 }))
      .toEqual({ discount: 0, amount: 3500 })
  })
  it('applies the full balance when amount allows', () => {
    expect(applyReferralDiscount({ balancePesewas: 2000, amountPesewas: 3500 }))
      .toEqual({ discount: 2000, amount: 1500 })
  })
  it('never discounts below the Paystack minimum charge (100 pesewas)', () => {
    expect(applyReferralDiscount({ balancePesewas: 99999, amountPesewas: 3500 }))
      .toEqual({ discount: 3400, amount: 100 })
  })
  it('returns zero discount when amount is already at the minimum', () => {
    expect(applyReferralDiscount({ balancePesewas: 2000, amountPesewas: 100 }))
      .toEqual({ discount: 0, amount: 100 })
  })
  it('treats negative balances as zero', () => {
    expect(applyReferralDiscount({ balancePesewas: -50, amountPesewas: 3500 }))
      .toEqual({ discount: 0, amount: 3500 })
  })
  it('reward constant is GHS 20 in pesewas', () => {
    expect(FAMILY_REWARD_PESEWAS).toBe(2000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run workers/__tests__/familyReferral.test.js`
Expected: FAIL — `Cannot find module '../familyReferral.js'`

- [ ] **Step 3: Write the implementation**

```javascript
// workers/familyReferral.js
// Family referral reward rules — spec §2.5,
// docs/superpowers/specs/2026-06-11-automated-growth-flywheel-design.md

export const FAMILY_REWARD_PESEWAS = 2000 // GHS 20
export const FAMILY_REWARD_CAP_PER_YEAR = 10
export const MIN_CHARGE_PESEWAS = 100 // Paystack will reject charges below ~GHS 1

export function referralTypeFor(referrer) {
  return referrer.is_partner ? 'partner' : 'family'
}

export function initialRewardStatus({ trackIpHash, codeIpHash }) {
  if (trackIpHash && codeIpHash && trackIpHash === codeIpHash) return 'review'
  return 'pending'
}

export function canGrantReward({ grantedLast12Months }) {
  return grantedLast12Months < FAMILY_REWARD_CAP_PER_YEAR
}

export function applyReferralDiscount({ balancePesewas, amountPesewas }) {
  const balance = Math.max(0, balancePesewas || 0)
  if (balance <= 0) return { discount: 0, amount: amountPesewas }
  const discount = Math.min(balance, amountPesewas - MIN_CHARGE_PESEWAS)
  if (discount <= 0) return { discount: 0, amount: amountPesewas }
  return { discount, amount: amountPesewas - discount }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run workers/__tests__/familyReferral.test.js`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add workers/familyReferral.js workers/__tests__/familyReferral.test.js
git commit -m "feat(referrals): add family referral reward rules module"
```

---

### Task 2: D1 migration for family referrals

**Files:**
- Create: `workers/migrations/migration-family-referrals.sql`

- [ ] **Step 1: Write the migration**

Note: SQLite `ALTER TABLE ... ADD COLUMN` has no `IF NOT EXISTS`; like the other `migration-*.sql` files, this is applied exactly once per environment (see deployment checklist, Task 14).

```sql
-- Family referral program (spec §2.5, 2026-06-11-automated-growth-flywheel-design.md)
-- referrals.partner_id is the REFERRER for both types ('partner' and 'family').

ALTER TABLE referrals ADD COLUMN type TEXT DEFAULT 'partner';
ALTER TABLE referrals ADD COLUMN reward_status TEXT;          -- family only: pending | granted | review | capped
ALTER TABLE referrals ADD COLUMN reward_granted_at TEXT;
ALTER TABLE referrals ADD COLUMN ip_hash TEXT;                -- SHA-256 of referred user's IP at track time

ALTER TABLE users ADD COLUMN referral_balance_pesewas INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code_ip_hash TEXT;      -- SHA-256 of IP when code was generated

ALTER TABLE orders ADD COLUMN referral_discount_pesewas INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_referrals_type_status ON referrals(type, reward_status);
```

- [ ] **Step 2: Validate the SQL locally**

Run: `npx wrangler d1 execute funeralpress-db --local --file=workers/migrations/migration-family-referrals.sql`
Expected: success (no errors). If the local DB lacks base tables, first run: `npx wrangler d1 execute funeralpress-db --local --file=workers/migrations/migration-foundation.sql` — if it still cannot run locally, note that and rely on the staging apply in Task 14.

- [ ] **Step 3: Commit**

```bash
git add workers/migrations/migration-family-referrals.sql
git commit -m "feat(referrals): add family referral migration (type, rewards, balance, order discount)"
```

---

### Task 3: Loop analytics utility (frontend, TDD)

**Files:**
- Create: `src/utils/loopAnalytics.js`
- Test: `src/utils/__tests__/loopAnalytics.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// src/utils/__tests__/loopAnalytics.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  recordLoopEvent,
  captureLoopSurface,
  getStoredLoopSurface,
  clearStoredLoopSurface,
  LOOP_SURFACES,
} from '../loopAnalytics'

describe('loopAnalytics', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('declares the five spec surfaces', () => {
    expect(LOOP_SURFACES).toEqual([
      'memorial_footer',
      'post_condolence',
      'qr_ribbon',
      'referral_dashboard',
      'referral_post_export',
    ])
  })

  it('posts loop events to the analytics endpoint with surface metadata', () => {
    recordLoopEvent('loop_click', 'memorial_footer', { memorialId: 'm1' })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/analytics\/event$/)
    const body = JSON.parse(opts.body)
    expect(body.event_type).toBe('loop_click')
    expect(body.metadata).toEqual({ surface: 'memorial_footer', memorialId: 'm1' })
    expect(opts.headers.Authorization).toBeUndefined()
  })

  it('attaches the auth token when provided so the event carries user_id', () => {
    recordLoopEvent('loop_signup', 'qr_ribbon', {}, { token: 'jwt-123' })
    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer jwt-123')
  })

  it('stores and recalls the attribution surface', () => {
    captureLoopSurface('post_condolence')
    expect(getStoredLoopSurface()).toBe('post_condolence')
    clearStoredLoopSurface()
    expect(getStoredLoopSurface()).toBeNull()
  })

  it('ignores unknown surfaces', () => {
    captureLoopSurface('hacker_surface')
    expect(getStoredLoopSurface()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/loopAnalytics.test.js`
Expected: FAIL — cannot find module `../loopAnalytics`

- [ ] **Step 3: Write the implementation**

```javascript
// src/utils/loopAnalytics.js
// Growth-loop event tracking (spec §2.6) — mirrors every event to GA4 and to
// the first-party analytics_events table so K-factor is computable in D1.
import { trackEvent } from './analytics'

const API_BASE = import.meta.env.VITE_AUTH_API_URL || 'https://funeralpress-auth-api.ghwmelite.workers.dev'
const SURFACE_KEY = 'fp-loop-surface'

export const LOOP_SURFACES = [
  'memorial_footer',
  'post_condolence',
  'qr_ribbon',
  'referral_dashboard',
  'referral_post_export',
]

export function recordLoopEvent(eventType, surface, metadata = {}, { token } = {}) {
  trackEvent(eventType, { surface, ...metadata })
  try {
    const headers = { 'Content-Type': 'application/json' }
    // With a token, /analytics/event stores user_id — required for the
    // signup → first_design → purchase funnel joins (spec §2.6).
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(`${API_BASE}/analytics/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event_type: eventType, metadata: { surface, ...metadata } }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* never break the page for analytics */ }
}

export function captureLoopSurface(surface) {
  if (!LOOP_SURFACES.includes(surface)) return
  try { localStorage.setItem(SURFACE_KEY, surface) } catch { /* ignore */ }
}

export function getStoredLoopSurface() {
  try { return localStorage.getItem(SURFACE_KEY) } catch { return null }
}

export function clearStoredLoopSurface() {
  try { localStorage.removeItem(SURFACE_KEY) } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/loopAnalytics.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/loopAnalytics.js src/utils/__tests__/loopAnalytics.test.js
git commit -m "feat(loop): add loop analytics utility (GA4 + first-party events, surface attribution)"
```

---

### Task 4: `/honour` landing page

**Files:**
- Create: `src/pages/HonourPage.jsx`
- Modify: `src/App.jsx` (lazy import near line 37; route near line 161)
- Test: `src/pages/__tests__/HonourPage.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/__tests__/HonourPage.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HonourPage from '../HonourPage.jsx'

describe('HonourPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  function renderPage(initialEntry = '/honour') {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <HonourPage />
        </MemoryRouter>
      </HelmetProvider>
    )
  }

  it('renders the hero headline', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /honour someone you've lost/i })).toBeInTheDocument()
  })

  it('links to the memorial creator and brochure designer', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /create a memorial page/i })).toHaveAttribute('href', '/memorial-page-creator')
    expect(screen.getByRole('link', { name: /design a funeral programme/i })).toHaveAttribute('href', '/funeral-brochure-designer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/HonourPage.test.jsx`
Expected: FAIL — cannot find module `../HonourPage.jsx`

- [ ] **Step 3: Write the page**

```jsx
// src/pages/HonourPage.jsx
// Loop landing page (spec §2.2): the destination for every memorial-surface
// pathway. Meets visitors in mourning context — never a generic sales page.
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, BookOpen, FileText, ArrowRight } from 'lucide-react'
import PageMeta from '../components/seo/PageMeta'
import { recordLoopEvent, captureLoopSurface, LOOP_SURFACES } from '../utils/loopAnalytics'

const PATHWAYS = [
  {
    to: '/memorial-page-creator',
    icon: Heart,
    title: 'Create a memorial page',
    body: 'A lasting online tribute with photos, their story, and a place for friends and family to leave messages — shareable on WhatsApp.',
  },
  {
    to: '/funeral-brochure-designer',
    icon: FileText,
    title: 'Design a funeral programme',
    body: 'Beautiful, print-ready funeral brochures in minutes. Choose a theme, add their photo and story, and download.',
  },
  {
    to: '/guest-book-creator',
    icon: BookOpen,
    title: 'Open a digital guest book',
    body: 'Collect condolence messages from everyone who loved them, wherever in the world they are.',
  },
]

export default function HonourPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const from = searchParams.get('from')
    if (from && LOOP_SURFACES.includes(from)) {
      captureLoopSurface(from)
      recordLoopEvent('loop_landing', from)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Honour Someone You've Lost | FuneralPress"
        description="Create a memorial page, funeral programme, or digital guest book for your loved one. Families across Ghana and beyond celebrate lives with dignity on FuneralPress."
        path="/honour"
      />

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-primary/50" />
          <Heart size={20} className="text-primary" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-primary/50" />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold text-card-foreground mb-4"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Honour someone you've lost
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
          When words feel impossible, a tribute helps. Families across Ghana and
          beyond use FuneralPress to celebrate the lives of those they love —
          gently, beautifully, and in minutes.
        </p>
      </div>

      {/* Pathways */}
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-4">
        {PATHWAYS.map(({ to, icon: Icon, title, body }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-card-foreground mb-1 flex items-center gap-2">
                {title}
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quiet secondary */}
      <div className="max-w-2xl mx-auto px-4 pb-16 text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          See everything FuneralPress offers
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Register the route in `src/App.jsx`**

Add the lazy import next to the other page imports (after line 37, `const MyDesignsPage = ...`):

```jsx
const HonourPage = lazy(() => import('./pages/HonourPage'))
```

Add the route inside `<Routes>` (after line 161, `<Route path="/my-designs" ...>`):

```jsx
              <Route path="/honour" element={<HonourPage />} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/HonourPage.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/pages/HonourPage.jsx src/pages/__tests__/HonourPage.test.jsx src/App.jsx
git commit -m "feat(loop): add /honour landing page for memorial-surface pathways"
```

---

### Task 5: Memorial page footer pathway

**Files:**
- Modify: `src/pages/MemorialPage.jsx` (imports lines 1–13; footer block lines 320–331; impression effect after line 64)

- [ ] **Step 1: Add imports**

In `src/pages/MemorialPage.jsx`, the import block currently starts:

```jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
```

Add after the existing imports (line 13):

```jsx
import { recordLoopEvent, captureLoopSurface } from '../utils/loopAnalytics'
```

- [ ] **Step 2: Fire the footer impression once per load**

After the existing `useEffect` that loads the memorial (ends line 64), add:

```jsx
  // Loop impression (spec §2.6): every public memorial view is a footer impression
  useEffect(() => {
    if (data) recordLoopEvent('loop_impression', 'memorial_footer', { memorialId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
```

- [ ] **Step 3: Replace the footer block (always-on attribution, spec §2.2)**

Replace lines 320–331 (the `{/* Footer */}` block — currently gated on `!features.removeBranding`):

```jsx
        {/* Footer */}
        <div className="text-center py-8 border-t" style={{ borderColor: theme.border + '30' }}>
          <div className="text-lg mb-2" style={{ color: theme.heading }}>&#10013;</div>
          {!features.removeBranding && (
            <p className="text-xs" style={{ color: theme.subtleText }}>
              Created with{' '}
              <Link to="/" className="hover:underline" style={{ color: theme.heading }}>
                FuneralPress
              </Link>
            </p>
          )}
        </div>
```

with this always-on version (per spec §2.2 this is page attribution, distinct from the `removeBranding` entitlement, which continues to gate the other two branding blocks at lines ~360 and ~371 — leave those untouched):

```jsx
        {/* Footer — loop pathway (spec §2.2): dignified attribution on all tiers */}
        <div className="text-center py-8 border-t" style={{ borderColor: theme.border + '30' }}>
          <div className="text-lg mb-2" style={{ color: theme.heading }}>&#10013;</div>
          <p className="text-xs" style={{ color: theme.subtleText }}>
            This tribute was lovingly created with{' '}
            <Link
              to="/honour?from=memorial_footer"
              onClick={() => {
                captureLoopSurface('memorial_footer')
                recordLoopEvent('loop_click', 'memorial_footer', { memorialId: id })
              }}
              className="hover:underline"
              style={{ color: theme.heading }}
            >
              FuneralPress
            </Link>
          </p>
        </div>
```

- [ ] **Step 4: Verify nothing broke**

Run: `npx vitest run`
Expected: full suite PASS. Then `npm run build` — expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MemorialPage.jsx
git commit -m "feat(loop): always-on memorial footer pathway to /honour with impression/click events"
```

---

### Task 6: Post-condolence prompt (TDD)

**Files:**
- Create: `src/components/memorial/CondolencePrompt.jsx`
- Modify: `src/pages/GuestBookPage.jsx` (imports lines 1–6; handler lines 40–65; render after line 183)
- Test: `src/components/memorial/__tests__/CondolencePrompt.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/memorial/__tests__/CondolencePrompt.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CondolencePrompt, { hasSeenCondolencePrompt, markCondolencePromptSeen } from '../CondolencePrompt.jsx'

describe('CondolencePrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('thanks the visitor by the deceased first name', () => {
    render(
      <MemoryRouter>
        <CondolencePrompt slug="akua-mensah" deceasedFirstName="Akua" onDismiss={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByText(/thank you for honouring akua/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /funeralpress is here/i }))
      .toHaveAttribute('href', '/honour?from=post_condolence')
  })

  it('calls onDismiss when dismissed', () => {
    const onDismiss = vi.fn()
    render(
      <MemoryRouter>
        <CondolencePrompt slug="akua-mensah" deceasedFirstName="Akua" onDismiss={onDismiss} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('tracks seen-state per guest book slug', () => {
    expect(hasSeenCondolencePrompt('akua-mensah')).toBe(false)
    markCondolencePromptSeen('akua-mensah')
    expect(hasSeenCondolencePrompt('akua-mensah')).toBe(true)
    expect(hasSeenCondolencePrompt('other-slug')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/memorial/__tests__/CondolencePrompt.test.jsx`
Expected: FAIL — cannot find module `../CondolencePrompt.jsx`

- [ ] **Step 3: Write the component**

Styling matches GuestBookPage's dark palette (`#1a1a1a` / `#C9A84C`), since it renders inside that page.

```jsx
// src/components/memorial/CondolencePrompt.jsx
// Post-condolence pathway (spec §2.3): shown once per visitor per guest book,
// right after they sign — the highest-intent moment in the loop. Inline, soft,
// dismissible. Never shown to logged-in users (the page handles that check).
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { recordLoopEvent, captureLoopSurface } from '../../utils/loopAnalytics'

const STORAGE_PREFIX = 'fp-condolence-prompt-'

export function hasSeenCondolencePrompt(slug) {
  try { return !!localStorage.getItem(STORAGE_PREFIX + slug) } catch { return false }
}

export function markCondolencePromptSeen(slug) {
  try { localStorage.setItem(STORAGE_PREFIX + slug, '1') } catch { /* ignore */ }
}

export default function CondolencePrompt({ slug, deceasedFirstName, onDismiss }) {
  return (
    <div className="mt-4 bg-[#1a1a1a] border border-[#C9A84C]/20 rounded-lg px-4 py-3 flex items-start gap-3">
      <p className="text-xs text-[#999] leading-relaxed flex-1">
        Thank you for honouring {deceasedFirstName}. If you ever need to celebrate a life,{' '}
        <Link
          to="/honour?from=post_condolence"
          onClick={() => {
            captureLoopSurface('post_condolence')
            recordLoopEvent('loop_click', 'post_condolence', { slug })
          }}
          className="text-[#C9A84C] hover:underline"
        >
          FuneralPress is here
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-[#555] hover:text-[#999] shrink-0 p-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/memorial/__tests__/CondolencePrompt.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire into `src/pages/GuestBookPage.jsx`**

Add to the imports (after line 4):

```jsx
import { useAuthStore } from '../stores/authStore'
import { recordLoopEvent } from '../utils/loopAnalytics'
import CondolencePrompt, { hasSeenCondolencePrompt, markCondolencePromptSeen } from '../components/memorial/CondolencePrompt'
```

Add state next to the other sign-form state (after line 19, `const [signed, setSigned] = useState(false)`):

```jsx
  const [showPrompt, setShowPrompt] = useState(false)
```

In `handleSign`, after `setSigned(true)` (line 58) and before the `setTimeout`, add:

```jsx
      // Post-condolence pathway (spec §2.3): once per visitor per guest book,
      // suppressed for existing logged-in users.
      if (!useAuthStore.getState().isLoggedIn() && !hasSeenCondolencePrompt(slug)) {
        markCondolencePromptSeen(slug)
        setShowPrompt(true)
        recordLoopEvent('loop_impression', 'post_condolence', { slug })
      }
```

In the render, after the `signed` success box (the block ending line 183, `)}`), add:

```jsx
          {showPrompt && (
            <CondolencePrompt
              slug={slug}
              deceasedFirstName={(book.deceasedName || '').split(' ')[0] || 'your loved one'}
              onDismiss={() => setShowPrompt(false)}
            />
          )}
```

- [ ] **Step 6: Verify nothing broke**

Run: `npx vitest run`
Expected: full suite PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/memorial/CondolencePrompt.jsx src/components/memorial/__tests__/CondolencePrompt.test.jsx src/pages/GuestBookPage.jsx
git commit -m "feat(loop): post-condolence prompt after guest book signing (once per visitor)"
```

---

### Task 7: QR `?src=qr` param + first-visit ribbon

**Files:**
- Modify: `src/pages/QRCodePrintPage.jsx` (memorial URL constant, ~line 45)
- Modify: `src/pages/MemorialPage.jsx` (imports; ribbon state; render at top of loaded page)

- [ ] **Step 1: Tag QR URLs**

In `src/pages/QRCodePrintPage.jsx`, find:

```javascript
const memorialUrl = memorialId ? `https://funeralpress.org/memorial/${memorialId}` : null
```

Replace with:

```javascript
// ?src=qr lets the memorial page greet print-QR scanners (spec §2.4)
const memorialUrl = memorialId ? `https://funeralpress.org/memorial/${memorialId}?src=qr` : null
```

- [ ] **Step 2: Add ribbon to `src/pages/MemorialPage.jsx`**

Update the react-router import (line 2) to include `useSearchParams`:

```jsx
import { useParams, Link, useSearchParams } from 'react-router-dom'
```

Update the lucide import (line 4) to include `X`:

```jsx
import { Heart, Calendar, MapPin, Clock, BookOpen, Loader2, Download, Lock, X } from 'lucide-react'
```

Add state + effect inside the component, after `const [upgradeOpen, setUpgradeOpen] = useState(false)` (line 40):

```jsx
  const [searchParams] = useSearchParams()
  const [showQrRibbon, setShowQrRibbon] = useState(false)
  const qrRibbonKey = `fp-qr-ribbon-${id}`

  useEffect(() => {
    // First-visit ribbon for print-QR scanners (spec §2.4): tribute first,
    // pathway second; dismiss is permanent per visitor per memorial.
    let seen = false
    try { seen = !!localStorage.getItem(qrRibbonKey) } catch { /* ignore */ }
    if (searchParams.get('src') === 'qr' && !seen) {
      setShowQrRibbon(true)
      recordLoopEvent('loop_impression', 'qr_ribbon', { memorialId: id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dismissQrRibbon = () => {
    try { localStorage.setItem(qrRibbonKey, '1') } catch { /* ignore */ }
    setShowQrRibbon(false)
  }
```

(The `recordLoopEvent`/`captureLoopSurface` imports were added in Task 5.)

- [ ] **Step 3: Render the ribbon**

In the loaded-page JSX, the outermost return begins after line 92's theme resolution. Find the top-level wrapper `<div>` of the loaded state (the element containing the `ref` wrapper) and insert the ribbon as its **first child**:

```jsx
      {showQrRibbon && (
        <div
          className="sticky top-0 z-40 flex items-center justify-center gap-3 px-4 py-2 text-xs"
          style={{ backgroundColor: theme.secondaryBg, color: theme.bodyText }}
        >
          <span>
            You're viewing a tribute to {data.fullName} ·{' '}
            <Link
              to="/honour?from=qr_ribbon"
              onClick={() => {
                captureLoopSurface('qr_ribbon')
                recordLoopEvent('loop_click', 'qr_ribbon', { memorialId: id })
              }}
              className="hover:underline"
              style={{ color: theme.heading }}
            >
              Created with FuneralPress
            </Link>
          </span>
          <button
            type="button"
            onClick={dismissQrRibbon}
            aria-label="Dismiss"
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      )}
```

Important: place it OUTSIDE the `contentRef` wrapper div so it is never captured in the PDF download (`handleDownload` renders `contentRef.current`).

- [ ] **Step 4: Verify**

Run: `npx vitest run` then `npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/QRCodePrintPage.jsx src/pages/MemorialPage.jsx
git commit -m "feat(loop): tag print QR urls with src=qr and greet scanners with a dismissible ribbon"
```

---

### Task 8: Worker — `GET /referrals/my-code`

**Files:**
- Modify: `workers/auth-api.js` (new handler near `handleTrackReferral` line ~666; route registration near line 3422; import at top)

- [ ] **Step 1: Import the rules module**

At the top of `workers/auth-api.js`, next to the existing `tierConfig` import (search for `from './tierConfig`), add:

```javascript
import {
  FAMILY_REWARD_PESEWAS,
  referralTypeFor,
  initialRewardStatus,
  canGrantReward,
  applyReferralDiscount,
} from './familyReferral.js'
```

(If `tierConfig` is imported without the `.js` extension, match that style.)

- [ ] **Step 2: Add the handler**

Insert directly above `async function handleTrackReferral` (line ~666):

```javascript
async function handleGetMyReferralCode(request, env, userId) {
  const user = await env.DB.prepare(
    'SELECT id, referral_code FROM users WHERE id = ? AND deleted_at IS NULL'
  ).bind(userId).first()
  if (!user) return error('User not found', 404, request)
  if (user.referral_code) return json({ code: user.referral_code }, 200, request)

  // Lazy generation: any user can refer (spec §2.5). The IP hash at creation
  // time supports the same-IP fraud check in handleTrackReferral.
  const code = generateReferralCode()
  const ipHash = await hashToken(getClientIP(request) || '')
  await env.DB.prepare(
    'UPDATE users SET referral_code = ?, referral_code_ip_hash = ? WHERE id = ?'
  ).bind(code, ipHash, userId).run()
  return json({ code }, 200, request)
}
```

Note: `users.referral_code` is shared with the partner program; partner-only logic everywhere filters on `is_partner = 1`, so non-partner codes are safe.

- [ ] **Step 3: Register the route**

In the authenticated routing block, after line 3422 (`if (method === 'POST' && path === '/referrals/track') ...`), add:

```javascript
      if (method === 'GET' && path === '/referrals/my-code') return await handleGetMyReferralCode(request, env, userId)
```

- [ ] **Step 4: Verify**

Run: `npx vitest run`
Expected: PASS (no worker regressions; this endpoint's pure logic is covered by Task 1's tests).

- [ ] **Step 5: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(referrals): GET /referrals/my-code with lazy code generation for all users"
```

---

### Task 9: Worker — family referral tracking + welcome credit

**Files:**
- Modify: `workers/auth-api.js` — replace `handleTrackReferral` (lines ~666–687)

- [ ] **Step 1: Replace the handler**

The current handler only accepts partner codes (`WHERE referral_code = ? AND is_partner = 1`). Replace the entire `handleTrackReferral` function with:

```javascript
async function handleTrackReferral(request, env, userId) {
  const { referralCode } = await request.json()
  if (!referralCode) return error('Missing referralCode', 400, request)

  const referrer = await env.DB.prepare(
    'SELECT id, is_partner, referral_code_ip_hash FROM users WHERE referral_code = ?'
  ).bind(referralCode).first()
  if (!referrer) return json({ ok: false, reason: 'invalid_code' }, 200, request)

  // Don't self-refer
  if (referrer.id === userId) return json({ ok: false, reason: 'self_referral' }, 200, request)

  // Check if already referred (one referrer per user, ever)
  const existing = await env.DB.prepare(
    'SELECT id FROM referrals WHERE referred_user_id = ?'
  ).bind(userId).first()
  if (existing) return json({ ok: false, reason: 'already_referred' }, 200, request)

  const type = referralTypeFor(referrer)
  const ipHash = await hashToken(getClientIP(request) || '')
  // Same-IP pairs go to admin review instead of auto-reward (spec §2.5)
  const rewardStatus = type === 'family'
    ? initialRewardStatus({ trackIpHash: ipHash, codeIpHash: referrer.referral_code_ip_hash })
    : null

  await env.DB.prepare(
    'INSERT INTO referrals (id, partner_id, referred_user_id, type, reward_status, ip_hash) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), referrer.id, userId, type, rewardStatus, ipHash).run()

  if (type === 'family') {
    // Welcome gift: one free design unlock for the referred family (spec §2.5).
    // Guard preserves -1 (unlimited) accounts.
    await env.DB.prepare(
      'UPDATE users SET credits_remaining = credits_remaining + 1 WHERE id = ? AND credits_remaining >= 0'
    ).bind(userId).run()
  }

  notifyAdmin(env, 'referral_tracked', `Referral tracked (${type}): code ${referralCode}`, { referralCode: referralCode || '', type })

  return json({ ok: true, type }, 200, request)
}
```

Preserved behavior: partner referrals insert exactly as before (`partner_id` = referrer for both types); the existing commission logic in `handlePaymentInitialize` reads `referrals.partner_id` and then checks the referrer's `partner_commission_override` — family referrers aren't partners, but to be precise, commission must only apply to partner-type referrals. **Also update the commission lookup** in `handlePaymentInitialize` (line ~824) from:

```javascript
  const referral = await env.DB.prepare('SELECT partner_id FROM referrals WHERE referred_user_id = ?').bind(userId).first()
```

to:

```javascript
  const referral = await env.DB.prepare("SELECT partner_id FROM referrals WHERE referred_user_id = ? AND type = 'partner'").bind(userId).first()
```

- [ ] **Step 2: Verify**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(referrals): family referral tracking with welcome credit and same-IP review flag"
```

---

### Task 10: Worker — referrer reward on referred user's first export

**Files:**
- Modify: `workers/auth-api.js` — new function above `handleUnlockDesign` (line ~1424); call inside `handleUnlockDesign` after the `unlocked_designs` INSERT (line ~1459)

- [ ] **Step 1: Add the grant function**

Insert directly above `async function handleUnlockDesign` (line ~1424):

```javascript
async function grantFamilyReferralReward(env, referredUserId) {
  // Reward fires only on the referred user's FIRST export (spec §2.5).
  const unlockCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM unlocked_designs WHERE user_id = ?'
  ).bind(referredUserId).first()
  if (!unlockCount || unlockCount.count !== 1) return

  const referral = await env.DB.prepare(
    "SELECT id, partner_id FROM referrals WHERE referred_user_id = ? AND type = 'family' AND reward_status = 'pending'"
  ).bind(referredUserId).first()
  if (!referral) return // none, already granted, capped, or held for review

  // Cap: max 10 granted rewards per referrer per rolling 12 months
  const granted = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM referrals WHERE partner_id = ? AND type = 'family' AND reward_status = 'granted' AND reward_granted_at >= datetime('now', '-365 days')"
  ).bind(referral.partner_id).first()
  if (!canGrantReward({ grantedLast12Months: granted?.count || 0 })) {
    await env.DB.prepare("UPDATE referrals SET reward_status = 'capped' WHERE id = ?").bind(referral.id).run()
    return
  }

  await env.DB.prepare(
    "UPDATE referrals SET reward_status = 'granted', reward_granted_at = datetime('now') WHERE id = ?"
  ).bind(referral.id).run()
  await env.DB.prepare(
    'UPDATE users SET referral_balance_pesewas = COALESCE(referral_balance_pesewas, 0) + ? WHERE id = ?'
  ).bind(FAMILY_REWARD_PESEWAS, referral.partner_id).run()

  notifyAdmin(env, 'referral_reward', 'Family referral reward granted: GHS 20', { referrerId: referral.partner_id })
}
```

- [ ] **Step 2: Call it from `handleUnlockDesign`**

After the `unlocked_designs` INSERT (line ~1457–1459) and before `const purchaseData = ...`, add:

```javascript
  // Family referral reward — never block the unlock on reward bookkeeping
  try {
    await grantFamilyReferralReward(env, userId)
  } catch (e) {
    console.error('[referral] reward grant failed', e)
  }
```

- [ ] **Step 3: Verify**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(referrals): grant GHS 20 referrer reward on referred family's first export"
```

---

### Task 11: Worker — apply referral balance at checkout

**Files:**
- Modify: `workers/auth-api.js` — `handlePaymentInitialize` (lines ~815–848) and `markOrderPaid` (lines ~850–870)

- [ ] **Step 1: Apply the discount in `handlePaymentInitialize`**

Change the user SELECT (line ~820) from:

```javascript
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first()
```

to:

```javascript
  const user = await env.DB.prepare('SELECT id, email, referral_balance_pesewas FROM users WHERE id = ?').bind(userId).first()
```

After the commission block (ends line ~832) and before the `reference` line, add:

```javascript
  // Referral balance auto-applies as a discount (spec §2.5). Commission (above)
  // stays computed on the full plan price.
  const { discount: referralDiscount, amount: chargeAmount } = applyReferralDiscount({
    balancePesewas: user.referral_balance_pesewas || 0,
    amountPesewas: planInfo.amount,
  })
```

Change the orders INSERT (lines ~837–840) from:

```javascript
  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, partner_id, commission_rate, commission_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, userId, plan, planInfo.amount, reference, partnerId, commissionRate, commissionAmount).run()
```

to:

```javascript
  await env.DB.prepare(
    `INSERT INTO orders (id, user_id, plan, amount_pesewas, paystack_reference, partner_id, commission_rate, commission_amount, referral_discount_pesewas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, userId, plan, chargeAmount, reference, partnerId, commissionRate, commissionAmount, referralDiscount).run()
```

And the response (lines ~842–847) from `amount: planInfo.amount,` to:

```javascript
    amount: chargeAmount,
```

This keeps the existing verify/webhook guards intact: they compare Paystack's charged amount against `order.amount_pesewas`, which now stores the discounted charge.

- [ ] **Step 2: Decrement the balance in `markOrderPaid`**

At the end of `markOrderPaid` (after the credits update, line ~868), add:

```javascript
  // Consume the referral balance only on confirmed payment
  if (order.referral_discount_pesewas > 0) {
    await env.DB.prepare(
      'UPDATE users SET referral_balance_pesewas = MAX(0, COALESCE(referral_balance_pesewas, 0) - ?) WHERE id = ?'
    ).bind(order.referral_discount_pesewas, order.user_id).run()
  }
```

(SQLite's scalar `MAX(a, b)` guards against double-decrement going negative; `markOrderPaid` is already idempotent via the `status === 'success'` early return.)

- [ ] **Step 3: Verify**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add workers/auth-api.js
git commit -m "feat(referrals): auto-apply referral balance as checkout discount, consume on payment"
```

---

### Task 12: Frontend — FamilyReferralCard + share surfaces (TDD)

**Files:**
- Create: `src/components/referral/FamilyReferralCard.jsx`
- Modify: `src/pages/MyDesignsPage.jsx` (dashboard surface)
- Modify: `src/components/editor/CheckoutDialog.jsx` (post-export surface; success-stage JSX lines 172–179; timeouts at lines ~75–77 and ~112–114)
- Test: `src/components/referral/__tests__/FamilyReferralCard.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/referral/__tests__/FamilyReferralCard.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const apiFetchMock = vi.fn()
vi.mock('../../../utils/apiClient', () => ({ apiFetch: (...args) => apiFetchMock(...args) }))

let mockUser = null
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser }),
}))

import FamilyReferralCard from '../FamilyReferralCard.jsx'

describe('FamilyReferralCard', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('renders nothing when logged out', () => {
    mockUser = null
    const { container } = render(<FamilyReferralCard />)
    expect(container.firstChild).toBeNull()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('fetches the code and shows the share link when logged in', async () => {
    mockUser = { id: 'u1', name: 'Ama' }
    apiFetchMock.mockResolvedValue({ code: 'FAMILY23' })
    render(<FamilyReferralCard />)
    expect(await screen.findByDisplayValue('https://funeralpress.org/?ref=FAMILY23')).toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledWith('/referrals/my-code')
    expect(screen.getByText(/they receive a free design/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/referral/__tests__/FamilyReferralCard.test.jsx`
Expected: FAIL — cannot find module `../FamilyReferralCard.jsx`

- [ ] **Step 3: Write the component**

```jsx
// src/components/referral/FamilyReferralCard.jsx
// Family referral share surface (spec §2.5). Mounted on the dashboard and the
// post-export success screen — never on memorial/grief pages.
import { useState, useEffect } from 'react'
import { Gift, Copy, Check } from 'lucide-react'
import { apiFetch } from '../../utils/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { recordLoopEvent } from '../../utils/loopAnalytics'
import { events } from '../../utils/analytics'

export default function FamilyReferralCard({ surface = 'referral_dashboard', compact = false }) {
  const user = useAuthStore((s) => s.user)
  const [code, setCode] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    apiFetch('/referrals/my-code')
      .then((d) => {
        setCode(d.code)
        recordLoopEvent('loop_impression', surface)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user || !code) return null
  const link = `https://funeralpress.org/?ref=${code}`

  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    events.referralLinkShared('copy')
    recordLoopEvent('loop_click', surface)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-card border border-border rounded-xl ${compact ? 'p-4' : 'p-5'} w-full`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Gift size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-card-foreground mb-1">
            Know a family who needs this?
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Share your link — they receive a free design, and you receive GHS 20
            toward your next order.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 min-w-0 px-3 py-2 bg-muted border border-input rounded-lg text-xs text-foreground truncate"
            />
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/referral/__tests__/FamilyReferralCard.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Mount on the dashboard**

In `src/pages/MyDesignsPage.jsx`, add to imports (after line 38):

```jsx
import FamilyReferralCard from '../components/referral/FamilyReferralCard'
```

In the JSX, insert `<FamilyReferralCard />` as the last child of the page's outermost content container (immediately before its closing tag at the end of the component's `return`), wrapped for spacing:

```jsx
      <div className="mt-8">
        <FamilyReferralCard />
      </div>
```

- [ ] **Step 6: Mount on the post-export success screen**

In `src/components/editor/CheckoutDialog.jsx`:

Add to imports:

```jsx
import FamilyReferralCard from '../referral/FamilyReferralCard'
```

Replace the success-stage block (lines 172–179):

```jsx
          {/* Success state */}
          {stage === 'success' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Check size={24} />
              </div>
              <p className="text-sm text-card-foreground">Download starting...</p>
            </div>
          )}
```

with:

```jsx
          {/* Success state */}
          {stage === 'success' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Check size={24} />
              </div>
              <p className="text-sm text-card-foreground">Download starting...</p>
              <FamilyReferralCard surface="referral_post_export" compact />
            </div>
          )}
```

Then extend both auto-close timeouts so the card is readable — in `handleUseCredit` (lines ~75–77) and in the payment `onSuccess` (lines ~112–114), change:

```jsx
      setTimeout(() => {
        closeCheckout()
      }, 1500)
```

to:

```jsx
      setTimeout(() => {
        closeCheckout()
      }, 6000)
```

(Two occurrences; the dialog stays manually closable throughout.)

- [ ] **Step 7: Verify**

Run: `npx vitest run` then `npm run build`
Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add src/components/referral/ src/pages/MyDesignsPage.jsx src/components/editor/CheckoutDialog.jsx
git commit -m "feat(referrals): family referral share card on dashboard and post-export success"
```

---

### Task 13: Signup loop attribution

**Files:**
- Modify: `src/stores/authStore.js` (imports; after `trackEvent('signup_completed', ...)` line ~89)

- [ ] **Step 1: Add imports**

`authStore.js` already imports from `../utils/referralTracker`. Next to that import, add:

```javascript
import { getStoredLoopSurface, clearStoredLoopSurface, recordLoopEvent } from '../utils/loopAnalytics'
```

- [ ] **Step 2: Report attribution at signup**

In `handleGoogleLogin`, directly after `trackEvent('signup_completed', { method: 'google' })` (line ~89), add:

```javascript
      // Loop attribution (spec §2.6): which growth surface brought this signup.
      // The token makes /analytics/event store user_id, enabling the
      // signup → first_design → purchase funnel joins in D1.
      const loopSurface = getStoredLoopSurface()
      if (loopSurface) {
        recordLoopEvent('loop_signup', loopSurface, {}, { token: data.accessToken })
        clearStoredLoopSurface()
      }
```

Then search `authStore.js` for any OTHER occurrence of `trackEvent('signup_completed'` (e.g., a phone+PIN login handler). Add the identical block after each occurrence found.

- [ ] **Step 3: Verify**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/stores/authStore.js
git commit -m "feat(loop): attribute signups to their growth-loop surface"
```

---

### Task 14: Final verification + deployment checklist

**Files:** none created; verification only.

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: ALL tests pass.

- [ ] **Step 2: Lint and build**

Run: `npm run lint` (if the script exists; check `package.json`) and `npm run build`
Expected: no errors.

- [ ] **Step 3: Manual smoke check (local dev)**

Run: `npm run dev`, then verify in the browser:
1. `/honour` renders with three pathway cards; `/honour?from=memorial_footer` fires a `loop_landing` request to `/analytics/event` (Network tab).
2. A memorial page shows the new footer line; clicking "FuneralPress" navigates to `/honour?from=memorial_footer`.
3. A memorial page visited with `?src=qr` shows the ribbon once; dismiss persists across reloads.
4. Signing a guest book while logged out shows the condolence prompt once per slug.
5. `/my-designs` (logged in) shows the referral card with a copyable link.

- [ ] **Step 4: Deployment notes (require owner/production access — do NOT run unattended)**

```bash
# Apply migration to staging, verify, then production:
npx wrangler d1 execute funeralpress-db-staging --file=workers/migrations/migration-family-referrals.sql --remote
npx wrangler d1 execute funeralpress-db --file=workers/migrations/migration-family-referrals.sql --remote
# auth-api deploys via the existing GitHub Actions pipeline on merge to main.
```

The migration MUST be applied to each environment BEFORE the new auth-api code is deployed there (the new code writes columns the migration creates; the old code ignores them, so migration-first is safe).

- [ ] **Step 5: Commit any remaining changes and report**

Report the K-factor definition for the records (spec §2.6): loop-attributed signups (`loop_signup` events) ÷ funerals created in the same period — both now queryable from `analytics_events`.

---

## Spec coverage map (§ → Task)

| Spec requirement | Task |
|---|---|
| §2.1 voice constraint | Copy fixed in Tasks 4–7, 12 |
| §2.2 memorial footer + `/honour` | Tasks 4, 5 |
| §2.3 post-condolence prompt | Task 6 |
| §2.4 QR `?src=qr` + ribbon | Task 7 |
| §2.5 referral mechanics (give-get, first-export grant, cap, fraud flags, surfaces) | Tasks 1, 2, 8, 9, 10, 11, 12 |
| §2.6 per-surface analytics + signup attribution | Tasks 3, 5–7, 12, 13 |

Out of scope for this plan (later Phase A follow-ups or admin work): an admin UI for `reward_status='review'` rows (admins are notified via `notifyAdmin` for now), and the §5.3 weekly report worker (scheduled with Phase B/C plans).
