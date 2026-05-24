// Cloudflare Pages Function for /obituary/:slug.
// Injects per-obituary OG/Twitter meta into the SPA shell for social link
// previews. The obituary API (auth-api) returns { obituary: <row> }; row keys
// are read with snake_case + camelCase fallbacks for robustness. Degrades
// gracefully to the unmodified shell on any failure.
import { injectMeta } from '../_lib/socialMeta.js'
import { obituaryMeta } from '../_lib/entityMeta.js'
import { loadShell, htmlResponse } from '../_lib/shell.js'

const AUTH_API = 'https://funeralpress-auth-api.ghwmelite.workers.dev'

export async function onRequest(context) {
  const { params } = context
  const slug = params.slug
  const shell = await loadShell(context)

  try {
    const res = await fetch(`${AUTH_API}/obituary/${encodeURIComponent(slug)}`)
    if (!res.ok) return htmlResponse(shell)
    const data = await res.json()
    const o = data.obituary || data
    if (!o || typeof o !== 'object') return htmlResponse(shell)
    return htmlResponse(injectMeta(shell, obituaryMeta(o, slug)))
  } catch {
    return htmlResponse(shell)
  }
}
