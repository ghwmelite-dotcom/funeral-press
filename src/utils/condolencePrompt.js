// Per-visitor seen-state for the post-condolence prompt (spec §2.3) — shown
// once per guest book per visitor. Lives outside the component file so the
// component module only exports components (react-refresh constraint).

const STORAGE_PREFIX = 'fp-condolence-prompt-'

export function hasSeenCondolencePrompt(slug) {
  try { return !!localStorage.getItem(STORAGE_PREFIX + slug) } catch { return false }
}

export function markCondolencePromptSeen(slug) {
  try { localStorage.setItem(STORAGE_PREFIX + slug, '1') } catch { /* ignore */ }
}
