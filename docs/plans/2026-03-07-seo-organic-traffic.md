# FuneralPress SEO & Organic Traffic Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Drive organic traffic to funeralpress.org at zero cost through SEO, content pages, structured data, and community sharing.

**Architecture:** Add SEO infrastructure (sitemap, robots.txt, JSON-LD, per-route meta tags), create keyword-targeted content pages, build a blog/resource hub, and optimize for social sharing. Since this is a React SPA, use a lightweight `<Helmet>`-style approach for dynamic meta tags and generate a static sitemap.

**Tech Stack:** React, react-helmet-async, Cloudflare Pages, static files

---

## Phase 1: Technical SEO Foundation

### Task 1: Install react-helmet-async for dynamic meta tags

**Files:**
- Modify: `package.json`
- Modify: `src/App.jsx`

**Step 1: Install the package**
```bash
npm install react-helmet-async
```

**Step 2: Wrap App with HelmetProvider**

In `src/App.jsx`, import `HelmetProvider` from `react-helmet-async` and wrap the `<BrowserRouter>` contents.

**Step 3: Verify build**
```bash
npx vite build
```

---

### Task 2: Add robots.txt

**Files:**
- Create: `public/robots.txt`

**Content:**
```
User-agent: *
Allow: /

Sitemap: https://funeralpress.org/sitemap.xml

# Disallow private/app pages
Disallow: /editor
Disallow: /poster-editor
Disallow: /invitation-editor
Disallow: /thankyou-editor
Disallow: /booklet-editor
Disallow: /banner-editor
Disallow: /collage-maker
Disallow: /my-designs
Disallow: /partner-dashboard
Disallow: /admin
Disallow: /receipt
```

---

### Task 3: Add sitemap.xml

**Files:**
- Create: `public/sitemap.xml`

Include all public-facing pages:
- `/` (landing)
- `/themes` (theme gallery)
- `/budget-planner`
- `/reminders`
- `/qr-cards`
- `/wreath-cards`
- All SEO content pages (Tasks 7-9)
- All blog posts (Task 10)

Set `<lastmod>` to current date, `<changefreq>` weekly for content, monthly for tools.

---

### Task 4: Add JSON-LD structured data to index.html

**Files:**
- Modify: `index.html`

Add `Organization` and `WebSite` schema:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FuneralPress",
  "url": "https://funeralpress.org",
  "logo": "https://funeralpress.org/logo.svg",
  "description": "Design premium funeral brochures, obituary posters, memorial booklets, and more.",
  "sameAs": []
}
```

Add `WebSite` with `SearchAction` potential.

---

### Task 5: Create SEO helper component

**Files:**
- Create: `src/components/seo/PageMeta.jsx`

A reusable component that sets:
- `<title>`
- `<meta name="description">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:url">`
- `<link rel="canonical">`

Usage: `<PageMeta title="..." description="..." path="/..." />`

---

### Task 6: Add PageMeta to all existing public pages

**Files:**
- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/pages/ThemeGalleryPage.jsx`
- Modify: `src/pages/BudgetPlannerPage.jsx`
- Modify: `src/pages/ReminderPage.jsx`
- Modify: `src/pages/QRCodePrintPage.jsx`
- Modify: `src/pages/WreathCardsPage.jsx`
- Modify: `src/pages/FlipbookPage.jsx`

Each page gets a unique, keyword-rich title and description. Examples:
- Landing: "FuneralPress — Design Beautiful Funeral Brochures, Posters & Booklets Online"
- Themes: "Funeral Brochure Templates — 11 Elegant Themes | FuneralPress"
- Budget: "Funeral Budget Planner — Plan Funeral Costs in Ghana | FuneralPress"

---

## Phase 2: SEO Content Pages (High Intent Keywords)

### Task 7: Create funeral brochure templates showcase page

**Files:**
- Create: `src/pages/seo/FuneralBrochureTemplatesPage.jsx`
- Modify: `src/App.jsx` (add route `/funeral-brochure-templates`)
- Modify: `public/sitemap.xml`

**Target keywords:** "funeral brochure template", "obituary brochure design", "funeral programme template Ghana"

**Content:**
- H1: "Funeral Brochure Templates"
- Show all 11 themes as a visual grid with names + descriptions
- Each theme card has descriptive alt text
- Brief intro paragraph about designing funeral brochures
- CTA: "Start Designing" button linking to `/editor`
- FAQ section (JSON-LD FAQPage schema):
  - "How do I design a funeral brochure?"
  - "Can I print my funeral brochure?"
  - "How much does a funeral brochure cost?"

---

### Task 8: Create funeral poster templates page

**Files:**
- Create: `src/pages/seo/FuneralPosterTemplatesPage.jsx`
- Modify: `src/App.jsx` (add route `/funeral-poster-templates`)
- Modify: `public/sitemap.xml`

**Target keywords:** "funeral poster design", "obituary poster template", "death announcement poster Ghana"

Same structure as Task 7 but for posters.

---

### Task 9: Create funeral invitation & booklet pages

**Files:**
- Create: `src/pages/seo/FuneralInvitationTemplatesPage.jsx`
- Create: `src/pages/seo/FuneralBookletTemplatesPage.jsx`
- Modify: `src/App.jsx` (add routes)
- Modify: `public/sitemap.xml`

**Target keywords:**
- "funeral invitation card template", "funeral invitation design Ghana"
- "funeral booklet template", "order of service booklet", "funeral programme booklet Ghana"

---

## Phase 3: Blog / Resource Hub

### Task 10: Create blog index page and first 5 articles

**Files:**
- Create: `src/pages/blog/BlogIndexPage.jsx`
- Create: `src/pages/blog/BlogPostPage.jsx`
- Create: `src/data/blogPosts.js` (static blog data)
- Modify: `src/App.jsx` (add routes `/blog` and `/blog/:slug`)
- Modify: `public/sitemap.xml`

**Blog posts (static, SEO-optimized):**

1. **"How to Design a Funeral Brochure in Ghana — Complete Guide"**
   - Slug: `/blog/how-to-design-funeral-brochure-ghana`
   - Keywords: "funeral brochure Ghana", "how to design obituary brochure"
   - ~800 words, step-by-step with screenshots/descriptions

2. **"Methodist Funeral Order of Service — Template & Guide"**
   - Slug: `/blog/methodist-funeral-order-of-service`
   - Keywords: "Methodist funeral programme", "Methodist order of service Ghana"

3. **"Catholic Requiem Mass Programme — Template & Guide"**
   - Slug: `/blog/catholic-requiem-mass-programme`
   - Keywords: "Catholic requiem mass programme", "Catholic funeral service Ghana"

4. **"How Much Does Funeral Printing Cost in Ghana?"**
   - Slug: `/blog/funeral-printing-cost-ghana`
   - Keywords: "funeral printing cost", "funeral brochure printing Accra"

5. **"Presbyterian Funeral Service Programme — Template & Guide"**
   - Slug: `/blog/presbyterian-funeral-service-programme`
   - Keywords: "Presbyterian funeral programme Ghana"

Each post includes:
- JSON-LD `Article` schema
- PageMeta with unique title/description
- Internal links to relevant editors
- CTA to start designing

---

### Task 11: Add blog link to landing page navigation

**Files:**
- Modify: `src/pages/LandingPage.jsx`

Add a visible "Resources" or "Guides" link in the landing page that navigates to `/blog`. This gives the blog internal link equity from the homepage.

---

## Phase 4: Social Sharing & Backlinks

### Task 12: Improve OG tags for shareable pages

**Files:**
- Modify: `src/pages/MemorialPage.jsx`
- Modify: `src/pages/FlipbookPage.jsx`
- Modify: `src/pages/LiveServicePage.jsx`

These are public-facing pages that get shared. Add dynamic OG tags:
- `og:title` — deceased's name + "Memorial"
- `og:description` — tribute snippet
- `og:image` — memorial cover image if available

This makes shared links look rich on WhatsApp, Facebook, Twitter.

---

### Task 13: Add share-friendly preview images

**Files:**
- Create: `public/og-image.jpg` (1200x630 default OG image)
- Modify: `index.html` (add `og:image` meta tag)

Design a default social preview image showing the FuneralPress brand + a sample brochure. This is used when no page-specific image is available.

---

### Task 14: Ghana directory listing content page

**Files:**
- Create: `docs/seo/directory-listings.md`

Document with ready-to-submit listing info for:
- Ghana Yellow Pages
- GhanaWeb Business Directory
- Ghana Business Directory (.com.gh)
- Graphic Design directories

Each entry pre-filled with: business name, description, category, URL, contact info — ready for manual submission.

---

## Phase 5: WhatsApp & Community Optimization

### Task 15: Add UTM tracking to partner/WhatsApp shared links

**Files:**
- Modify: `src/components/partner/WhatsAppTemplates.jsx`

Append UTM parameters to all shareable URLs:
- `?utm_source=whatsapp&utm_medium=partner&utm_campaign=referral`

This lets you track which channels drive traffic via Google Analytics or Cloudflare Analytics.

---

### Task 16: Ensure memorial/flipbook pages have FuneralPress branding + backlink

**Files:**
- Modify: `src/pages/MemorialPage.jsx`
- Modify: `src/pages/FlipbookPage.jsx`

Add a subtle "Created with FuneralPress" footer link on public memorial and flipbook pages. Every shared memorial becomes a backlink and brand impression.

---

## Phase 6: SPA Prerendering for Search Engines

### Task 17: Add prerender middleware via Cloudflare Worker

**Files:**
- Create: `workers/prerender-middleware.js` (or modify existing worker)

Detect bot user-agents (Googlebot, Bingbot, etc.) and serve a prerendered version of the page. Options:
- Use `prerender.io` free tier (250 pages/month)
- Or use a lightweight SSR approach with `@cloudflare/pages-plugin-seo`

This is critical because Google can render JS but often indexes SPA content poorly. Prerendering ensures all SEO pages, blog posts, and template galleries are fully indexed.

---

## Summary

| Phase | Tasks | Impact |
|-------|-------|--------|
| 1. Technical SEO | 1-6 | Foundation — sitemap, robots, meta tags, structured data |
| 2. Content Pages | 7-9 | Target high-intent "funeral template" keywords |
| 3. Blog | 10-11 | Long-tail keywords, establish authority |
| 4. Social/Backlinks | 12-14 | Rich sharing, directory backlinks |
| 5. WhatsApp/Community | 15-16 | Track referrals, brand impressions |
| 6. Prerendering | 17 | Ensure Google indexes all content |

**Execution order:** Phase 1 first (foundation), then Phase 2+3 in parallel, then 4+5+6.
