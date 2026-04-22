FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install ALL deps (devDeps needed for build: tsx, esbuild, vite)
RUN npm ci

# Copy source (node_modules excluded via .dockerignore)
COPY . .

# Build client and server
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install only prod deps in a clean Linux environment (no Mac binaries)
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./

# Create uploads directory
RUN mkdir -p /app/public/uploads /app/public/media-jobs /app/public/voice-jobs

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run
CMD ["node", "dist/index.cjs"]
