#!/bin/bash
# Uploads public/tech-images to the Cloudflare Pages project that serves node
# images in production (see src/utils/imageUrl.ts). Pages only uploads files
# whose content changed, so this is cheap to re-run.
#
# Runs from .github/workflows/deploy-images.yml on pushes to main that touch
# the images. To run it by hand, log in once with `npx wrangler login`, or set
# CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Wrangler needs Node 22+; with
# fnm: `fnm exec --using=22 src/scripts/deploy-images.sh`.
set -euo pipefail

cd "$(dirname "$0")/../.."

PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT:-historical-tech-tree-images}"
WRANGLER_VERSION="4.151.1"

# Served at the same paths as on Vercel (/tech-images/<name>.webp), so the app
# only has to swap the origin.
STAGING_DIR="$(mktemp -d)"
trap 'rm -r "$STAGING_DIR"' EXIT
cp -R public/tech-images "$STAGING_DIR/tech-images"
cp cloudflare/images/_headers "$STAGING_DIR/_headers"

npx --yes "wrangler@$WRANGLER_VERSION" pages deploy "$STAGING_DIR" \
  --project-name "$PROJECT_NAME" \
  --branch main \
  --commit-dirty=true
