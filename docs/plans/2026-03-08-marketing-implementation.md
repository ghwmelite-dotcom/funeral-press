# Marketing Playbook Technical Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all actionable technical items from the 7-stream marketing playbook — SEO meta tags, structured data, GA4 tracking, social proof, PDF branding, and referral links.

**Architecture:** Update PageMeta component and all page usages with optimized SEO titles/descriptions from Stream 2. Add GA4 script to index.html and create a lightweight analytics utility for custom events. Add social proof counter to landing page hero. Add "Designed with FuneralPress" branding to PDF back covers and memorial page footer. Enhance sitemap and robots.txt.

**Tech Stack:** React 19, react-helmet-async, @react-pdf/renderer, Vite 7, TailwindCSS

---

### Task 1: Update SEO Title Tags & Meta Descriptions Across All Pages

**Files:**
- Modify: `src/pages/LandingPage.jsx:442-446`
- Modify: `src/pages/ThemeGalleryPage.jsx:26-28`
- Modify: `src/pages/BudgetPlannerPage.jsx:35-37`
- Modify: `src/pages/ReminderPage.jsx:16-18`
- Modify: `src/pages/HymnLibraryPage.jsx:104-106`
- Modify: `src/pages/VenueDirectoryPage.jsx:89-91`
- Modify: `src/pages/blog/BlogIndexPage.jsx:8-10`
- Modify: `src/pages/seo/FuneralBrochureTemplatesPage.jsx:74-76`
- Modify: `src/pages/seo/FuneralPosterTemplatesPage.jsx:72-74`
- Modify: `src/pages/seo/FuneralInvitationTemplatesPage.jsx:72-74`
- Modify: `src/pages/seo/FuneralBookletTemplatesPage.jsx:70-72`

**What to do:**

Update each page's `<PageMeta>` with the optimized titles and descriptions from `docs/marketing/stream-2-seo.md` Section 2. Here are the exact values:

| Page File | New Title | New Description |
|-----------|-----------|-----------------|
| LandingPage.jsx | FuneralPress — Ghana's All-in-One Funeral Design Platform | Design funeral brochures, posters, invitations, and memorial pages online. Ghana's most trusted funeral planning platform. Start designing free today. |
| ThemeGalleryPage.jsx | Funeral Design Templates — Brochures, Posters & More \| FuneralPress | Browse 100+ professionally designed funeral templates. Brochures, posters, invitations, booklets, and memorial cards. Customise instantly for your loved one. |
| BudgetPlannerPage.jsx | Funeral Budget Planner Ghana — Track Every Cost \| FuneralPress | Plan your funeral budget with our free cost tracker. Covers venue, catering, casket, transport, and more. Built for Ghanaian funeral costs and customs. |
| ReminderPage.jsx | Funeral Anniversary Reminders — Never Forget a Date \| FuneralPress | Set automatic anniversary and remembrance date reminders for your loved ones. Get WhatsApp or email notifications before each memorial date arrives. |
| HymnLibraryPage.jsx | 11,000+ Funeral Hymns — Lyrics & Song Library \| FuneralPress | Find the perfect funeral hymns. Browse 11,000+ hymn lyrics including popular Ghanaian, Akan, Twi, and English funeral songs. Search by title or first line. |
| VenueDirectoryPage.jsx | Funeral Venues Directory Ghana — Find Grounds & Halls \| FuneralPress | Search funeral venues across Ghana. Browse funeral grounds, church halls, and reception venues in Accra, Kumasi, Takoradi, and more. Contact details included. |
| BlogIndexPage.jsx | FuneralPress Blog — Funeral Planning Tips & Guides | Expert guides on funeral planning in Ghana. Learn about costs, customs, brochure design tips, hymn selections, and how to honour your loved ones beautifully. |
| FuneralBrochureTemplatesPage.jsx | Funeral Brochure Templates — Design & Download Free \| FuneralPress | Choose from beautifully designed funeral brochure templates. Customise with photos, hymns, and tributes. Download as PDF or share digitally. Start free. |
| FuneralPosterTemplatesPage.jsx | Funeral Poster Templates — Create Stunning Designs \| FuneralPress | Design funeral and burial posters online. Professional templates you can customise in minutes. Add photos, dates, venue details. Download high-quality PDF. |
| FuneralInvitationTemplatesPage.jsx | Funeral Invitation Templates — Announce with Dignity \| FuneralPress | Create funeral and burial invitation cards online. Beautiful templates for death announcements, funeral invitations, and memorial service notices. Share via WhatsApp. |
| FuneralBookletTemplatesPage.jsx | Order of Service Booklet Templates — Design Online \| FuneralPress | Design funeral order of service booklets with our easy editor. Add hymns, tributes, programme of events, and photos. Print-ready PDF download included. |

Also update `index.html` static meta tags:
- title: "FuneralPress — Ghana's All-in-One Funeral Design Platform"
- description: Same as LandingPage description
- og:title: Same
- og:description: Same
- twitter:title/description: Same

**Step 1:** Update each PageMeta usage with new title and description values.
**Step 2:** Update index.html static meta tags.
**Step 3:** Run `npm run build` to verify no errors.
**Step 4:** Commit: `feat(seo): optimize title tags and meta descriptions for all pages`

---

### Task 2: Enhance PageMeta Component — Add twitter:image Tag

**Files:**
- Modify: `src/components/seo/PageMeta.jsx`

**What to do:**

Add the missing `twitter:image` meta tag to the PageMeta component:

```jsx
<meta name="twitter:image" content={ogImage} />
```

Add it after the existing `twitter:description` line (line 19).

**Step 1:** Add the twitter:image meta tag.
**Step 2:** Run `npm run build` to verify.
**Step 3:** Commit: `fix(seo): add missing twitter:image meta tag to PageMeta`

---

### Task 3: Add WebApplication JSON-LD Schema to index.html

**Files:**
- Modify: `index.html:52-65`

**What to do:**

Add a SoftwareApplication schema after the existing WebSite schema. This helps Google understand what FuneralPress is:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FuneralPress",
  "url": "https://funeralpress.org",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "GHS"
  },
  "description": "Design funeral brochures, posters, invitations, and memorial pages online. Ghana's most trusted funeral planning platform.",
  "screenshot": "https://funeralpress.org/og-image.svg",
  "featureList": "Funeral Brochure Designer, Memorial Pages, Obituary Creator, Budget Planner, 11000+ Hymn Library, QR Code Cards"
}
</script>
```

Insert this after the closing `</script>` tag of the WebSite schema (after line 65).

**Step 1:** Add the SoftwareApplication schema.
**Step 2:** Run `npm run build` to verify valid HTML.
**Step 3:** Commit: `feat(seo): add SoftwareApplication JSON-LD schema`

---

### Task 4: Enhance robots.txt and sitemap.xml

**Files:**
- Modify: `public/robots.txt`
- Modify: `public/sitemap.xml`

**What to do:**

**robots.txt** — Add disallow for additional private routes and crawl delay:
```
Disallow: /partner-dashboard
Disallow: /receipt
Disallow: /collage-maker
Disallow: /aseda-editor
Disallow: /gallery-creator
Disallow: /gallery-editor/
Disallow: /guest-book-creator
Disallow: /obituary-creator
Disallow: /oneweek-editor
Disallow: /banner-editor
Disallow: /booklet-editor
Disallow: /thankyou-editor
Disallow: /invitation-editor
Disallow: /anniversaries
```

**sitemap.xml** — Add missing public pages that aren't currently listed:
- `/hymns` (priority 0.8, monthly)
- `/venues` (priority 0.7, monthly)
- `/funeral-poster-templates` (priority 0.9, weekly)
- `/funeral-invitation-templates` (priority 0.9, weekly)
- `/funeral-booklet-templates` (priority 0.9, weekly)
- `/budget-planner` (priority 0.8, monthly)
- `/reminders` (priority 0.6, monthly)

**Step 1:** Update robots.txt with new disallow rules.
**Step 2:** Add missing pages to sitemap.xml.
**Step 3:** Commit: `feat(seo): enhance robots.txt and sitemap with missing pages`

---

### Task 5: Add GA4 Analytics with Custom Event Tracking

**Files:**
- Modify: `index.html` (add GA4 script tag)
- Create: `src/utils/analytics.js` (event tracking utility)
- Modify: `src/pages/LandingPage.jsx` (track theme_selected)
- Modify: `src/pages/BudgetPlannerPage.jsx` (track budget_planner_used)
- Modify: `src/pages/QRCodePrintPage.jsx` (track qr_code_generated)

**What to do:**

**Step 1:** Add GA4 script to `index.html` `<head>` (before closing `</head>`):

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Note: User must replace `G-XXXXXXXXXX` with their actual GA4 Measurement ID.

**Step 2:** Create `src/utils/analytics.js`:

```js
// Lightweight GA4 event tracking utility
// Events defined per Stream 6 marketing playbook

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

// Pre-defined events from marketing playbook
export const events = {
  brochureStarted: () => trackEvent('brochure_started'),
  brochureCompleted: (format) => trackEvent('brochure_completed', { format }),
  memorialPageCreated: () => trackEvent('memorial_page_created'),
  memorialPageShared: (method) => trackEvent('memorial_page_shared', { method }),
  obituaryCreated: () => trackEvent('obituary_created'),
  budgetPlannerUsed: () => trackEvent('budget_planner_used'),
  qrCodeGenerated: () => trackEvent('qr_code_generated'),
  signupCompleted: (method) => trackEvent('signup_completed', { method }),
  referralLinkShared: (method) => trackEvent('referral_link_shared', { method }),
  themeSelected: (theme) => trackEvent('theme_selected', { theme }),
}
```

**Step 3:** Add event calls to key user actions:
- In BudgetPlannerPage: call `events.budgetPlannerUsed()` when user saves/downloads budget
- In QRCodePrintPage: call `events.qrCodeGenerated()` when QR is generated
- In LandingPage: call `events.themeSelected(themeName)` when user picks a theme

**Step 4:** Run `npm run build` to verify.
**Step 5:** Commit: `feat(analytics): add GA4 script and custom event tracking utility`

---

### Task 6: Add Social Proof Counter to Landing Page

**Files:**
- Modify: `src/pages/LandingPage.jsx` (after hero CTAs, before product pills ~line 528)

**What to do:**

Add a subtle stats bar between the hero CTA buttons and the product pills showing social proof numbers. Use hardcoded initial values (these get updated manually as the platform grows):

```jsx
{/* Social proof */}
<div className="flex items-center gap-6 mt-6 justify-center lg:justify-start text-muted-foreground">
  <div className="flex items-center gap-1.5 text-sm">
    <Users size={14} className="text-primary" />
    <span className="font-semibold text-foreground">500+</span> families served
  </div>
  <div className="w-px h-4 bg-border" />
  <div className="flex items-center gap-1.5 text-sm">
    <FileText size={14} className="text-primary" />
    <span className="font-semibold text-foreground">2,000+</span> designs created
  </div>
</div>
```

Place this right after the closing `</div>` of the CTA buttons flex container (after line 527) and before the product pills container.

**Step 1:** Add social proof counter markup.
**Step 2:** Verify visually with `npm run dev`.
**Step 3:** Commit: `feat(landing): add social proof counter to hero section`

---

### Task 7: Add "Designed with FuneralPress" Branding

**Files:**
- Modify: `src/components/pdf/BackCoverPage.jsx` (add branding after designer credit ~line 91)
- Modify: `src/pages/MemorialPage.jsx` (add footer branding after content)

**What to do:**

**PDF Back Cover (BackCoverPage.jsx):**

After the `designerCredit` block (line 91) and before the `memorialQrCode` block (line 93), add:

```jsx
<Text style={{
  fontFamily: 'Cormorant', fontSize: 6,
  color: theme.subtleText, textAlign: 'center',
  opacity: 0.4, marginTop: data.designerCredit ? 6 : 20, letterSpacing: 0.5,
}}>
  Designed with FuneralPress — funeralpress.org
</Text>
```

**Memorial Page Footer (MemorialPage.jsx):**

Find the end of the memorial content (the closing `</div>` of `contentRef`). After it, add a subtle footer:

```jsx
{/* FuneralPress branding */}
<div className="max-w-2xl mx-auto px-4 py-8 text-center">
  <a
    href="https://funeralpress.org"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs opacity-40 hover:opacity-60 transition-opacity"
    style={{ color: theme.subtleText }}
  >
    Created with FuneralPress
  </a>
</div>
```

**Step 1:** Add branding text to BackCoverPage.jsx.
**Step 2:** Add branding footer to MemorialPage.jsx.
**Step 3:** Run `npm run build` to verify.
**Step 4:** Commit: `feat(branding): add "Designed with FuneralPress" to PDFs and memorial pages`

---

### Task 8: Build Referral Link Sharing UI

**Files:**
- Modify: `src/pages/LandingPage.jsx` (add referral sharing section for logged-in users)
- Modify: `src/stores/authStore.js` (add referral code getter)

**What to do:**

For logged-in users, add a small referral sharing card in the landing page (after the partner program section). The referral code should be the user's partner code if they have one, or a generated code from their user ID.

**In authStore.js**, add a computed getter:
```js
getReferralLink: () => {
  const user = get().user
  if (!user) return null
  const code = user.referralCode || user.partnerCode || user.id
  return `https://funeralpress.org/?ref=${code}`
}
```

**In LandingPage.jsx**, for logged-in users, add a referral CTA after the partner section:

```jsx
{user && (
  <div className="bg-card border border-border rounded-xl p-6 mb-12 text-center">
    <h3 className="text-lg font-semibold text-foreground mb-2">Share FuneralPress</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Help a family in need — share your personal link
    </p>
    <div className="flex items-center gap-2 max-w-md mx-auto">
      <input
        readOnly
        value={referralLink}
        className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground"
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(referralLink)
          // show copied feedback
        }}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
      >
        Copy
      </button>
    </div>
  </div>
)}
```

Import `events` from analytics.js and call `events.referralLinkShared('copy')` on copy.

**Step 1:** Add `getReferralLink` to authStore.
**Step 2:** Add referral sharing UI to LandingPage.
**Step 3:** Wire up analytics event.
**Step 4:** Run `npm run build` to verify.
**Step 5:** Commit: `feat(growth): add referral link sharing UI for logged-in users`
