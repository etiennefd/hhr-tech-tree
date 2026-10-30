// Node images live in /public/tech-images, but in production they're served
// from a separate host (a Cloudflare Pages project, uploaded by
// src/scripts/deploy-images.sh) so that the thousands of image requests don't
// count towards Vercel's CDN request tier. The copies in /public stay deployed
// as a fallback for images the external host doesn't have yet.
//
// Unset (local dev, preview deployments), every image is served by Next as
// before.
export const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");

const EXTERNALLY_HOSTED_PREFIX = "/tech-images/";

// The URL to request first for a node image path such as
// "/tech-images/abacus.webp". Anything else (remote URLs, the placeholder, the
// special stone tool images) is returned unchanged.
export function externalImageUrl(path: string): string {
  if (!IMAGE_BASE_URL || !path.startsWith(EXTERNALLY_HOSTED_PREFIX)) return path;
  return IMAGE_BASE_URL + path;
}
