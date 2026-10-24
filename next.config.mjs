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
