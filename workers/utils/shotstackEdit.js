// Pure builder for a Shotstack "edit" (render spec) for a dignified tribute
// video: opening title card (name + dates) → Ken-Burns photo montage with an
// AI-written caption overlay → closing card, over a fading soundtrack.
// No I/O — unit-testable.

export const CLIP_SECONDS = 3.5
const CARD_SECONDS = 3
const ZOOMS = ['zoomIn', 'zoomOut']

export function buildTributeEdit({ title, subtitle, caption, imageUrls = [], soundtrackUrl }) {
  const photos = Array.isArray(imageUrls) ? imageUrls : []
  let cursor = 0

  const titleCard = {
    asset: { type: 'title', text: `${title || 'In Memoriam'}\n${subtitle || ''}`.trim(), style: 'minimal', size: 'large' },
    start: cursor,
    length: CARD_SECONDS,
    transition: { in: 'fade', out: 'fade' },
  }
  cursor += CARD_SECONDS

  const imageClips = photos.map((src, i) => {
    const clip = {
      asset: { type: 'image', src },
      start: cursor,
      length: CLIP_SECONDS,
      effect: ZOOMS[i % ZOOMS.length],
      transition: { in: 'fade', out: 'fade' },
    }
    cursor += CLIP_SECONDS
    return clip
  })

  // Caption overlays the final stretch of the montage (or the title card if no photos).
  const captionStart = photos.length
    ? Math.max(CARD_SECONDS, cursor - CLIP_SECONDS)
    : 0
  const captionClip = caption
    ? {
        asset: { type: 'title', text: caption, style: 'subtitle', size: 'small' },
        start: captionStart,
        length: CLIP_SECONDS,
        transition: { in: 'fade', out: 'fade' },
      }
    : null

  const closingCard = {
    asset: { type: 'title', text: 'Forever in our hearts', style: 'minimal', size: 'medium' },
    start: cursor,
    length: CARD_SECONDS,
    transition: { in: 'fade', out: 'fade' },
  }
  cursor += CARD_SECONDS

  const tracks = [
    { clips: [titleCard, ...imageClips, closingCard] },
    ...(captionClip ? [{ clips: [captionClip] }] : []),
  ]

  const timeline = { background: '#000000', tracks }
  if (soundtrackUrl) timeline.soundtrack = { src: soundtrackUrl, effect: 'fadeInFadeOut' }

  return {
    timeline,
    output: { format: 'mp4', resolution: 'sd', fps: 25 },
  }
}
