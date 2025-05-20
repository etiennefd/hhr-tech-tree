Visit [historicaltechtree.com](https://www.historicaltechtree.com/) to see the tech tree. 

## Development notes

To run the app on http://localhost:3000, run `npm run dev`

To update the images (do this before updating data; see below):
- run `python src/scripts/update_images.py --new` (if adding image to recently added techs) or `--all` (if updating all images)
- Then commit the updated images
- This script automatically updates the image credits as well (which will appear once the fetch-and-save script is re-run)
- You can only update the credits, not the images, by adding the argument `--credits-only`

The data on inventions and connections is updated automatically upon deployment to Vercel. To update during development, run: `./update-data.sh`. (This uses the script `src/scripts/fetch-and-save-inventions.ts` but also takes care of dependencies first.)