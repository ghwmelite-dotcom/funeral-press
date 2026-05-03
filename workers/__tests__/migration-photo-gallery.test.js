import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '..', 'migrations', 'migration-photo-gallery.sql'), 'utf8')

describe('migration-photo-gallery.sql', () => {
  it('creates photo_galleries table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS photo_galleries/)
    for (const col of ['id', 'user_id', 'slug', 'title', 'deceased_name', 'description', 'is_active', 'created_at']) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('creates gallery_photos table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS gallery_photos/)
    for (const col of ['id', 'gallery_id', 'photo_url', 'caption', 'sort_order', 'created_at']) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`))
    }
  })

  it('declares foreign keys', () => {
    expect(sql).toMatch(/REFERENCES users/)
    expect(sql).toMatch(/REFERENCES photo_galleries/)
  })

  it('indexes slug and gallery_id', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON photo_galleries\(slug\)/)
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS .* ON gallery_photos\(gallery_id\)/)
  })
})
