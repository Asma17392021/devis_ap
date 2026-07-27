import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

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

export default withNextIntl(nextConfig)
