/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/**',
      },
      {
        protocol: 'https',
        hostname: 'wikimedia.org',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'patentimages.storage.googleapis.com',
        pathname: '/**',
      }
    ],
    minimumCacheTTL: 60 * 60 * 24 * 31, // 31 days
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 256, 320],
    formats: ['image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true,
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    largePageDataBytes: 128 * 100000, // Increase the limit for large pages
  }
}

module.exports = nextConfig