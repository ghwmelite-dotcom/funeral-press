import { openDB } from 'idb'

const DB_NAME = 'funeralpress-offline'
const STORE_NAME = 'drafts'
const DB_VERSION = 1
const MAX_DRAFTS = 10

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function saveDraft(draft) {
  const db = await getDB()
  await db.put(STORE_NAME, { ...draft, synced: false })

  const all = await db.getAll(STORE_NAME)
  if (all.length > MAX_DRAFTS) {
    const sorted = all.sort((a, b) => a.createdAt - b.createdAt)
    const toRemove = sorted.slice(0, sorted.length - MAX_DRAFTS)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const item of toRemove) {
      await tx.store.delete(item.id)
    }
    await tx.done
  }
}

export async function getDrafts() {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getDraft(id) {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function deleteDraft(id) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getUnsyncedDrafts() {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter(d => !d.synced)
}

export async function markSynced(id) {
  const db = await getDB()
  const draft = await db.get(STORE_NAME, id)
  if (draft) {
    await db.put(STORE_NAME, { ...draft, synced: true })
  }
}

export async function syncDrafts(apiFetch) {
  const unsynced = await getUnsyncedDrafts()
  const results = []

  for (const draft of unsynced) {
    try {
      await apiFetch('/designs/sync', {
        method: 'POST',
        body: JSON.stringify({ designs: [{ id: draft.id, product_type: draft.productType, name: draft.data?.name || 'Offline Draft', data: JSON.stringify(draft.data), updated_at: new Date(draft.createdAt).toISOString() }] }),
      })
      await markSynced(draft.id)
      results.push({ id: draft.id, success: true })
    } catch {
      results.push({ id: draft.id, success: false })
    }
  }

  return results
}
