Visit [historicaltechtree.com](https://www.historicaltechtree.com/) to see the tech tree. 

## License

**Code**: This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Data**: The dataset of technologies and connections, and associated data files, are not covered by the MIT license and remain under copyright. All rights reserved.

## Development notes

To run the app on http://localhost:3000, run `npm run dev`

The data on inventions and connections is updated automatically upon deployment to Vercel. To update during development, run
`./update-data.sh`
This:
- runs the image update script (see below) with argument `--new`
- runs the script `src/scripts/fetch-and-save-inventions.ts` to create the JSON data, taking care of dependencies first.

To update the images (automatically part of the update script above for new techs):
- run `python src/scripts/update_images.py --new` (if adding image to recently added techs) or `--all` (if updating all images)
- Then commit the updated images
- This script automatically updates the image credits as well (which will appear once the fetch-and-save script is re-run)
- You can only update the credits, not the images, by adding the argument `--credits-only`

In production, node images are served from a Cloudflare Pages project rather than by Vercel, so that image requests don't count towards Vercel's CDN request tier. The app requests `$NEXT_PUBLIC_IMAGE_BASE_URL/tech-images/<name>.webp` first and falls back to the copy in `public/tech-images` if that fails; with the variable unset (local dev, preview deployments) it uses the local copy only.
- Pushing image changes to `main` uploads them through `.github/workflows/deploy-images.yml`, which needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets
- To upload by hand, run `src/scripts/deploy-images.sh` (after `npx wrangler login` once)
