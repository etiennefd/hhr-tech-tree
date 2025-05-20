#!/bin/bash

# Ensure we're in the right directory
cd "$(dirname "$0")"

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

# Run the update script
echo "Updating tech tree data..."
NODE_OPTIONS="--no-deprecation" npx tsx src/scripts/fetch-and-save-inventions.ts

echo "Done!" 