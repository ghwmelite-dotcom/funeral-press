// Cloudflare Pages Function for /memorial/:id.
// Injects per-memorial OG/Twitter meta into the SPA shell so non-JS crawlers
// and social link scrapers (WhatsApp/Facebook/X) get the deceased's name +
// photo in link previews. Renders for ALL requests (no cloaking) — React then
// boots and client-renders the full page as before. Any failure degrades
// gracefully to the unmodified shell.
import { injectMeta } from '../_lib/socialMeta.js'
import { memorialMeta } from '../_lib/entityMeta.js'
import { loadShell, htmlResponse } from '../_lib/shell.js'

const MEMORIAL_API = 'https://brochure-memorial-api.ghwmelite.workers.dev'

export async function onRequest(context) {
  const { params } = context
  const id = params.id
  const shell = await loadShell(context)

  try {
    const res = await fetch(`${MEMORIAL_API}/${encodeURIComponent(id)}`)
    if (!res.ok) return htmlResponse(shell)
    const m = await res.json()
    return htmlResponse(injectMeta(shell, memorialMeta(m, id)))
  } catch {
    return htmlResponse(shell)
  }
}
