FROM python:3.11-slim

# System deps: ffmpeg (required by pydub/moviepy/demucs), git (for pip installs)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        build-essential \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Runtime dirs (Railway ephemeral storage — persist via volume if needed)
RUN mkdir -p uploads outputs jobs

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
