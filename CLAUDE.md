# OpenBook Development Context

**Project**: OpenBook - AI-powered reading platform with immersive 3D visualizations and intelligent recommendations
**Tech Stack**: React 19 + Express + Prisma + PostgreSQL + TypeScript 5.8 + Vite 6
**Current Phase**: Phase 6 In Progress - Performance & Launch (Redis caching + distributed rate limiting wired, test suite expanded, CI/CD + Docker/Railway config landed)

## Development Workflow

- `npm run lint` runs **`tsc --noEmit`** (type-checking only — this project has no ESLint). Run it before considering a change done.
- `npm test` runs the vitest suite (`vitest run`). `vitest.config.ts` sets `hookTimeout: 60000` deliberately: the auth integration suite's `beforeAll` imports the whole server module graph through Vite's module runner, which exceeds the 10s default on a cold cache. Don't lower it.
- `npm run scan:secrets` runs `scripts/scan-secrets.sh`, which fails if any **tracked** file contains a credential — that is exactly the set of files that reaches origin. It is the first CI job, and `build` depends on it. Patterns come in two tiers: format matches (JWT, `AIza`, `sk-`, `fe_oa_`) are reported verbatim, while name-based matches (`ANTHROPIC_API_KEY=…`, `postgres://user:pass@…`) are filtered against a placeholder list so `.env.example` and the localhost URLs in the README don't fire. If you add a cred-bearing var, add its format to the strict tier — not the heuristic one.
- `tsconfig.json` is **non-strict** (no `strict`, `noUnusedLocals`, or `noUnusedParameters`) — the type-checker will not catch null-deref or unused-symbol mistakes, so guard those by hand.

### Caching & Rate Limiting

- All caching goes through `src/server/cache/cacheService.ts`, **not** `cacheManager` directly. It uses Redis when `REDIS_URL` is set and falls back to the file-based `cacheManager` otherwise. Cached today: AI controller responses, `analyticsService.getStats` (5 min TTL, explicitly invalidated by `invalidateUserStats`), and Google Books search/volume lookups.
- Cache keys for anything containing user input must be **hashed** (see `booksCacheKey` in `bookService.ts`). The file backend sanitizes keys with `/[^a-z0-9]/gi -> '-'`, so raw values like `"a b"` and `"a-b"` collide and would serve each other's results.
- Rate limiting is Redis-backed when available: `RedisRateLimitStore` for the express-rate-limit middleware, and the per-user AI limiter in `ai/utils/rateLimiter.ts`. Both **fail open** on Redis errors — a cache outage must not take the API down.

### Purchase Offers & Book Media (the "More info" spread)

`BookSpread.tsx` opens a two-page album from the book detail page: `PurchasePanel` (where to buy) on the left, `ScrapbookPanel` (every cover the book has worn) on the right. Backed by `GET /api/books/:id/offers?region=IN|US` and `GET /api/books/:id/media`.

- **Never synthesize a price.** `priceService.ts` returns a price only when a provider actually reported one. Today that is Google Play alone (via `saleInfo` on the Google Books volume) — Amazon's Product Advertising API needs an approved Associates account with qualifying sales, and Flipkart's affiliate API is closed to new signups. Everything else is a deep link from the `STOREFRONTS` table in `storefronts.ts` and renders as "Check price". Adding a real store later = one `PriceProvider` in `PROVIDERS`; the UI needs no change.
- `rankOffers` sorts priced offers ascending, then link-only offers by the storefront table's `order`. A price in a currency other than the region's is **demoted to link-only**, not compared — `9.99 USD` must never sort as cheaper than `349 INR`.
- `bookMediaService.ts` collects collage images from Open Library (work → editions → distinct cover ids) plus an author portrait from Open Library or Wikipedia. Every external call is individually try/caught and the service **never throws** — a third-party outage must still leave the local cover on the page. Cover URLs carry `?default=false` so missing covers 404 and the client can drop them.
- Cache TTLs: offers 6h, media 7d, Google Play `saleInfo` 6h (keyed per country). Null results are cached inside an envelope object, because `cacheService` treats a cached `null` as a miss.

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
- Live per-store prices (Amazon / Kindle / Flipkart) need approved affiliate credentials. Until then the purchase page shows one live price (Google Play) plus deep links — see the Purchase Offers section above. Outbound links carry no affiliate tags yet.
- **Leaked credentials (public repo).** Two separate leaks, both now removed from the tree and gated by `npm run scan:secrets`, but **removal is not a fix — a published key can only be revoked at the provider**:
  - `.env.supabase-backup` (committed in `5c72a5b`, still tracked at HEAD until `e01977f` because an earlier `filter-branch` was never pushed): Supabase service key, Supabase JWT secret, anon key, Gemini key. File deleted — nothing in the codebase references Supabase any more. Since the **JWT secret** itself leaked, anyone can mint arbitrary tokens for project `mypdvrjtqkcjewtgiwks`; rotating the service key alone is not enough, the JWT secret must be rotated (which invalidates all its keys).
  - `.claude/settings.json` (present since the initial commit `8f9d091`): a plaintext third-party `ANTHROPIC_API_KEY` for `cc.freemodel.dev` plus an `apiKeyHelper` echoing the same literal.
  - Status: `GEMINI_API_KEY` and `JWT_SECRET` verified rotated (local values differ from the leaked ones). **Still to revoke: the Supabase JWT secret / service key, and the `fe_oa_…` freemodel key.** Both remain in git history; history was deliberately *not* rewritten, since force-pushing cannot un-publish them.

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
