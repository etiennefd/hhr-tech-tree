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
  // Next serves /public with `max-age=0, must-revalidate`, so browsers re-ask
  // for every image on each visit, and each 304 still counts as a Vercel edge
  // request. Let browsers keep them for a day. Not `immutable`: images in
  // /public/tech-images are regularly replaced under the same filename, so a
  // replaced image may show stale for up to a day (up to a week during
  // background revalidation) for returning visitors.
  async headers() {
    const cacheControl = 'public, max-age=86400, stale-while-revalidate=604800'
    return [
      {
        source: '/:all*(jpg|jpeg|png|webp|gif|svg|ico|webmanifest)',
        headers: [{ key: 'Cache-Control', value: cacheControl }],
      },
    ]
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    largePageDataBytes: 128 * 100000, // Increase the limit for large pages
  }
}

module.exports = nextConfig
