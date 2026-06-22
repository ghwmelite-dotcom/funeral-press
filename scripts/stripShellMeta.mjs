// scripts/stripShellMeta.mjs
// Prerender post-processing: the built SPA shell (index.html) ships static
// <title>, <meta name="description">, and og:/twitter: defaults for the
// homepage. When a route mounts react-helmet-async it injects its OWN per-page
// title + description + og/twitter tags (marked with data-rh="true"). Helmet
// dedupes <title> in the live DOM, but the static <meta> tags persist, so the
// captured prerender HTML ends up with TWO descriptions / og:titles / etc.
//
// This strips the ORIGINAL static shell title + social meta (the tags WITHOUT
// a Helmet marker attribute), leaving only Helmet's per-page set. Mirrors the
// strip-then-keep intent of functions/_lib/socialMeta.js#injectMeta. JSON-LD
// and every other head tag are left untouched.

// A Helmet-managed tag carries data-rh="true" (react-helmet-async) — older
// builds used data-react-helmet. Match either so the stripper is robust.
const HELMET_ATTR = /\sdata-(?:rh|react-helmet)=("|')?true\1?/i

function isHelmetManaged(tag) {
  return HELMET_ATTR.test(tag)
}

// Strip the static (non-Helmet) <title>. Helmet's own <title> is preserved.
function stripShellTitle(html) {
  return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, (m) =>
    isHelmetManaged(m) ? m : '',
  )
}

// Strip static (non-Helmet) social/description <meta> tags. Helmet emits its
// own description + og:title/og:description/og:url/og:type/og:image and the
// twitter:* set, all marked data-rh — those are kept.
const SOCIAL_META = /<meta\b[^>]*\b(?:name=("|')(?:description|twitter:[^"']*)\1|property=("|')og:[^"']*\2)[^>]*>/gi

function stripShellSocialMeta(html) {
  return html.replace(SOCIAL_META, (m) => (isHelmetManaged(m) ? m : ''))
}

// Remove a now-empty line left behind by a stripped tag, to keep output tidy.
function tidyBlankLines(html) {
  return html.replace(/^[ \t]*\r?\n/gm, (line, offset, str) => {
    // Only collapse runs of blank lines, not single intentional separators.
    return str[offset - 1] === '\n' ? '' : line
  })
}

export function stripDuplicateShellMeta(html) {
  let out = stripShellTitle(html)
  out = stripShellSocialMeta(out)
  out = tidyBlankLines(out)
  return out
}

export default stripDuplicateShellMeta
