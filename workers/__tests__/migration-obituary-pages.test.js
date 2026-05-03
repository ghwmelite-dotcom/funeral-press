import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'migration-obituary-pages.sql'), 'utf8')

describe('migration-obituary-pages.sql', () => {
  it('creates obituary_pages with required columns', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS obituary_pages/)
    for (const col of [
      'id', 'user_id', 'slug', 'deceased_name', 'deceased_photo',
      'birth_date', 'death_date', 'biography',
      'funeral_date', 'funeral_time', 'funeral_venue', 'venue_address',
      'family_members', 'is_active', 'created_at', 'updated_at'
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('declares foreign key to users', () => {
    expect(sql).toMatch(/REFERENCES users/)
  })

  it('indexes slug and user_id', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON obituary_pages\(slug\)/)
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON obituary_pages\(user_id\)/)
  })
})
