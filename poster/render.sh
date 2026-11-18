#!/usr/bin/env bash
# Genera poster.pdf (tamaño real, texto vectorial) desde poster.html
set -euo pipefail
cd "$(dirname "$0")"
google-chrome-stable --headless --disable-gpu --no-sandbox \
  --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf="$PWD/poster.pdf" "file://$PWD/poster.html" 2>/dev/null
echo "-> $PWD/poster.pdf"
