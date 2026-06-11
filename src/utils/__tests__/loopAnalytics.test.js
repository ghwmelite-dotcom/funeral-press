import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  recordLoopEvent,
  captureLoopSurface,
  getStoredLoopSurface,
  clearStoredLoopSurface,
  LOOP_SURFACES,
} from '../loopAnalytics'

describe('loopAnalytics', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('declares the five spec surfaces', () => {
    expect(LOOP_SURFACES).toEqual([
      'memorial_footer',
      'post_condolence',
      'qr_ribbon',
      'referral_dashboard',
      'referral_post_export',
    ])
  })

  it('posts loop events to the analytics endpoint with surface metadata', () => {
    recordLoopEvent('loop_click', 'memorial_footer', { memorialId: 'm1' })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toMatch(/\/analytics\/event$/)
    const body = JSON.parse(opts.body)
    expect(body.event_type).toBe('loop_click')
    expect(body.metadata).toEqual({ surface: 'memorial_footer', memorialId: 'm1' })
    expect(opts.headers.Authorization).toBeUndefined()
  })

  it('attaches the auth token when provided so the event carries user_id', () => {
    recordLoopEvent('loop_signup', 'qr_ribbon', {}, { token: 'jwt-123' })
    const [, opts] = fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer jwt-123')
  })

  it('stores and recalls the attribution surface', () => {
    captureLoopSurface('post_condolence')
    expect(getStoredLoopSurface()).toBe('post_condolence')
    clearStoredLoopSurface()
    expect(getStoredLoopSurface()).toBeNull()
  })

  it('ignores unknown surfaces', () => {
    captureLoopSurface('hacker_surface')
    expect(getStoredLoopSurface()).toBeNull()
  })
})
