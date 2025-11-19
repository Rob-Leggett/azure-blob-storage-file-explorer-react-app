/** @type {import('next').NextConfig} */

const API_HEADERS = [
  {
    key: 'Access-Control-Allow-Origin',
    value: [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://veritas-ui-bvamcke4bjccepfy.australiaeast-01.azurewebsites.net',
    ].join(','),
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET,POST,PUT,DELETE,OPTIONS',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization',
  },
]

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // NOTE - this is a workaround for an issue with next-auth@5.0.0-beta.25 and next@15.0.0
  // @see https://github.com/nextauthjs/next-auth/discussions/10058
  transpilePackages: ['next-auth'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: API_HEADERS,
      },
    ]
  },
}

export default nextConfig
