import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redisUrl = process.env.KV_REST_API_URL || process.env.REDIS_URL
const redisToken = process.env.KV_REST_API_TOKEN

const redis = redisUrl && redisToken
  ? new Redis({
    url: redisUrl,
    token: redisToken,
  })
  : null

function createRateLimiter(prefix: string, limiter: ReturnType<typeof Ratelimit.fixedWindow>) {
  if (!redis) return null

  return new Ratelimit({
    redis,
    limiter,
    analytics: true,
    prefix,
  })
}

// Rate limiters with different configurations
export const authRateLimit = createRateLimiter("auth", Ratelimit.fixedWindow(5, "15 m"))

export const apiRateLimit = createRateLimiter("api", Ratelimit.fixedWindow(100, "1 m"))

export const adminRateLimit = createRateLimiter("admin", Ratelimit.fixedWindow(10, "15 m"))

export const letterGenerationRateLimit = createRateLimiter("letter-gen", Ratelimit.fixedWindow(5, "1 h"))

export const subscriptionRateLimit = createRateLimiter("subscription", Ratelimit.fixedWindow(3, "1 h"))

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
}

// Helper function to apply rate limiting
export async function applyRateLimit(
  request: NextRequest,
  rateLimiter: Ratelimit,
  identifier?: string
): Promise<NextResponse | null> {
  const ip = identifier || getClientIP(request)

  const { success, limit, reset, remaining } = await rateLimiter.limit(ip)

  if (!success) {
    const resetTimeSeconds = Math.ceil((reset - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: resetTimeSeconds,
        limit,
        remaining,
        reset
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': resetTimeSeconds.toString()
        }
      }
    )
  }

  // Return null if rate limit not exceeded
  return null
}

// Fallback to in-memory rate limiting if Redis is not available
export async function safeApplyRateLimit(
  request: NextRequest,
  rateLimiter: Ratelimit | null,
  fallbackLimit: number,
  fallbackWindow: string,
  identifier?: string,
  prefixName?: string
): Promise<NextResponse | null> {
  const fallbackIdentifier = identifier || getClientIP(request)
  const fallbackPrefix = prefixName || 'fallback'

  if (!rateLimiter) {
    return applyFallbackRateLimit(fallbackPrefix, fallbackIdentifier, fallbackLimit, fallbackWindow)
  }

  try {
    return await applyRateLimit(request, rateLimiter, identifier)
  } catch (error) {
    console.warn('[RateLimit] Redis unavailable, falling back to in-memory:', error)

    return applyFallbackRateLimit(fallbackPrefix, fallbackIdentifier, fallbackLimit, fallbackWindow)
  }
}

function parseWindowToMs(window: string): number {
  const units: { [key: string]: number } = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  }

  const match = window.match(/^(\d+)\s*([smhd])$/)
  if (!match) return 60 * 1000 // Default to 1 minute

  const [, num, unit] = match
  return parseInt(num) * (units[unit] || 60 * 1000)
}

function applyFallbackRateLimit(
  prefix: string,
  identifier: string,
  fallbackLimit: number,
  fallbackWindow: string
): NextResponse | null {
  const windowMs = parseWindowToMs(fallbackWindow)

  const now = Date.now()
  const store = global.rateLimitStore || (global.rateLimitStore = new Map())

  const key = `fallback:${prefix}:${identifier}`
  const data = store.get(key) || { count: 0, resetTime: now + windowMs }

  if (data.resetTime < now) {
    data.count = 0
    data.resetTime = now + windowMs
  }

  data.count++
  store.set(key, data)

  if (data.count > fallbackLimit) {
    const resetTimeSeconds = Math.ceil((data.resetTime - now) / 1000)

    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: resetTimeSeconds
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': fallbackLimit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': data.resetTime.toString(),
          'Retry-After': resetTimeSeconds.toString()
        }
      }
    )
  }

  return null
}

// Extend global type for in-memory store
declare global {
  var rateLimitStore: Map<string, { count: number; resetTime: number }> | undefined
}
