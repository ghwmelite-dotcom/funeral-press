// Back-compat shim. The D1-only tracker that used to live here has been merged
// into the unified analytics module, which sends to BOTH GA4 and D1 with
// marketing attribution attached. Existing imports keep working unchanged.
export { trackEvent } from './analytics'
