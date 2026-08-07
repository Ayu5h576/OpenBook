---
name: code-patterns
description: Error handling, Zod validation, centralized API service, custom data hooks
metadata:
  type: project
---

## Code Architecture & Patterns

**Error Handling**:
- Express async error wrapper imported globally (`express-async-errors`)
- Centralized error middleware in `src/server/middlewares/errorHandler.ts`
- All thrown errors caught and formatted as JSON responses
- No try-catch boilerplate in controller functions

**Validation**:
- Zod schemas defined in `src/server/validators/auth.ts`, `validators/books.ts`
- Parse request body in controller: `const data = signupSchema.parse(req.body)`
- Zod throws on mismatch, caught by error middleware
- Frontend real-time validation (before submission)

**API Communication**:
- Centralized `src/services/api.ts` with fetch wrapper
- Automatically attaches auth token to all requests
- Handles errors, retries, response parsing
- Replaces mock data calls during migration to real APIs

**Frontend State Management**:
- AuthContext for global user state (login/logout)
- Custom hooks for data fetching:
  - `useLibrary()` — Library entries with filtering
  - `useBookSearch()` — Search + filter books
  - `useCollections()` — User collections CRUD
  - `useAnalytics()` — Reading stats
  - `useWishlist()` — Wishlist management
- Each hook manages loading/error/data state

**Type Safety**:
- Centralized `src/types.ts` (frontend types)
- Centralized `src/server/types/index.ts` (backend types)
- Prisma auto-generates types from schema
- All function parameters typed

**Folder Organization**:
```
src/server/
  ├── controllers/    — HTTP handlers (thin, delegate to services)
  ├── services/       — Business logic (auth, library, books, etc.)
  ├── routes/         — Route definitions (mounted in server.ts)
  ├── middlewares/    — Auth, error handling
  ├── validators/     — Zod schemas
  ├── config/         — Prisma, environment
  ├── utils/          — Tokens, errors
```

**Service Layer Pattern**:
- Service = data fetching + business logic
- Controller = parse request + call service + format response
- Routes = path + HTTP method + controller function
- Loosely coupled via dependency injection (Prisma client injected)
