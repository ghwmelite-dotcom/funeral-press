/**
 * Sanitize a string value to prevent XSS attacks.
 * Strips script tags, event handlers, javascript: protocol, and dangerous embed elements.
 * @param {*} value - input to sanitize
 * @returns {*} - sanitized string or original value if not a string
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') return value

  return value
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, onmouseover, etc.)
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Escape dangerous embed tags (iframe, object, embed)
    .replace(/<iframe/gi, '&lt;iframe')
    .replace(/<object/gi, '&lt;object')
    .replace(/<embed/gi, '&lt;embed')
}

/**
 * Sanitize all string values in a flat object.
 * @param {Object} obj - object with string values to sanitize
 * @param {string[]} [skipKeys=[]] - keys to skip sanitization for
 * @returns {Object} - new object with sanitized string values
 */
export function sanitizeObject(obj, skipKeys = []) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = skipKeys.includes(key) ? value : sanitizeInput(value)
  }
  return result
}
