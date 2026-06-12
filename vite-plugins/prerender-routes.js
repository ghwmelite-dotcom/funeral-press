// Indexable, content-bearing routes worth prerendering to static HTML.
// Deliberately EXCLUDES editor/tool routes (Disallow'd in public/robots.txt)
// and user-generated dynamic routes (/memorial/:id, /obituary/:slug), which
// need runtime rendering and are handled by a separate plan.
export const STATIC_CONTENT_ROUTES = [
  '/',
  '/funeral-brochure-designer',
  '/funeral-poster-maker',
  '/memorial-page-creator',
  '/funeral-programme-booklet',
  '/funeral-brochure-templates',
  '/funeral-poster-templates',
  '/funeral-invitation-templates',
  '/funeral-booklet-templates',
  '/themes',
  '/hymns',
  '/venues',
  '/blog',
  '/privacy/donations',
  // Diaspora landing pages (spec §3.4)
  '/diaspora/plan-a-funeral-in-ghana-from-abroad',
  '/diaspora/watch-a-funeral-from-abroad',
  '/diaspora/funeral-order-of-service-template',
  '/diaspora/send-condolences-to-ghana',
  '/diaspora/nigeria',
]

/**
 * Build the full ordered list of route paths to prerender.
 * @param {object} opts
 * @param {Array<{slug: string}>} opts.blogPosts
 * @param {Array<{slug: string}>} opts.regions
 * @returns {string[]} unique, ordered route paths
 */
export function collectPrerenderRoutes({ blogPosts = [], regions = [] } = {}) {
  const routes = [
    ...STATIC_CONTENT_ROUTES,
    ...blogPosts.map((p) => `/blog/${p.slug}`),
    ...regions.map((r) => `/funeral-services/${r.slug}`),
  ]
  return [...new Set(routes)]
}
