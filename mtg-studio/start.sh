#!/bin/bash
# Dubbing Mixer Pro — LOCAL start script (macOS/Homebrew)
# For Railway: the Dockerfile CMD handles startup automatically.
# Requires: Homebrew ffmpeg at /opt/homebrew/opt/ffmpeg/lib

export PATH="/opt/homebrew/bin:$PATH"
export DYLD_LIBRARY_PATH="/opt/homebrew/opt/ffmpeg/lib${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"

exec .venv/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
