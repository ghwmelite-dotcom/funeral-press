// Build-time helpers for turning a blog post's structured content blocks into
// HTML, plus the small escaping/URL primitives shared by the syndication-feed
// builders. Pure — no Vite or Node dependencies — so it is trivially testable.

export const SITE_URL = 'https://funeralpress.org'

// Escape the five XML/HTML-significant characters. Safe for XML text nodes and
// HTML attribute/body text alike.
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Turn a site-relative path ("/editor") into an absolute URL so links work
// inside a feed reader. Absolute http(s) URLs are returned unchanged.
export function absolutizeUrl(link) {
  if (!link) return SITE_URL
  if (/^https?:\/\//i.test(link)) return link
  return SITE_URL + (link.startsWith('/') ? link : `/${link}`)
}

// Serialize a post's content blocks into a single HTML string. Supported block
// types: paragraph, heading, list, cta. Unknown types are skipped so a future
// block type can never crash the build.
export function renderContentToHtml(content = []) {
  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    switch (block.type) {
      case 'paragraph':
        parts.push(`<p>${escapeXml(block.text)}</p>`)
        break
      case 'heading':
        parts.push(`<h2>${escapeXml(block.text)}</h2>`)
        break
      case 'list': {
        const items = (block.items || [])
          .map((item) => `<li>${escapeXml(item)}</li>`)
          .join('')
        parts.push(`<ul>${items}</ul>`)
        break
      }
      case 'cta':
        parts.push(
          `<p><a href="${escapeXml(absolutizeUrl(block.link))}">${escapeXml(block.text)}</a></p>`,
        )
        break
      default:
        break
    }
  }
  return parts.join('\n')
}
