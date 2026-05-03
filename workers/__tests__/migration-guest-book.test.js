import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = join(__dirname, '..', 'migrations', 'migration-guest-book.sql')
const sql = readFileSync(MIGRATION_PATH, 'utf8')

describe('migration-guest-book.sql', () => {
  it('creates guest_books table with required columns', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS guest_books/)
    for (const col of ['id', 'user_id', 'slug', 'deceased_name', 'deceased_photo', 'cover_message', 'is_active', 'created_at']) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('creates guest_entries table with required columns', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS guest_entries/)
    for (const col of ['id', 'book_id', 'name', 'message', 'photo_url', 'created_at']) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('declares foreign keys', () => {
    expect(sql).toMatch(/REFERENCES users/)
    expect(sql).toMatch(/REFERENCES guest_books/)
  })

  it('indexes slug and user_id', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON guest_books\(slug\)/)
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON guest_books\(user_id\)/)
  })
})
