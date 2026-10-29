/**
 * Protikkha Electric - Security Rate Limiter
 * 
 * Provides in-memory sliding-window rate limiting for authentication
 * and sensitive API endpoints to protect against brute-force attacks.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

export interface RateLimitOptions {
  windowMs?: number; // e.g. 15 minutes = 15 * 60 * 1000
  maxAttempts?: number; // e.g. 5 attempts
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check and record a rate limit attempt for a given identifier (e.g. client IP or username)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs || 15 * 60 * 1000; // default 15 minutes
  const maxAttempts = options.maxAttempts || 5; // default 5 attempts
  const now = Date.now();

  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  const remaining = maxAttempts - record.timestamps.length;
  return {
    allowed: true,
    remaining,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Reset rate limit bucket on successful login
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
