#!/bin/sh
# Render social/card.html to og.png (1200x630). Needs Google Chrome; run after `node build.js`.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-color-profile=srgb \
  --blink-settings=preferredColorScheme=1 --allow-file-access-from-files \
  --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot="$PWD/og.png" "file://$PWD/social/card.html"
echo "og.png written"
