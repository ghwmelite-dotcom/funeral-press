// Shared helpers for injecting per-entity social/OG meta into the prebuilt
// SPA shell at the edge (Cloudflare Pages Functions). Pure string ops — no
// Workers globals — so it's unit-testable under vitest.

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(s, n) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

// Build the per-entity meta block (title + OG + Twitter). Description is
// normalized + capped to ~200 chars; image tags are omitted (and the Twitter
// card downgrades to "summary") when no image is available.
export function buildMetaTags({ title, description, image, url }) {
  const t = escapeHtml(title)
  const d = escapeHtml(truncate(description, 200))
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:type" content="article">`,
  ]
  if (url) tags.push(`<meta property="og:url" content="${escapeHtml(url)}">`)
  if (image) tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`)
  tags.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`)
  tags.push(`<meta name="twitter:title" content="${t}">`)
  tags.push(`<meta name="twitter:description" content="${d}">`)
  if (image) tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`)
  return tags.join('\n    ')
}

// Replace the shell's homepage <title> + og:*/twitter:*/description defaults
// with the per-entity block, so scrapers see one canonical set with no
// duplicates. JSON-LD and all other head content are left intact.
export function injectMeta(html, meta) {
  const block = buildMetaTags(meta)
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>\s*/gi, '')
    .replace(/<head[^>]*>/i, (m) => `${m}\n    ${block}`)
}
