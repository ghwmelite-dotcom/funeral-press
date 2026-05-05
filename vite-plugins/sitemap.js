import { writeFileSync } from 'fs'
import { resolve } from 'path'

const BASE = 'https://funeralpress.org'

// Static routes — public, indexable, content-bearing.
// Ordered roughly by importance (homepage first, then product pages, then content).
// Mirrors public routes registered in src/App.jsx that aren't user-specific or
// dynamic (no /memorial/:id, /gallery/:slug, /admin, /partner-dashboard, etc.).
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  // Product landing pages (high-leverage SEO)
  { path: '/funeral-brochure-designer', changefreq: 'weekly', priority: 0.9 },
  { path: '/funeral-poster-maker', changefreq: 'weekly', priority: 0.9 },
  { path: '/memorial-page-creator', changefreq: 'weekly', priority: 0.9 },
  { path: '/funeral-programme-booklet', changefreq: 'weekly', priority: 0.9 },
  // Template gallery pages
  { path: '/funeral-brochure-templates', changefreq: 'weekly', priority: 0.8 },
  { path: '/funeral-poster-templates', changefreq: 'weekly', priority: 0.8 },
  { path: '/funeral-invitation-templates', changefreq: 'weekly', priority: 0.8 },
  { path: '/funeral-booklet-templates', changefreq: 'weekly', priority: 0.8 },
  // Editor entry points
  { path: '/editor', changefreq: 'monthly', priority: 0.7 },
  { path: '/poster-editor', changefreq: 'monthly', priority: 0.7 },
  { path: '/invitation-editor', changefreq: 'monthly', priority: 0.7 },
  { path: '/booklet-editor', changefreq: 'monthly', priority: 0.7 },
  { path: '/banner-editor', changefreq: 'monthly', priority: 0.7 },
  { path: '/thankyou-editor', changefreq: 'monthly', priority: 0.6 },
  { path: '/oneweek-editor', changefreq: 'monthly', priority: 0.6 },
  { path: '/aseda-editor', changefreq: 'monthly', priority: 0.6 },
  // Tools
  { path: '/budget-planner', changefreq: 'monthly', priority: 0.6 },
  { path: '/reminders', changefreq: 'monthly', priority: 0.6 },
  { path: '/collage-maker', changefreq: 'monthly', priority: 0.6 },
  { path: '/qr-cards', changefreq: 'monthly', priority: 0.6 },
  { path: '/wreath-cards', changefreq: 'monthly', priority: 0.6 },
  { path: '/programme', changefreq: 'monthly', priority: 0.6 },
  // Content
  { path: '/themes', changefreq: 'weekly', priority: 0.6 },
  { path: '/hymns', changefreq: 'weekly', priority: 0.6 },
  { path: '/venues', changefreq: 'weekly', priority: 0.6 },
  { path: '/blog', changefreq: 'weekly', priority: 0.7 },
  // Auxiliary
  { path: '/anniversaries', changefreq: 'monthly', priority: 0.5 },
  { path: '/gallery-creator', changefreq: 'monthly', priority: 0.5 },
  { path: '/guest-book-creator', changefreq: 'monthly', priority: 0.5 },
  { path: '/obituary-creator', changefreq: 'monthly', priority: 0.5 },
  { path: '/privacy/donations', changefreq: 'yearly', priority: 0.3 },
]

// 16 Ghana regions for /funeral-services/:region (matches src/data/regions.js).
const GHANA_REGIONS = [
  'greater-accra', 'ashanti', 'central', 'western', 'eastern', 'northern',
  'volta', 'bono', 'upper-east', 'upper-west', 'savannah', 'north-east',
  'ahafo', 'bono-east', 'oti', 'western-north',
]

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry({ path, lastmod, changefreq = 'monthly', priority = 0.5 }) {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(BASE + path)}</loc>`,
  ]
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`)
  lines.push(`    <changefreq>${changefreq}</changefreq>`)
  lines.push(`    <priority>${priority.toFixed(1)}</priority>`)
  lines.push('  </url>')
  return lines.join('\n')
}

/**
 * Builds an XML sitemap string from static routes plus optional dynamic data.
 *
 * @param {object} [opts]
 * @param {Array<{slug: string, date?: string}>} [opts.blogPosts] - Blog posts to include.
 * @param {string[]} [opts.regions] - Override the default Ghana region slug list.
 * @returns {string} A complete XML sitemap document.
 */
export function buildSitemap({ blogPosts = [], regions = GHANA_REGIONS } = {}) {
  const today = new Date().toISOString().split('T')[0]
  const entries = []

  // Static routes
  for (const route of STATIC_ROUTES) {
    entries.push(urlEntry({ ...route, lastmod: today }))
  }

  // Region pages
  for (const region of regions) {
    entries.push(urlEntry({
      path: `/funeral-services/${region}`,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: today,
    }))
  }

  // Blog posts (if data is available)
  for (const post of blogPosts) {
    if (!post || !post.slug) continue
    entries.push(urlEntry({
      path: `/blog/${post.slug}`,
      changefreq: 'monthly',
      priority: 0.6,
      lastmod: post.date || today,
    }))
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

/**
 * Vite plugin that emits dist/sitemap.xml after the build completes.
 * Runs on closeBundle, so it executes after Vite copies public/ assets and
 * therefore overwrites any stale public/sitemap.xml.
 *
 * @param {object} [opts]
 * @param {Array<{slug: string, date?: string}>} [opts.blogPosts]
 * @param {string[]} [opts.regions]
 * @param {string} [opts.outDir='dist']
 */
export default function sitemapPlugin(opts = {}) {
  return {
    name: 'funeralpress-sitemap',
    apply: 'build',
    closeBundle() {
      const xml = buildSitemap(opts)
      const outPath = resolve(opts.outDir || 'dist', 'sitemap.xml')
      writeFileSync(outPath, xml, 'utf8')
      console.log(`[sitemap] wrote ${outPath} (${xml.split('\n').length} lines)`)
    },
  }
}
