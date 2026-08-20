import { NextResponse } from 'next/server'

// Served as a route handler instead of a static public/ file — Next.js/Vercel
// commonly fail to serve files inside dot-prefixed folders (public/.well-known)
// as static assets, which breaks Android's Digital Asset Links verification.
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.autoclickdevis.app',
        sha256_cert_fingerprints: [
          'F2:15:63:89:45:1A:AD:75:A9:D0:00:23:A6:AE:63:22:82:6C:4C:A9:D0:65:27:4A:B7:1D:76:C6:19:41:CA:A4',
        ],
      },
    },
  ])
}
