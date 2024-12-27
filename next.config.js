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
  },
}

module.exports = nextConfig