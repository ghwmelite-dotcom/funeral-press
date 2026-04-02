import { describe, it, expect } from 'vitest'
import { sanitizeInput, sanitizeObject } from '../utils/sanitize.js'

describe('sanitizeInput', () => {
  it('returns non-string values unchanged', () => {
    expect(sanitizeInput(42)).toBe(42)
    expect(sanitizeInput(null)).toBeNull()
    expect(sanitizeInput(undefined)).toBeUndefined()
    expect(sanitizeInput(true)).toBe(true)
  })

  it('passes through clean strings', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World')
    expect(sanitizeInput('John Doe, 1945-2026')).toBe('John Doe, 1945-2026')
  })

  it('strips script tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('')
    expect(sanitizeInput('Hello<script>bad()</script>World')).toBe('HelloWorld')
  })

  it('strips event handlers', () => {
    expect(sanitizeInput('<img onerror="alert(1)">')).toBe('<img >')
    expect(sanitizeInput('<div onmouseover="hack()">')).toBe('<div >')
  })

  it('strips javascript: protocol', () => {
    expect(sanitizeInput('<a href="javascript:alert(1)">click</a>')).toBe('<a href="alert(1)">click</a>')
  })

  it('strips dangerous embed tags', () => {
    expect(sanitizeInput('<iframe src="evil.com">')).toBe('&lt;iframe src="evil.com">')
    expect(sanitizeInput('<object data="evil">')).toBe('&lt;object data="evil">')
    expect(sanitizeInput('<embed src="evil">')).toBe('&lt;embed src="evil">')
  })

  it('handles mixed attacks', () => {
    const input = '<script>x</script><img onerror="y"><iframe src="z">'
    const result = sanitizeInput(input)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('onerror=')
    expect(result).not.toContain('<iframe')
  })
})

describe('sanitizeObject', () => {
  it('sanitizes all string values in a flat object', () => {
    const input = { name: 'John', bio: '<script>x</script>Good person' }
    const result = sanitizeObject(input)
    expect(result.name).toBe('John')
    expect(result.bio).toBe('Good person')
  })

  it('leaves non-string values untouched', () => {
    const input = { name: 'John', age: 80, active: true }
    const result = sanitizeObject(input)
    expect(result).toEqual({ name: 'John', age: 80, active: true })
  })

  it('skips specified keys', () => {
    const input = { name: 'John', data: '<b>bold</b>' }
    const result = sanitizeObject(input, ['data'])
    expect(result.data).toBe('<b>bold</b>')
  })
})
