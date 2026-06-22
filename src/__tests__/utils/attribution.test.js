import { describe, it, expect, beforeEach } from 'vitest'
import { captureAttribution, getAttribution } from '../../utils/attribution'

function setUrl(search) {
  window.history.replaceState({}, '', `/${search}`)
}

describe('attribution', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setUrl('')
  })

  it('captures UTM params as last-touch (bare) and first-touch (prefixed)', () => {
    setUrl('?utm_source=facebook&utm_medium=cpc&utm_campaign=launch')
    captureAttribution()
    const attr = getAttribution()
    expect(attr.utm_source).toBe('facebook')
    expect(attr.utm_medium).toBe('cpc')
    expect(attr.utm_campaign).toBe('launch')
    expect(attr.first_utm_source).toBe('facebook')
  })

  it('captures click ids and referral codes', () => {
    setUrl('?gclid=abc123&ref=AUNTIE')
    captureAttribution()
    const attr = getAttribution()
    expect(attr.gclid).toBe('abc123')
    expect(attr.p_ref).toBe('AUNTIE')
  })

  it('preserves first-touch across later visits, updates last-touch', () => {
    setUrl('?utm_source=google')
    captureAttribution()
    setUrl('?utm_source=tiktok')
    captureAttribution()
    const attr = getAttribution()
    expect(attr.first_utm_source).toBe('google') // never overwritten
    expect(attr.utm_source).toBe('tiktok') // last-touch updated
  })

  it('does not clobber first-touch on a plain organic visit', () => {
    setUrl('?utm_source=google')
    captureAttribution()
    setUrl('') // direct/organic navigation, no campaign params
    captureAttribution()
    const attr = getAttribution()
    expect(attr.first_utm_source).toBe('google')
    expect(attr.utm_source).toBe('google') // last-touch still the campaign visit
  })

  it('returns empty object when no attribution captured', () => {
    expect(getAttribution()).toEqual({})
  })
})
