import { describe, it, expect } from 'vitest'
import { buildTributeEdit, CLIP_SECONDS } from '../utils/shotstackEdit.js'

const base = {
  title: 'Ama Mensah',
  subtitle: '1950 — 2026',
  caption: 'A loving mother, remembered always.',
  imageUrls: ['https://img/1.jpg', 'https://img/2.jpg', 'https://img/3.jpg'],
  soundtrackUrl: 'https://cdn/track.mp3',
}

const allClips = (edit) => edit.timeline.tracks.flatMap((t) => t.clips)
const imageClips = (edit) => allClips(edit).filter((c) => c.asset.type === 'image')
const titleClips = (edit) => allClips(edit).filter((c) => c.asset.type === 'title')

describe('buildTributeEdit', () => {
  it('produces an mp4 sd output', () => {
    const edit = buildTributeEdit(base)
    expect(edit.output.format).toBe('mp4')
    expect(edit.output.resolution).toBe('sd')
  })

  it('adds one image clip per photo plus title + closing cards', () => {
    const edit = buildTributeEdit(base)
    expect(imageClips(edit)).toHaveLength(3)
    expect(titleClips(edit).length).toBeGreaterThanOrEqual(2) // title + closing
  })

  it('puts the deceased name + dates in the opening title card', () => {
    const edit = buildTributeEdit(base)
    const opening = titleClips(edit).find((c) => c.asset.text.includes('Ama Mensah'))
    expect(opening).toBeTruthy()
    expect(opening.asset.text).toContain('1950 — 2026')
  })

  it('attaches the soundtrack with a fade', () => {
    const edit = buildTributeEdit(base)
    expect(edit.timeline.soundtrack.src).toBe('https://cdn/track.mp3')
    expect(edit.timeline.soundtrack.effect).toBe('fadeInFadeOut')
  })

  it('gives image clips Ken-Burns zoom effects and fixed length', () => {
    const edit = buildTributeEdit(base)
    expect(imageClips(edit).every((c) => /^zoom/.test(c.effect))).toBe(true)
    expect(imageClips(edit).every((c) => c.length === CLIP_SECONDS)).toBe(true)
  })

  it('includes the caption as an overlay when provided', () => {
    const edit = buildTributeEdit(base)
    const cap = titleClips(edit).find((c) => c.asset.text === base.caption)
    expect(cap).toBeTruthy()
  })

  it('handles a single photo without error', () => {
    const edit = buildTributeEdit({ ...base, imageUrls: ['https://img/only.jpg'] })
    expect(imageClips(edit)).toHaveLength(1)
  })

  it('omits the soundtrack key when none is given', () => {
    const edit = buildTributeEdit({ ...base, soundtrackUrl: undefined })
    expect(edit.timeline.soundtrack).toBeUndefined()
  })
})
