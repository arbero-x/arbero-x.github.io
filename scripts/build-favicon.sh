#!/usr/bin/env sh
# scripts/favicon.html を Edge（ヘッドレス）で撮影して public/ に favicon 一式を作る
cd "$(dirname "$0")/.." || exit 1
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
ROOT="$(pwd -W 2>/dev/null || pwd)"
TMP="$(mktemp -d)"

shot() { # $1=size $2=output $3=query
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --default-background-color=00000000 \
    --window-size="$1,$1" --virtual-time-budget=3000 \
    --screenshot="$2" "file:///$ROOT/scripts/favicon.html?size=$1$3" >/dev/null 2>&1
}

shot 16 "$TMP/16.png"
shot 32 "$ROOT/public/favicon.png"
shot 180 "$ROOT/public/apple-touch-icon.png" "&bg=1"
node scripts/make-ico.mjs public/favicon.ico "$TMP/16.png" public/favicon.png
rm -rf "$TMP"
ls -la public/favicon.ico public/favicon.png public/apple-touch-icon.png
