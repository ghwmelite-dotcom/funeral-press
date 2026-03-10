# FuneralPress

**The all-in-one funeral planning platform for Ghana.**

FuneralPress helps families, funeral homes, and churches plan dignified funerals with modern digital tools — from brochure design to live streaming, memorial pages to budget tracking.

**Live at [funeralpress.org](https://funeralpress.org)**

---

## Features

### Design Tools
- **Brochure Editor** — Professionally designed templates for funeral brochures, invitations, programme booklets, thank-you cards, banners, and posters
- **One-Week Observance Cards** — Create and share traditional one-week observation cards digitally
- **Aseda (Thanksgiving) Editor** — Design thanksgiving cloth labels
- **Obituary Creator** — Guided step-by-step obituary writing with published pages
- **Collage & Wreath Card Makers** — Visual tributes and memorial designs

### Memorial & Sharing
- **Memorial Pages** — Permanent online tributes with photos, stories, and shareable links
- **Digital Guest Books** — Collect condolence messages and tributes from any device
- **Photo Galleries** — Celebrate life through curated photo collections
- **Live Service Streaming** — Let distant family participate in real time
- **WhatsApp & QR Sharing** — Share designs and pages instantly

### Planning Tools
- **Budget Planner** — Track every cedi with categorized expense management
- **Anniversary & Reminder Tracker** — Never miss a memorial date
- **Venue Directory** — Find funeral venues across Ghana
- **Hymn Library** — Search and browse hymns for services

### Partner Program
- **Institutional Packages** — Bulk plans for funeral homes and churches
- **White-Label Tools** — Partners offer FuneralPress features under their own brand
- **Referral Tracking** — Commission-based partner earnings
- **Partner Dashboard** — Manage referrals, clients, and earnings

### Admin & Operations
- **Admin Dashboard** — Manage users, orders, partners, designs, and print orders
- **Real-Time Notifications** — In-app + email alerts for all user activities via Resend
- **Print Fulfillment** — Multi-region print ordering with delivery across Ghana
- **X (Twitter) Auto-Poster** — Automated social media with cron-triggered tweet queue

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Zustand, React Router 7, Tailwind CSS 3 |
| **Backend** | Cloudflare Workers (serverless) |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 (images), KV (key-value) |
| **AI** | Cloudflare Workers AI (Llama 3.1 — brochure writing) |
| **Payments** | Paystack (Ghana cedis) |
| **Auth** | Google OAuth 2.0 + JWT |
| **Email** | Resend (transactional notifications) |
| **Social** | X/Twitter API v2 (OAuth 1.0a auto-posting) |
| **PDF** | React PDF Renderer |
| **Build** | Vite, PWA (vite-plugin-pwa) |
| **Hosting** | Cloudflare Pages |

---

## Project Structure

```
funeral-press/
├── src/
│   ├── components/       # React components
│   │   ├── admin/        # Admin dashboard tabs + notifications
│   │   ├── auth/         # Login, user menu
│   │   ├── editor/       # Brochure editor UI
│   │   ├── landing/      # Homepage components
│   │   ├── layout/       # Navigation, bottom nav, transitions
│   │   ├── oneweek-editor/  # One-week observance editor
│   │   ├── oneweek-pdf/  # One-week PDF generation
│   │   ├── partner/      # Partner tools (WhatsApp templates)
│   │   ├── pwa/          # PWA install prompt, progress bar
│   │   └── ui/           # Shared UI primitives
│   ├── pages/            # Route pages
│   ├── stores/           # Zustand state management
│   ├── utils/            # Helpers and default data
│   ├── data/             # Blog posts, hymns, venues
│   └── hooks/            # Custom React hooks
├── workers/
│   ├── auth-api.js       # Main API (auth, designs, payments, admin)
│   ├── memorial-page-api.js   # Memorial pages (KV + D1)
│   ├── live-service-api.js    # Live service pages (KV + D1)
│   ├── share-api.js      # Brochure sharing (KV)
│   ├── twitter-bot.js    # X auto-poster (cron + D1)
│   └── brochure-ai-writer.js  # AI-powered content generation
├── social-media-kit/     # 30-day tweet kit with branded images
├── docs/                 # Plans, SEO docs, marketing
└── public/               # Static assets
```

---

## Workers (API)

| Worker | Purpose | Bindings |
|--------|---------|----------|
| `funeralpress-auth-api` | Auth, designs, payments, admin, notifications | D1, R2, Resend |
| `brochure-memorial-api` | Memorial page CRUD | KV, D1, Resend |
| `brochure-live-service-api` | Live service page CRUD | KV, D1, Resend |
| `funeralpress-share-api` | Brochure share codes | KV |
| `funeralpress-twitter-bot` | Automated tweets (cron) | D1 |
| `brochure-ai-writer` | AI obituary/tribute writing | Workers AI |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy a worker (example)
cd workers
npx wrangler deploy --config auth-api-wrangler.toml
```

---

## Environment

### Frontend (.env)
```
VITE_API_URL=https://funeralpress-auth-api.ghwmelite.workers.dev
```

### Worker Secrets (set via wrangler)
```
JWT_SECRET
GOOGLE_CLIENT_ID
PAYSTACK_SECRET_KEY
RESEND_API_KEY
TWITTER_API_KEY
TWITTER_API_SECRET
TWITTER_ACCESS_TOKEN
TWITTER_ACCESS_TOKEN_SECRET
```

---

## Pricing (Ghana Cedis)

| Plan | Price | Credits |
|------|-------|---------|
| Single | GHS 35 | 1 design |
| Bundle | GHS 75 | 3 designs |
| Suite | GHS 120 | Unlimited |
| Bulk 10 | GHS 250 | 10 designs (institutional) |
| Bulk 25 | GHS 500 | 25 designs (institutional) |
| Bulk 50 | GHS 800 | 50 designs (institutional) |

---

## License

Proprietary. All rights reserved.

---

Built with care for the families of Ghana.
