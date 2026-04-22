#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MODEL_DIR="$ROOT_DIR/services/media-pipeline/models/rnnoise"
MODEL_PATH="$MODEL_DIR/sh.rnnn"

mkdir -p "$MODEL_DIR"

curl -LfsS "https://raw.githubusercontent.com/GregorR/rnnoise-models/master/somnolent-hogwash-2018-09-01/sh.rnnn" -o "$MODEL_PATH"

echo "OK: RNNoise model salvo em $MODEL_PATH"

