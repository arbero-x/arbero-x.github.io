#!/usr/bin/env sh
# scripts/ogp.html を Edge（ヘッドレス）で撮影して public/ogp.png を作る
cd "$(dirname "$0")/.." || exit 1
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
OUT=public/ogp.png
TMP=public/ogp.new.png
rm -f "$TMP"
# 普段の Edge（裏で起動したままのことがある）に処理を渡さず、毎回まっさらな Edge で撮るために専用のプロファイルを使う
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT
"$EDGE" --user-data-dir="$(cd "$PROFILE" && (pwd -W 2>/dev/null || pwd))" --no-first-run --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,1200 --virtual-time-budget=8000 \
  --screenshot="$(pwd -W 2>/dev/null || pwd)/$TMP" \
  "file:///$(pwd -W 2>/dev/null || pwd)/scripts/ogp.html"

# Windows の Edge はすぐに戻ってきて、画像は数秒後に書き出される。できるまで待つ（最大 30 秒）
i=0
while [ ! -s "$TMP" ] && [ $i -lt 30 ]; do sleep 1; i=$((i + 1)); done
if [ ! -s "$TMP" ]; then
  echo "ogp.png を書き出せませんでした（Edge の場所は EDGE=... で指定できます）" >&2
  exit 1
fi
sleep 1 # 書き込みの途中で動かさないよう、念のため少し待つ
mv -f "$TMP" "$OUT"
echo "書き出しました：$OUT"
