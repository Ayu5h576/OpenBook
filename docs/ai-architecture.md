# AI Architecture

Phase 4 adds a Gemini-powered AI layer that is separated from book/library business logic.

## Backend Structure

- `src/server/ai/services/aiService.ts`: Gemini client, model invocation, token estimation, usage logging hook.
- `src/server/ai/services/aiDataService.ts`: Aggregates authenticated user data from Prisma.
- `src/server/ai/services/conversationHistoryManager.ts`: In-memory per-user/per-book chat history with TTL.
- `src/server/ai/templates/prompts.ts`: Central prompt builder for every AI feature.
- `src/server/ai/utils/responseFormatter.ts`: JSON parsing and response normalization.
- `src/server/ai/utils/offlineFallback.ts`: Personalized deterministic fallbacks from real user data.
- `src/server/ai/cache/cacheManager.ts`: File-backed TTL cache, Redis-ready boundary.
- `src/server/ai/utils/rateLimiter.ts`: Per-user in-memory AI request limits.
- `src/server/ai/controllers/aiController.ts`: Authenticated API orchestration only.
- `src/server/routes/aiRoutes.ts`: Protected `/api/ai/*` route mount.

## Data Sources

AI prompts are built from authenticated user data only:

- Library entries and statuses
- Reading sessions and reading speed
- Wishlist entries and priorities
- Collections
- Reviews and ratings
- Notes, highlights, and quotes where relevant
- Reading goals
- Book metadata imported from Google Books

## Safety And Fallbacks

Gemini is optional. If `GEMINI_API_KEY` is missing or a model call fails, OpenBook returns deterministic fallbacks derived from the user's database profile. The system does not return stock recommendation lists for personalized features.

## Performance

- Expensive AI responses are cached with feature-specific TTLs.
- Rate limits are per authenticated user.
- Frontend requests use typed API clients and retryable hooks.
- Token usage is estimated and logged through a central hook for future persistence.
