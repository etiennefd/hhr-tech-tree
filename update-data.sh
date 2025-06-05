#!/bin/bash

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "Error: Python is not installed"
    exit 1
fi

# Check if yarn is installed, if not, install it
if ! command -v yarn &> /dev/null; then
    echo "Installing yarn..."
    npm install -g yarn
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    yarn install
fi

# Update images first
echo "Updating images..."
python src/scripts/update_images.py --new

# Run the update script
echo "Updating tech tree data..."
NODE_OPTIONS="--no-deprecation" npx tsx src/scripts/fetch-and-save-inventions.ts

# Generate changelog
echo "Generating changelog..."
NODE_OPTIONS="--no-deprecation" npx tsx src/scripts/generate-changelog.ts

# Trigger a rebuild if in production
if [ "$NODE_ENV" = "production" ]; then
    echo "Triggering rebuild..."
    # If using Vercel, trigger a deployment
    if [ -n "$VERCEL_GIT_COMMIT_SHA" ]; then
        echo "Triggering Vercel deployment..."
        curl -X POST "https://api.vercel.com/v1/integrations/deploy/$VERCEL_DEPLOYMENT_ID" \
            -H "Authorization: Bearer $VERCEL_TOKEN"
    fi
fi

echo "Done!" 