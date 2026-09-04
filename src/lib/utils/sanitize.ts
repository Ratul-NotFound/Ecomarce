/**
 * ============================================================
 * INPUT SANITIZER — XSS & Injection Prevention
 * ============================================================
 * Strips HTML tags and dangerous characters from user-supplied
 * text before storing to database or rendering to page.
 * ============================================================
 */

/**
 * Strip HTML tags and encode dangerous characters.
 * Use on all user-supplied strings that will be stored in DB
 * and potentially rendered in admin UI or email templates.
 */
export function sanitizeText(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')             // Strip HTML tags
    .replace(/javascript:/gi, '')        // Strip JS protocol
    .replace(/on\w+\s*=/gi, '')          // Strip inline event handlers
    .replace(/data:/gi, '')              // Strip data: URIs
    .trim();
}

/**
 * Sanitize a name field: allows letters, spaces, hyphens, apostrophes.
 */
export function sanitizeName(input: unknown, maxLength = 100): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/[<>'"&;]/g, '')
    .trim();
}

/**
 * Validate and return a clean UUID string, or null if invalid.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sanitizeUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize a phone number: digits only, 7–15 chars.
 */
export function sanitizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

/**
 * Sanitize a URL — only allow http(s) schemes.
 */
export function sanitizeUrl(input: unknown, maxLength = 500): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().slice(0, maxLength);
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Sanitize coupon code: alphanumeric, uppercase, max 20 chars.
 */
export function sanitizeCouponCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return clean.length >= 2 && clean.length <= 20 ? clean : null;
}

/**
 * Escape HTML entities for safe rendering in HTML contexts.
 * Use when outputting untrusted data into HTML (e.g. invoices, emails).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
