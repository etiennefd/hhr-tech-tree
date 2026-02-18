#!/bin/bash

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if Python is installed (try python3 first, then python)
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "Error: Python is not installed"
    exit 1
fi

# Use a project venv to avoid PEP 668 externally-managed-environment
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON_CMD -m venv "$VENV_DIR"
fi
VENV_PYTHON="$VENV_DIR/bin/python"
echo "Installing Python dependencies..."
$VENV_PYTHON -m pip install -q -r requirements.txt

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

# Track errors
IMAGE_ERRORS=0
DATA_ERRORS=0
CHANGELOG_ERRORS=0

# Update images first
echo "Updating images..."
if ! $VENV_PYTHON src/scripts/update_images.py --new; then
    IMAGE_ERRORS=1
fi

# Run the update script
echo "Updating tech tree data..."
if ! NODE_OPTIONS="--no-deprecation" npx tsx src/scripts/fetch-and-save-inventions.ts; then
    DATA_ERRORS=1
fi

# Generate changelog
echo "Generating changelog..."
if ! NODE_OPTIONS="--no-deprecation" npx tsx src/scripts/generate-changelog.ts; then
    CHANGELOG_ERRORS=1
fi

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

# Report errors if any occurred
if [ $IMAGE_ERRORS -eq 1 ] || [ $DATA_ERRORS -eq 1 ] || [ $CHANGELOG_ERRORS -eq 1 ]; then
    echo ""
    echo "⚠️  ERRORS DETECTED:"
    [ $IMAGE_ERRORS -eq 1 ] && echo "  - Image processing errors (check output above for details)"
    [ $DATA_ERRORS -eq 1 ] && echo "  - Data update errors"
    [ $CHANGELOG_ERRORS -eq 1 ] && echo "  - Changelog generation errors"
    echo ""
fi 