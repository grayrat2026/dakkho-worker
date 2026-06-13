// /worker/src/lib/rate-limit.ts

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Preset configurations for different endpoint types
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 login attempts per 15 min
  register: { windowMs: 15 * 60 * 1000, maxRequests: 3 },   // 3 registrations per 15 min per IP
  otp: { windowMs: 5 * 60 * 1000, maxRequests: 3 },         // 3 OTP requests per 5 min
  enroll: { windowMs: 60 * 60 * 1000, maxRequests: 10 },    // 10 enrollments per hour
  payment: { windowMs: 60 * 60 * 1000, maxRequests: 5 },    // 5 payment submissions per hour
  notification: { windowMs: 60 * 1000, maxRequests: 30 },    // 30 notification reads per min
  api: { windowMs: 60 * 1000, maxRequests: 60 },             // 60 general API calls per min
  coupon: { windowMs: 15 * 60 * 1000, maxRequests: 10 },    // 10 coupon validations per 15 min
  stream: { windowMs: 60 * 1000, maxRequests: 30 },           // 30 stream requests per min
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}`;

  try {
    const stored = await kv.get(windowKey, 'json') as { count: number; windowStart: number } | null;

    if (!stored || (now - stored.windowStart) > config.windowMs) {
      // New window or expired window
      await kv.put(windowKey, JSON.stringify({ count: 1, windowStart: now }), {
        expirationTtl: Math.ceil(config.windowMs / 1000) + 10,
      });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
    }

    if (stored.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: stored.windowStart + config.windowMs
      };
    }

    // Increment counter
    await kv.put(windowKey, JSON.stringify({ count: stored.count + 1, windowStart: stored.windowStart }), {
      expirationTtl: Math.ceil(config.windowMs / 1000) + 10,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - stored.count - 1,
      resetAt: stored.windowStart + config.windowMs
    };
  } catch (error) {
    // If KV fails, allow the request (fail open)
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
}

// Helper to create rate limit key from request
export function createRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Simple rate-limit helper for use inside route handlers.
 * Usage: `const limited = await rateLimit(c, 'auth'); if (limited) return limited;`
 * Returns a 429 Response if rate-limited, or null if OK.
 */
export async function rateLimit(c: any, preset: string): Promise<Response | null> {
  const config = RATE_LIMITS[preset];
  if (!config) return null; // unknown preset → skip

  const kv = c.env.KV_CONFIG as KVNamespace;
  const authHeader = c.req.header('Authorization');
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const identifier = authHeader ? authHeader.replace('Bearer ', '').substring(0, 20) : ip;

  const key = createRateLimitKey(preset, identifier);
  const result = await checkRateLimit(kv, key, config);

  // Add rate limit headers
  c.header('X-RateLimit-Remaining', result.remaining.toString());
  c.header('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    return c.json({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }, 429);
  }

  return null;
}

// Hono middleware factory for rate limiting
export function rateLimitMiddleware(prefix: string, config: RateLimitConfig) {
  return async (c: any, next: any) => {
    const kv = c.env.KV_CONFIG as KVNamespace;

    // Get identifier from auth token or IP
    const authHeader = c.req.header('Authorization');
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const identifier = authHeader ? authHeader.replace('Bearer ', '').substring(0, 20) : ip;

    const key = createRateLimitKey(prefix, identifier);
    const result = await checkRateLimit(kv, key, config);

    // Add rate limit headers
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetAt.toString());

    if (!result.allowed) {
      return c.json({
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      }, 429);
    }

    await next();
  };
}
