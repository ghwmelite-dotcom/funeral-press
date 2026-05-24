import { describe, it, expect } from 'vitest'
import { collectPrerenderRoutes, STATIC_CONTENT_ROUTES } from '../prerender-routes.js'

const blogPosts = [{ slug: 'how-to-design-funeral-brochure-ghana' }, { slug: 'funeral-printing-cost-ghana' }]
const regions = [{ slug: 'greater-accra' }, { slug: 'ashanti' }]

describe('collectPrerenderRoutes', () => {
  it('includes the homepage and the static content routes', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/')
    expect(routes).toContain('/blog')
    expect(routes).toContain('/hymns')
    expect(routes).toContain('/venues')
    expect(routes).toContain('/funeral-brochure-designer')
  })

  it('expands every blog post into a /blog/:slug route', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/blog/how-to-design-funeral-brochure-ghana')
    expect(routes).toContain('/blog/funeral-printing-cost-ghana')
  })

  it('expands every region into a /funeral-services/:region route', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(routes).toContain('/funeral-services/greater-accra')
    expect(routes).toContain('/funeral-services/ashanti')
  })

  it('never includes robots-disallowed editor/admin/user routes', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    for (const bad of ['/editor', '/admin', '/my-designs', '/partner-dashboard', '/obituary-creator']) {
      expect(routes).not.toContain(bad)
    }
  })

  it('returns no duplicate paths', () => {
    const routes = collectPrerenderRoutes({ blogPosts, regions })
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('starts from the curated STATIC_CONTENT_ROUTES list', () => {
    expect(STATIC_CONTENT_ROUTES[0]).toBe('/')
  })
})
