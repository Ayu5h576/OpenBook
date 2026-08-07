---
name: dev-setup
description: nodemon, build pipeline, Prisma migrations, env config
metadata:
  type: project
---

## Development Setup & Local Environment

**Quick Start**:
```bash
npm install                # Install dependencies
cp .env.example .env       # Copy env template
# Edit .env with DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm run db:migrate        # Apply Prisma migrations
npm run dev               # Start dev server (port 5173)
```

**Development Scripts**:
- `npm run dev` — nodemon watches server.ts, auto-restarts on changes, runs tsx for TypeScript
- `npm run lint` — TypeScript type checking (no build, fast)
- `npm run db:migrate` — Create + apply new Prisma migrations
- `npm run db:generate` — Regenerate Prisma client (usually automatic)
- `npm run db:studio` — Open Prisma Studio browser UI for DB inspection

**Production Scripts**:
- `npm run build` — Vite (frontend) + esbuild (server) → dist/server.cjs
- `npm run start` — Run production build
- `npm run clean` — Remove build artifacts

**Environment Variables** (in `.env`):
```
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/openbook?schema=public
JWT_SECRET=<generate: openssl rand -base64 32>
APP_URL=http://localhost:5173

# Optional
GEMINI_API_KEY=<from Google AI Studio>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
```

**Build Pipeline**:
1. Vite bundles React frontend (src/main.tsx) → dist/
2. esbuild bundles Express server (server.ts) → dist/server.cjs
3. esbuild marks dependencies as external (Prisma, etc. not bundled)
4. Sourcemaps generated for debugging

**Database Setup** (Prerequisite):
```bash
# Create database
createdb -U postgres openbook  # or use psql: CREATE DATABASE openbook;

# Prisma will auto-create schema on first migration
npm run db:migrate
```

**nodemon Config** (in package.json):
```json
"dev": "nodemon --exec tsx server.ts"
```
- Watches all .ts files
- Runs with tsx (transpiles + executes)
- Restarts on any file change

**Hot Module Replacement (HMR)**:
- Frontend: Vite HMR enabled in vite.config.ts
- Backend: nodemon full restart (no HMR, but fast enough for dev)

**Current Issues & Workarounds**:
- .env.example committed (do NOT commit .env with secrets)
- Mock data source still active (data/mockData.ts) — needs API migration
- PostgreSQL required (no SQLite fallback for local dev)
