import { describe, it, expect } from 'vitest'

// Pure helpers extracted to be testable
const SUPER_ADMINS = ['oh84dev@gmail.com', 'oh84dev@funeralpress.org', 'funeralpress.org@gmail.com']

function isSuperAdmin(email) {
  return SUPER_ADMINS.includes(email)
}

describe('isSuperAdmin', () => {
  it('returns true for hardcoded super-admin emails', () => {
    expect(isSuperAdmin('oh84dev@gmail.com')).toBe(true)
    expect(isSuperAdmin('oh84dev@funeralpress.org')).toBe(true)
    expect(isSuperAdmin('funeralpress.org@gmail.com')).toBe(true)
  })

  it('returns false for non-super-admin emails', () => {
    expect(isSuperAdmin('user@example.com')).toBe(false)
    expect(isSuperAdmin('admin@funeralpress.org')).toBe(false) // not in hardcoded list
    expect(isSuperAdmin('')).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('is case-sensitive (matches exact email casing)', () => {
    expect(isSuperAdmin('OH84DEV@GMAIL.COM')).toBe(false)
    expect(isSuperAdmin('FuneralPress.Org@Gmail.Com')).toBe(false)
  })
})

describe('SUPER_ADMINS list', () => {
  it('includes the three configured super admins', () => {
    expect(SUPER_ADMINS).toHaveLength(3)
    expect(SUPER_ADMINS).toContain('oh84dev@gmail.com')
    expect(SUPER_ADMINS).toContain('oh84dev@funeralpress.org')
    expect(SUPER_ADMINS).toContain('funeralpress.org@gmail.com')
  })
})

describe('admin route patterns', () => {
  it('grant-admin route pattern matches expected URLs', () => {
    const pattern = /^\/admin\/users\/[^/]+\/grant-admin$/
    expect(pattern.test('/admin/users/abc123/grant-admin')).toBe(true)
    expect(pattern.test('/admin/users/usr-abc-def/grant-admin')).toBe(true)
    expect(pattern.test('/admin/users//grant-admin')).toBe(false)
    expect(pattern.test('/admin/users/abc/grant-admin/extra')).toBe(false)
  })

  it('revoke-admin route pattern matches expected URLs', () => {
    const pattern = /^\/admin\/users\/[^/]+\/revoke-admin$/
    expect(pattern.test('/admin/users/abc123/revoke-admin')).toBe(true)
    expect(pattern.test('/admin/users/abc/revoke-admin/extra')).toBe(false)
  })
})
