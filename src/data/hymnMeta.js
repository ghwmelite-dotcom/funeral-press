// src/data/hymnMeta.js
// Per-category occasion context for hymn pages (anti-thin-content, spec §4.3)
// and helpers shared by the hymn page and sitemap/prerender collection.

export const CATEGORY_NOTES = {
  processional:
    'Processional hymns open the funeral service as the casket and family enter. In Ghanaian services they set a tone of solemn dignity — steady, familiar melodies the whole congregation can carry. They are usually printed first in the order of service, often alongside the opening prayer.',
  worship:
    'Worship and praise hymns lift the congregation in the thanksgiving portions of a Ghanaian funeral — especially the thanksgiving service and the one-week observance. Twi praise hymns are often sung unaccompanied with clapping, and many families choose at least one hymn in the language their loved one prayed in.',
  comfort:
    'Hymns of comfort speak directly to the bereaved — assurance, rest, and the hope of reunion. They are commonly sung after tributes, when grief in the room is at its heaviest, and are among the most requested hymns for funeral brochures in both English and Twi.',
  committal:
    'Committal hymns accompany the graveside service as the body is laid to rest. They are short, weighty, and traditionally sung as the family takes its final leave. Most orders of service print one or two committal hymns immediately before the benediction.',
  recessional:
    'Recessional hymns close the service as the congregation departs. Ghanaian services often choose a hopeful, forward-looking hymn here — grief gives way to gratitude for a life well lived, and the recessional carries that turn.',
}

export function hymnSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ɔɛ]/g, (c) => (c === 'ɔ' ? 'o' : 'e'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function relatedHymns(hymn, all, n = 5) {
  const same = all.filter((h) => h.slug !== hymn.slug && h.category === hymn.category)
  const others = all.filter((h) => h.slug !== hymn.slug && h.category !== hymn.category)
  return [...same, ...others].slice(0, n)
}
