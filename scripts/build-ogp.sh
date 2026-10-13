#!/usr/bin/env sh
# scripts/ogp.html を Edge（ヘッドレス）で撮影して public/ogp.png を作る
cd "$(dirname "$0")/.." || exit 1
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,1200 --virtual-time-budget=8000 \
  --screenshot="$(pwd -W 2>/dev/null || pwd)/public/ogp.png" \
  "file:///$(pwd -W 2>/dev/null || pwd)/scripts/ogp.html"
