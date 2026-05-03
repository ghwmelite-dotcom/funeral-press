// Reads boolean feature flags from worker env vars.
// String values 'true'/'1'/'on'/'yes' are truthy. Default returned if missing.

export function featureFlag(env, key, defaultValue = false) {
  const v = env?.[key]
  if (v === undefined || v === null) return defaultValue
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'on' || s === 'yes'
}
