import { describe, it, expect } from 'vitest'
import { memorialMeta, obituaryMeta } from './entityMeta.js'

describe('memorialMeta', () => {
  it('uses title + fullName for the display name and first tribute for description', () => {
    const meta = memorialMeta(
      { title: 'Mrs', fullName: 'Ama Mensah', coverPhoto: 'https://img/ama.jpg', tributes: [{ body: 'A loving mother.' }], biography: 'bio' },
      'abc123',
    )
    expect(meta.title).toBe('Mrs Ama Mensah — Memorial | FuneralPress')
    expect(meta.description).toBe('A loving mother.')
    expect(meta.image).toBe('https://img/ama.jpg')
    expect(meta.url).toBe('https://funeralpress.org/memorial/abc123')
  })

  it('falls back to biography when there are no tributes', () => {
    const meta = memorialMeta({ fullName: 'Kofi', biography: 'A life well lived.' }, 'x')
    expect(meta.title).toBe('Kofi — Memorial | FuneralPress')
    expect(meta.description).toBe('A life well lived.')
    expect(meta.image).toBe('')
  })

  it('falls back to a generic message when no tribute or biography', () => {
    const meta = memorialMeta({ fullName: 'Yaa' }, 'x')
    expect(meta.description).toContain('In loving memory of Yaa')
  })

  it('handles a missing fullName', () => {
    const meta = memorialMeta({}, 'x')
    expect(meta.title).toBe('Memorial — Memorial | FuneralPress')
    expect(meta.description).toContain('In loving memory of Memorial')
  })
})

describe('obituaryMeta', () => {
  it('reads snake_case fields from the DB row', () => {
    const meta = obituaryMeta(
      { deceased_name: 'Kwame Boateng', deceased_photo: 'https://img/kwame.jpg', biography: 'Beloved teacher.' },
      'kwame-boateng-abc',
    )
    expect(meta.title).toBe('In Loving Memory of Kwame Boateng | FuneralPress')
    expect(meta.description).toBe('Beloved teacher.')
    expect(meta.image).toBe('https://img/kwame.jpg')
    expect(meta.url).toBe('https://funeralpress.org/obituary/kwame-boateng-abc')
  })

  it('reads camelCase fields as a fallback', () => {
    const meta = obituaryMeta({ deceasedName: 'Esi', deceasedPhoto: 'https://img/esi.jpg' }, 's')
    expect(meta.title).toBe('In Loving Memory of Esi | FuneralPress')
    expect(meta.image).toBe('https://img/esi.jpg')
    expect(meta.description).toContain('Obituary announcement for Esi')
  })

  it('handles a missing name', () => {
    const meta = obituaryMeta({}, 's')
    expect(meta.title).toBe('In Loving Memory of Obituary | FuneralPress')
  })
})
