#!/bin/sh
# Đóng gói plugin: chép mã front-end dùng chung từ bản demo vào plugin, rồi nén zip.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
P="$ROOT/wp-plugin/lumiere-tower"
rm -rf "$P/public" "$P/samples"
mkdir -p "$P/public/css" "$P/public/js" "$P/public/assets" "$P/samples"
cp "$ROOT/css/style.css" "$P/public/css/"
cp "$ROOT/js/data.js" "$ROOT/js/demo-data.js" "$ROOT/js/scene3d.js" "$ROOT/js/app.js" "$P/public/js/"
cp -R "$ROOT/vendor" "$P/public/vendor"
cp "$ROOT/assets/tower.jpg" "$P/public/assets/"
cp -R "$ROOT/assets/interiors" "$P/public/assets/interiors"
cp "$ROOT/samples/sample-apartment.glb" "$P/samples/"
mkdir -p "$ROOT/dist"
rm -f "$ROOT/dist/lumiere-tower.zip"
( cd "$ROOT/wp-plugin" && zip -qr "$ROOT/dist/lumiere-tower.zip" lumiere-tower -x '*.DS_Store' )
echo "Đã tạo: $ROOT/dist/lumiere-tower.zip ($(du -h "$ROOT/dist/lumiere-tower.zip" | cut -f1))"
