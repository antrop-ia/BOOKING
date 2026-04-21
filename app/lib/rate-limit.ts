type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_LIMIT = 10

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const now = Date.now()

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, bucket)
    return { ok: true, remaining: limit - 1, resetAt: bucket.resetAt }
  }

  existing.count += 1
  const remaining = Math.max(0, limit - existing.count)
  return {
    ok: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

if (typeof globalThis !== 'undefined' && !('__rateLimitSweep' in globalThis)) {
  ;(globalThis as unknown as { __rateLimitSweep: boolean }).__rateLimitSweep = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, 5 * 60_000).unref?.()
}
