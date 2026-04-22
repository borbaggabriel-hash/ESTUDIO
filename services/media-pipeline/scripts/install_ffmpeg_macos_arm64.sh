#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BIN_DIR="$ROOT_DIR/services/media-pipeline/bin"
TMP_DIR="$(mktemp -d)"

mkdir -p "$BIN_DIR"

ZIP_URL="https://evermeet.cx/ffmpeg/getrelease/zip"
ZIP_PATH="$TMP_DIR/ffmpeg.zip"

curl -LfsS "$ZIP_URL" -o "$ZIP_PATH"
unzip -q "$ZIP_PATH" -d "$TMP_DIR"

if [ ! -f "$TMP_DIR/ffmpeg" ]; then
  echo "Falha: binário ffmpeg não encontrado no zip baixado."
  exit 1
fi

mv -f "$TMP_DIR/ffmpeg" "$BIN_DIR/ffmpeg"
chmod +x "$BIN_DIR/ffmpeg"

"$BIN_DIR/ffmpeg" -version | head -n 2

echo "OK: ffmpeg instalado em $BIN_DIR/ffmpeg"
