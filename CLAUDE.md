# OpenBook Development Context

**Project**: OpenBook - AI-powered reading platform with immersive 3D visualizations and intelligent recommendations
**Tech Stack**: React 19 + Express + Prisma + PostgreSQL + TypeScript 5.8 + Vite 6
**Current Phase**: Phase 6 In Progress - Performance & Launch (Redis caching + distributed rate limiting wired, test suite expanded, CI/CD + Docker/Railway config landed)

## Development Workflow

- `npm run lint` runs **`tsc --noEmit`** (type-checking only — this project has no ESLint). Run it before considering a change done.
- `npm test` runs the vitest suite. `vitest.config.ts` sets `hookTimeout: 60000` deliberately: the auth integration suite's `beforeAll` imports the whole server module graph through Vite's module runner, which exceeds the 10s default on a cold cache. Don't lower it.
- `tsconfig.json` is **non-strict** (no `strict`, `noUnusedLocals`, or `noUnusedParameters`) — the type-checker will not catch null-deref or unused-symbol mistakes, so guard those by hand.

### Caching & Rate Limiting

- All caching goes through `src/server/cache/cacheService.ts`, **not** `cacheManager` directly. It uses Redis when `REDIS_URL` is set and falls back to the file-based `cacheManager` otherwise. Cached today: AI controller responses, `analyticsService.getStats` (5 min TTL, explicitly invalidated by `invalidateUserStats`), and Google Books search/volume lookups.
- Cache keys for anything containing user input must be **hashed** (see `booksCacheKey` in `bookService.ts`). The file backend sanitizes keys with `/[^a-z0-9]/gi -> '-'`, so raw values like `"a b"` and `"a-b"` collide and would serve each other's results.
- Rate limiting is Redis-backed when available: `RedisRateLimitStore` for the express-rate-limit middleware, and the per-user AI limiter in `ai/utils/rateLimiter.ts`. Both **fail open** on Redis errors — a cache outage must not take the API down.

### Environment Variables
Required:
- `DATABASE_URL`: PostgreSQL connection
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `GEMINI_API_KEY`: Google AI Studio

Optional:
- `ACCESS_TOKEN_TTL`: Default 15m
- `REFRESH_TOKEN_TTL_DAYS`: Default 30
- `APP_URL`: Default http://localhost:5173
- `GOOGLE_BOOKS_API_KEY`: Enables the real book catalog
- `REDIS_URL`: Enables distributed caching + rate limiting. Without it both fall back to per-process stores, which is fine for a single instance but means limits reset per replica.
- `TEST_DATABASE_URL`: Used by the integration tests in place of `DATABASE_URL`. **Set this locally** — without it the auth integration suite creates real users in your dev database.

## Next Steps & Opportunities

### Immediate Priorities
- [x] Reading room (distraction-free reader) implementation — `ReadingRoom.tsx` on live library data with session tracking (PDF rendering still outstanding, see below)
- [x] Club detail UI (discussions + comments threads) — `ClubDetailView` + `useBookClub`/`useDiscussion`, opened from CommunityView
- [x] User profile pages with follow buttons + follower/following lists — `ProfileView` + `useProfile`, reachable from the activity feed, club members/owner/discussion authors, and the Navbar "My Profile" menu
- [ ] Live data streaming for analytics dashboard

### Technical Debt / Blockers
- PDF reader not yet implemented (reading room)
- Audio synthesis utility exists but not integrated with UI
- `noteService`, `profileService`, and `bookService` still have no unit tests
- `.env.supabase-backup` was committed in `5c72a5b` with a live Gemini key, a Supabase service key, and a JWT secret. The file is now untracked and gitignored, but **those credentials remain readable in git history** — they must be rotated, not just removed.

### Performance Considerations
- 3D visualizations may need optimization for large libraries
- Pagination needed for book listings (library entries, collections); activity feed is already cursor-paginated
- Consider caching for book metadata and recommendations — **done**: Google Books lookups (1h search / 7d volume), AI responses, and reading stats now go through `cacheService`

## Project Goals (From README Roadmap)

**Phase 1**: Core infrastructure → Complete
**Phase 2**: Authentication & user system → Complete
**Phase 3**: Book management & reading features → Complete
**Phase 4**: AI & intelligence layer (+ Google Books catalog) → Complete
**Phase 5**: Social & community → Complete
**Phase 6**: Performance & launch (caching, tests, CI/CD, deployment) → In Progress
