#!/bin/bash
# Script to start Chrome with CSP disabled for local development
# This allows wallet extensions to work properly

echo "🚀 Starting Chrome with CSP disabled for wallet extensions..."
echo "⚠️  WARNING: This disables web security - ONLY use for localhost development!"

# Close existing Chrome instances (optional)
# killall "Google Chrome" 2>/dev/null || true

# Start Chrome with disabled web security
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --disable-web-security \
  --user-data-dir="/tmp/chrome-dev-no-csp" \
  --disable-features=VizDisplayCompositor \
  http://localhost:3000

echo "✅ Chrome started. Navigate to http://localhost:3000 if it didn't open automatically."
