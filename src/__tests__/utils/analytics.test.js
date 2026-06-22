import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { trackEvent } from '../../utils/analytics'

describe('unified trackEvent', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
    window.gtag = vi.fn()
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    // jsdom defaults navigator.webdriver to false; make it explicit
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.gtag
  })

  it('sends the event to BOTH GA4 and the D1 endpoint', () => {
    trackEvent('signup_completed', { method: 'phone' })

    // GA4
    expect(window.gtag).toHaveBeenCalledWith('event', 'signup_completed', expect.objectContaining({ method: 'phone' }))

    // D1
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/analytics\/event$/)
    const body = JSON.parse(init.body)
    expect(body.event_type).toBe('signup_completed')
    expect(body.session_id).toBeTruthy()
    expect(body.metadata.method).toBe('phone')
  })

  it('attaches marketing attribution to both pipelines', async () => {
    window.history.replaceState({}, '', '/?utm_source=facebook&utm_campaign=launch')
    const { captureAttribution } = await import('../../utils/attribution')
    captureAttribution()

    trackEvent('payment_completed', { amount: 35 })

    const gaParams = window.gtag.mock.calls[0][2]
    expect(gaParams.utm_source).toBe('facebook')
    expect(gaParams.utm_campaign).toBe('launch')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.metadata.utm_source).toBe('facebook')
  })

  it('attaches a provided token as a bearer header for user-id join', () => {
    trackEvent('loop_signup', { surface: 'qr_ribbon' }, { token: 'tok_123' })
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers['Authorization']).toBe('Bearer tok_123')
  })

  it('does not fire for prerender/headless (navigator.webdriver)', () => {
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })
    trackEvent('session_started')
    expect(window.gtag).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
