// Cloudflare Pages Function for /obituary/:slug.
// Injects per-obituary OG/Twitter meta into the SPA shell for social link
// previews. The obituary API (auth-api) returns { obituary: <row> }; row keys
// are read with snake_case + camelCase fallbacks for robustness. Degrades
// gracefully to the unmodified shell on any failure.
//
// Privacy: noindex is injected server-side (fail-closed) for all obituaries
// unless the family has explicitly opted in via search_indexable = 1. OG/Twitter
// tags are preserved even on noindex pages so private WhatsApp previews work.
import { injectMeta } from '../_lib/socialMeta.js'
import { obituaryMeta } from '../_lib/entityMeta.js'
import { loadShell, htmlResponse } from '../_lib/shell.js'

const AUTH_API = 'https://funeralpress-auth-api.ghwmelite.workers.dev'

// Inject <meta name="robots" content="noindex, nofollow"> into <head>.
// Called after injectMeta so OG/Twitter tags are already present (social
// previews use OG tags, not robots; noindex only affects search crawlers).
function injectNoindex(html) {
  return html.replace(
    /(<head[^>]*>)/i,
    '$1\n    <meta name="robots" content="noindex, nofollow">'
  )
}

export async function onRequest(context) {
  const { params } = context
  const slug = params.slug
  const shell = await loadShell(context)

  // Fail-closed: any error/not-found path serves the shell with noindex so
  // crawlers never accidentally index an error page or a private obituary.
  try {
    const res = await fetch(`${AUTH_API}/obituary/${encodeURIComponent(slug)}`)
    if (!res.ok) return htmlResponse(injectNoindex(shell))
    const data = await res.json()
    const o = data.obituary || data
    if (!o || typeof o !== 'object') return htmlResponse(injectNoindex(shell))

    // Resolve indexable from both casing variants (API returns camelCase;
    // snake_case fallback guards against future shape changes).
    const indexable = !!(o.search_indexable ?? o.searchIndexable)

    const withMeta = injectMeta(shell, obituaryMeta(o, slug))
    return htmlResponse(indexable ? withMeta : injectNoindex(withMeta))
  } catch {
    return htmlResponse(injectNoindex(shell))
  }
}
