import createNextIntlPlugin from 'next-intl/plugin'
import withPWAInit from '@ducanh2912/next-pwa'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  workboxOptions: {
    // /api/* is proxied to the backend and carries the session cookie —
    // the default runtime caching would cache those responses (NetworkFirst,
    // 24h) in Cache Storage. Force NetworkOnly so quote/client data is never
    // persisted by the service worker. Must be first: workbox uses the first
    // matching route.
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Proxy /api/* to the backend so the browser sees same-origin requests.
  // This lets the HttpOnly session cookie (set by the backend) live on the
  // frontend's own domain, which the Next.js middleware reads to guard routes —
  // it can't read a cookie set on a different domain (Render vs Vercel).
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default withPWA(withNextIntl(nextConfig))
