#!/bin/sh
# Regenerates the PWA icons in public/icons from public/favicon.svg, the same
# mark the app header shows. Run it after changing the favicon:
#
#   sh scripts/generate-icons.sh
#
# Uses macOS `sips` to rasterize, so no image tooling enters the dependency
# tree. The PNGs are committed, so other platforms never need to run this.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SOURCE="$ROOT/public/favicon.svg"
OUT="$ROOT/public/icons"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# The page background from src/styles/theme.css (--bg).
BACKGROUND='#1a1612'

# The mark's shapes, without the outer <svg> element, so they can be framed
# on a new canvas. Its bounding box is x 3..29, y 4..25 (centre 16, 14.5).
MARK=$(sed -e 's/^<svg[^>]*>//' -e 's/<\/svg>$//' "$SOURCE")

# Writes the mark centred on a square background `size` units wide.
framed() {
  size=$1
  x=$(echo "16 - $size / 2" | bc -l)
  y=$(echo "14.5 - $size / 2" | bc -l)
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s"><rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>%s</svg>' \
    "$x" "$y" "$size" "$size" "$x" "$y" "$size" "$size" "$BACKGROUND" "$MARK"
}

render() {
  sips -s format png -z "$2" "$2" "$1" --out "$3" >/dev/null
}

mkdir -p "$OUT"

# "any" purpose: the favicon itself on a transparent background.
render "$SOURCE" 192 "$OUT/icon-192.png"
render "$SOURCE" 512 "$OUT/icon-512.png"

# Maskable: the platform may crop to a circle of 80% of the width, so the
# mark's diagonal (about 33.4 units) must fit inside it: 33.4 / 0.8 ≈ 42.
framed 42 >"$WORK/maskable.svg"
render "$WORK/maskable.svg" 512 "$OUT/maskable-512.png"

# iOS fills transparency with black and rounds the corners itself, so give it
# an opaque square with a little padding.
framed 36 >"$WORK/apple.svg"
render "$WORK/apple.svg" 180 "$OUT/apple-touch-icon.png"

echo "Icons written to $OUT"
