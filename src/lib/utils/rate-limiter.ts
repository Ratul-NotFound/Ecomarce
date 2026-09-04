/**
 * ============================================================
 * MULTI-TIER RATE LIMITER — DDoS & Abuse Prevention
 * ============================================================
 * Tier 1 (Global):  300 req/min per IP across entire site
 * Tier 2 (API):      60 req/min per IP on all /api/* routes
 * Tier 3 (Auth):     10 req/min per IP on auth-sensitive routes
 * Tier 4 (Custom):   Per-endpoint overrides (order, chat, etc.)
 * ============================================================
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Separate stores per tier for clean isolation
const globalStore  = new Map<string, RateLimitRecord>();
const apiStore     = new Map<string, RateLimitRecord>();
const customStore  = new Map<string, RateLimitRecord>();

function cleanup(store: Map<string, RateLimitRecord>) {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) store.delete(key);
  }
}

// Auto-cleanup every 5 minutes to prevent memory bloat
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanup(globalStore);
    cleanup(apiStore);
    cleanup(customStore);
  }, 5 * 60 * 1000);
}

function check(
  store: Map<string, RateLimitRecord>,
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSec: 0 };
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, retryAfterSec: 0 };
}

// ─── Public API ────────────────────────────────────────────

/**
 * Global DDoS guard: 300 requests per minute per IP.
 * Apply at the edge proxy to catch floods before any logic runs.
 */
export function checkGlobalRateLimit(ip: string) {
  return check(globalStore, `g:${ip}`, 300, 60_000);
}

/**
 * API-tier guard: 60 requests per minute per IP on /api/* routes.
 */
export function checkApiRateLimit(ip: string) {
  return check(apiStore, `api:${ip}`, 60, 60_000);
}

/**
 * Custom per-endpoint limiter. Use for specific endpoints.
 * @param identifier   Unique key e.g. `order_create:${ip}`
 * @param maxRequests  Max allowed in window
 * @param windowMs     Window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  return check(customStore, identifier, maxRequests, windowMs);
}

/**
 * Build standard rate-limit response headers.
 */
export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
  };
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSec);
    headers['X-RateLimit-Limit-Exceeded'] = 'true';
  }
  return headers;
}
