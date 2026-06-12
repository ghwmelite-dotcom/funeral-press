// workers/obituarySitemap.js
// Pure XML builder for the opt-in obituary sitemap (testable without D1).
export function obituarySitemapXml(rows) {
  const urls = (rows || []).map((r) =>
    `  <url>\n    <loc>https://funeralpress.org/obituary/${encodeURIComponent(r.slug)}</loc>\n    <lastmod>${(r.updated_at || '').slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}
