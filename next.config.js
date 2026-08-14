/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve images directly instead of routing them through Vercel's optimizer.
    // This avoids optimized image request quotas for our mostly static catalog,
    // whose images are already pre-sized WebP files in /public/tech-images.
    //
    // While this is true, next/image renders each `src` as-is, so the optimizer
    // settings (remotePatterns, deviceSizes, imageSizes, formats,
    // minimumCacheTTL, dangerouslyAllowSVG) have no effect. They were removed
    // rather than left here looking active. Remote hosts are not validated
    // either — checked by rendering an upload.wikimedia.org URL with no
    // remotePatterns configured, which loaded without complaint.
    //
    // If this is ever set to false, remotePatterns needs to come back for the
    // hosts the catalog draws on: upload.wikimedia.org (/wikipedia/**),
    // wikimedia.org (/api/**), and patentimages.storage.googleapis.com.
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
