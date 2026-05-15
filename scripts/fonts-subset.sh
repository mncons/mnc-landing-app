#!/usr/bin/env bash
# fonts-subset.sh — convierte .otf en .fonts-source/ a .woff2 (subset latin + latin-ext)
# Usa pyftsubset directo (fonttools). Requiere python3-fontTools + python3-brotli (apt).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/.fonts-source"
DEST="$ROOT/public/brand/fonts"

# Google Fonts latin + latin-ext range + punctuation MNC usa (· — – ™ ® © « » ¿ ¡ €)
UNICODES='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+00B7,U+2013-2014,U+00A1,U+00BF,U+00AB,U+00BB,U+0100-017F'

declare -A WEIGHT=(
  [extralight]=200
  [light]=300
  [regular]=400
  [demibold]=700
)

[ -d "$SRC" ] || { echo "missing $SRC"; exit 1; }
command -v pyftsubset >/dev/null || { echo "pyftsubset not found (apt install python3-fonttools)"; exit 1; }
mkdir -p "$DEST"

for variant in "${!WEIGHT[@]}"; do
  weight="${WEIGHT[$variant]}"
  src="$SRC/din-2014-narrow-${variant}.otf"
  out="$DEST/din-2014-narrow-${weight}.woff2"
  [ -f "$src" ] || { echo "skip: $src not found"; continue; }
  echo "==> $src -> $out (weight $weight)"
  pyftsubset "$src" \
    --output-file="$out" \
    --flavor=woff2 \
    --unicodes="$UNICODES" \
    --layout-features='*' \
    --no-hinting
done

echo
echo "=== generated ==="
ls -lh "$DEST"
