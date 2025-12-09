/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.SUPABASE_HOSTNAME || 'mxhccjykkxbdvchmpqej.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  async headers() {
    const headers = []

    // Apply security headers to all routes
    headers.push({
      source: '/(.*)',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin'
        },
        {
          key: 'X-Permitted-Cross-Domain-Policies',
          value: 'none'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
        }
      ]
    })

    // Additional strict headers for API routes
    headers.push({
      source: '/api/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: process.env.NODE_ENV === 'production'
            ? 'max-age=31536000; includeSubDomains; preload'
            : 'max-age=0'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'none';"
        }
      ]
    })

    // CSP headers are already applied via the '/:path*' pattern above
    // Stripe and Supabase CSP for non-API routes
    headers.push({
      source: '/:path((?!api).*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: process.env.NODE_ENV === 'production'
            ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://js.stripe.com https://*.supabase.co; frame-src 'self' https://js.stripe.com; frame-ancestors 'none';"
            : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://js.stripe.com https://*.supabase.co ws://localhost:* ws://127.0.0.1:*; frame-src 'self' https://js.stripe.com; frame-ancestors 'none';"
        }
      ]
    })

    return headers
  },
}

export default nextConfig
