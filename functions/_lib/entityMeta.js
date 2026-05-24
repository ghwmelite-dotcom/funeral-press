// Pure mappers from entity API payloads → social-meta input ({title,
// description, image, url}). Kept separate from the network/edge glue so the
// field mapping (the bug-prone part) is unit-testable.

const SITE = 'https://funeralpress.org'

function firstTributeBody(m) {
  return Array.isArray(m.tributes) && m.tributes[0] && m.tributes[0].body
    ? m.tributes[0].body
    : ''
}

// Memorial API (brochure-memorial-api) returns the stored object as published:
// fullName, title, coverPhoto, biography, tributes[], dateOfBirth/Death.
export function memorialMeta(m, id) {
  const name = m.fullName || 'Memorial'
  const displayName = [m.title, m.fullName].filter(Boolean).join(' ').trim() || name
  return {
    title: `${displayName} — Memorial | FuneralPress`,
    description:
      firstTributeBody(m) ||
      m.biography ||
      `In loving memory of ${name}. View the memorial page and celebrate their life.`,
    image: m.coverPhoto || '',
    url: `${SITE}/memorial/${id}`,
  }
}

// Obituary API (auth-api /obituary/:slug) returns a DB row. Columns are
// snake_case (SELECT *); read camelCase too for safety against future shape changes.
export function obituaryMeta(o, slug) {
  const name = o.deceased_name || o.deceasedName || 'Obituary'
  return {
    title: `In Loving Memory of ${name} | FuneralPress`,
    description:
      o.biography ||
      `Obituary announcement for ${name}. View funeral details and pay your respects.`,
    image: o.deceased_photo || o.deceasedPhoto || '',
    url: `${SITE}/obituary/${slug}`,
  }
}
