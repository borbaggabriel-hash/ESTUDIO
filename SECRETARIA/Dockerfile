FROM node:20-alpine AS builder

WORKDIR /app

# Build-time args for Vite (embedded into the JS bundle)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy manifests first (layer cache)
COPY package*.json ./

# Install ALL deps (devDeps needed: tsx, esbuild, vite)
RUN npm ci

# Copy source (node_modules excluded via .dockerignore)
COPY . .

# Build Vite frontend + Express server bundle
RUN npm run build

# ── Production image ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install only prod deps in clean Linux x64 environment
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
# dist/          → Vite SPA (index.html + assets)
# dist/server.cjs → Express server bundle
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/me', (r) => process.exit(r.statusCode < 500 ? 0 : 1))"

CMD ["node", "dist/server.cjs"]
