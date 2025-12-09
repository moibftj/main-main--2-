import { NextRequest, NextResponse } from "next/server"

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (in production, use Redis or database)
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    const entry = store[key]

    if (entry && entry.resetTime < now) {
      delete store[key]
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
    keyGenerator = (req) => getClientIP(req)
  } = config

  return async function rateLimit(request: NextRequest) {
    const key = keyGenerator(request)
    const now = Date.now()

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }

    // Increment counter
    store[key].count++

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const resetTimeSeconds = Math.ceil((store[key].resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: message,
          retryAfter: resetTimeSeconds
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      )
    }

    // Return headers for successful requests
    const remaining = maxRequests - store[key].count
    const headers = {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': store[key].resetTime.toString()
    }

    return { headers, skipSuccessfulRequests }
  }
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    const [firstForwarded] = forwardedFor.split(',')
    const forwarded = firstForwarded?.trim()

    if (forwarded) {
      return forwarded
    }
  }

  if (realIP) {
    return realIP
  }

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback to unknown
  return 'unknown'
}

// Predefined rate limiters for common use cases

// Strict rate limiter for authentication endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again later."
})

// Medium rate limiter for API endpoints
export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "API rate limit exceeded. Please slow down."
})

// Strict rate limiter for admin endpoints
export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per 15 minutes
  message: "Admin rate limit exceeded. Please try again later."
})

// Letter generation rate limiter
export const letterGenerationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 letters per hour
  message: "Letter generation limit reached. Please try again later."
})

// Subscription rate limiter
export const subscriptionRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 subscription attempts per hour
  message: "Too many subscription attempts. Please contact support if needed."
})

// Helper function to apply rate limiting to API routes
export async function applyRateLimit(
  request: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimit>
): Promise<NextResponse | null> {
  const result = await rateLimiter(request)

  if (result instanceof NextResponse) {
    return result // Rate limit exceeded
  }

  // Rate limit not exceeded, return headers to be added to response
  return null
}