#!/usr/bin/env bash
# Regenera los códigos QR del póster como SVG vectorial.
set -euo pipefail
cd "$(dirname "$0")"
DEMO="${1:-https://uniserv.dvergaram.dev/}"
VIDEO="${2:-https://youtu.be/DA2z1RQujNg}"
EVAL="${3:-https://docs.google.com/forms/d/e/1FAIpQLScRQhD_SkG525dieVZZamJYRWMCehdsyV43l5Onv0bMMus1VA/viewform}"
qrencode -t SVG -m 0 -l M -o assets/qr-demo.svg       "$DEMO"
qrencode -t SVG -m 0 -l M -o assets/qr-video.svg      "$VIDEO"
qrencode -t SVG -m 0 -l M -o assets/qr-evaluacion.svg "$EVAL"
printf 'demo       -> %s\nvideo      -> %s\nevaluación -> %s\n' "$DEMO" "$VIDEO" "$EVAL"
