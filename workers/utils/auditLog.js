import { redactPii } from './redactPii.js'

/**
 * Log an action to the audit_log table.
 * Fire-and-forget — errors are silently caught so audit logging never breaks the request.
 * The `detail` JSON is run through redactPii() so emails / phones / names are
 * masked before persistence; the audit row stays useful for "user X did Y" but
 * does not expand the breach blast radius if the table were exfiltrated.
 *
 * @param {D1Database} db - D1 database binding
 * @param {Object} params
 * @param {string} [params.userId] - user who performed the action
 * @param {string} params.action - action identifier (e.g. 'payment.verified')
 * @param {string} [params.resourceType] - resource type (e.g. 'order', 'design')
 * @param {string} [params.resourceId] - resource identifier
 * @param {Object} [params.detail] - additional JSON context (will be PII-redacted)
 * @param {string} [params.ipAddress] - request IP
 */
export async function logAudit(db, { userId = null, action, resourceType = null, resourceId = null, detail = {}, ipAddress = null }) {
  try {
    await db.prepare(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(redactPii(detail)),
      ipAddress
    ).run()
  } catch {
    // Audit logging must never break a request
  }
}

/**
 * Extract the client IP from a Cloudflare Workers request.
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

/**
 * Log a donation-rail-specific action to the donation_audit table.
 * Same fire-and-forget contract as logAudit — errors are silently caught.
 * @param {D1Database} db
 * @param {Object} params
 * @param {string} [params.memorialId]
 * @param {string} [params.donationId]
 * @param {number} [params.actorUserId]
 * @param {string} [params.actorPhone]
 * @param {string} params.action
 * @param {Object} [params.detail]
 * @param {string} [params.ipAddress]
 */
export async function logDonationAudit(db, {
  memorialId = null,
  donationId = null,
  actorUserId = null,
  actorPhone = null,
  action,
  detail = {},
  ipAddress = null,
}) {
  try {
    // Mask the dedicated phone column AND the free-form detail blob.
    const maskedPhone = actorPhone ? redactPii({ phone: actorPhone }).phone : null
    await db.prepare(
      `INSERT INTO donation_audit (memorial_id, donation_id, actor_user_id, actor_phone, action, detail, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      memorialId,
      donationId,
      actorUserId,
      maskedPhone,
      action,
      JSON.stringify(redactPii(detail)),
      ipAddress,
      Date.now()
    ).run()
  } catch {
    // never break a request
  }
}
