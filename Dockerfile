FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./
COPY client/package*.json ./client/

# Install ALL dependencies (dev included) so tsx/vite/esbuild are available
RUN npm ci

# Copy source
COPY . .

# Build client and server
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.npmrc ./

# Install all dependencies including devDependencies so drizzle-kit
# is available for the preDeployCommand ("npm run db:push")
RUN npm ci

# Create uploads directory
RUN mkdir -p /app/public/uploads /app/public/media-jobs /app/public/voice-jobs

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run
CMD ["node", "dist/index.cjs"]
