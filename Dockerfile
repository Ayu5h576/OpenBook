# ============================================================
# Stage 1: Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Production runner
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only install production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy built artefacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Apply pending migrations before serving. railway.toml declares the same start
# command, but Railway builds from this Dockerfile, so this CMD is what actually
# runs — `node dist/server.cjs` alone boots against an unmigrated schema and
# every database-backed route fails with a 500.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.cjs"]
