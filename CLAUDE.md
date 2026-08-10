# OpenBook Development Context

**Project**: OpenBook - AI-powered reading platform with immersive 3D visualizations and intelligent recommendations
**Tech Stack**: React 19 + Express + Prisma + PostgreSQL + TypeScript 5.8 + Vite 6
**Current Phase**: Phase 5 Complete - Social & Community (followers, book clubs, discussions, activity feed, achievements)

## Architecture Overview

### Frontend (React + Vite)
- **Entry**: `src/main.tsx` → `src/App.tsx` 
- **Views**: 13 view components in `src/views/` (HomeView, LibraryView, BookDetailView, etc.)
- **Components**: Feature-rich UI components with 3D/interactive visualizations
  - 3D visualizations: `BookCard3D`, `InteractiveBookshelf3D`, `WishlistGalaxy`
  - Analysis: `BookDNA`, `BookMemories`, `ReadingCompass`
  - Collections: `SmartPlanner`, `QuoteWall`
- **Styling**: Tailwind CSS 4 with Motion animations
- **State Management**: React Context (AuthContext) + custom hooks
- **Data Fetching**: `src/services/api.ts` for backend communication

### Backend (Express)
- **Entry**: `server.ts` - Express configuration with SSR support
- **Routes**: Modular route files in `src/server/routes/`
  - `authRoutes`: User signup/login/token refresh
  - `bookRoutes`, `libraryRoutes`, `collectionRoutes`, `reviewRoutes`, `analyticsRoutes`, `wishlistRoutes`
  - `aiRoutes`: Gemini reading companion endpoints
  - `socialRoutes`, `bookClubRoutes`, `achievementRoutes`: Phase 5 social & community
- **Controllers**: Business logic in `src/server/controllers/`
- **Services**: Data layer in `src/server/services/`
  - `authService`: Auth logic, password hashing (bcrypt), JWT tokens (jose)
  - `libraryService`, `bookService`, `profileService`, `collectionService`, etc.
  - `socialService` (follow graph + activity feed + `recordActivity` helper), `bookClubService`, `achievementService`
- **Middleware**: Auth verification, error handling
- **Validators**: Zod schemas for request validation

### Database (PostgreSQL + Prisma)
**Schemas** (in `prisma/schema.prisma`):
1. **Auth**: `User`, `Profile`, `RefreshToken`
2. **Books**: `Book` (catalog, indexed by title/authors)
3. **User Library**: `LibraryEntry` (statuses: READING, COMPLETED, PAUSED, DROPPED, ARCHIVED, OWNED)
   - Related: `ReadingSession`, `BookNote`, `BookHighlight`
4. **Wishlist**: `WishlistEntry` (priorities: HIGH, MEDIUM, LOW)
5. **Collections**: `Collection`, `CollectionBook`
6. **Reviews**: `Review` (per book, unique per user)
7. **Quotes**: `UserQuote` (tracked per book)
8. **Goals**: `ReadingGoal` (yearly targets)
9. **Social** (Phase 5): `Follow` (directed follow graph), `Activity` (feed events, `ActivityType` enum + `metadata` jsonb)
10. **Book Clubs** (Phase 5): `BookClub`, `BookClubMember` (`ClubRole`: OWNER/MODERATOR/MEMBER), `Discussion`, `DiscussionComment`
11. **Achievements** (Phase 5): `UserAchievement` (persisted unlocks; catalog defined in code)

**Key Patterns**:
- UUIDs as primary keys (`@db.Uuid`)
- Timestamptz for all timestamps
- Snake_case DB columns, camelCase in Prisma
- Cascade deletes for user-owned data
- Indexes on frequently queried columns (userId, status, isFavorite)

## Development Workflow

### Scripts
```bash
npm run dev          # Dev server (nodemon + tsx, port 5173)
npm run build        # Vite + esbuild for production
npm run start        # Run production build
npm run lint         # TypeScript type checking
npm run db:migrate   # Apply Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Browse DB in Prisma Studio
```

### Environment Variables
Required:
- `DATABASE_URL`: PostgreSQL connection
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `GEMINI_API_KEY`: Google AI Studio

Optional:
- `ACCESS_TOKEN_TTL`: Default 15m
- `REFRESH_TOKEN_TTL_DAYS`: Default 30
- `APP_URL`: Default http://localhost:5173

## Recent Completed Work (Latest Commits)

1. **Phase 5 Complete**: Social & community - book clubs, activity feed, achievements (latest)
2. **Phase 4.5**: Google Books catalog integration + session persistence fix
3. **Phase 4 Complete**: AI reading companion (Gemini) using authenticated user data
4. **Phase 3 Complete**: Book management system with live data (a08b659)
5. **Auth System**: Complete auth (JWT + refresh rotation), validation, AuthContext wiring

### Key Auth Implementation Details
- JWT tokens (access + refresh) via `jose` library
- Password hashing with `bcryptjs`
- AuthContext provides `user` state and auth methods
- Protected routes via `ProtectedRoute` component
- Token validation middleware on all protected endpoints

## Known Patterns & Conventions

- **Error Handling**: Express async error wrapper + centralized error middleware
- **Validation**: Zod schemas in `src/server/validators/`
- **Types**: Centralized in `src/types.ts` and `src/server/types/index.ts`
- **Mock Data**: `src/data/mockData.ts` (development placeholder)
- **API Calls**: Centralized in `src/services/api.ts` with auth token attachment
- **Hooks**: Custom hooks for data fetching (useLibrary, useBookSearch, useCollections, useAnalytics, useWishlist, useBookClubs, useActivityFeed, useAchievements)

## Next Steps & Opportunities

### Immediate Priorities
- [ ] Reading room (distraction-free reader) implementation
- [ ] Club detail UI (discussions + comments threads) — backend ready at `/api/clubs/:id/discussions`
- [ ] User profile pages with follow buttons + follower/following lists (backend ready at `/api/social`)
- [ ] Live data streaming for analytics dashboard

### Technical Debt / Blockers
- Mock data needs replacement with real API calls
- PDF reader not yet implemented (reading room)
- Audio synthesis utility exists but not integrated with UI
- Club discussions/comments have backend + API client but no dedicated view yet

### Performance Considerations
- 3D visualizations may need optimization for large libraries
- Pagination needed for book listings (library entries, collections); activity feed is already cursor-paginated
- Consider caching for book metadata and recommendations

## Project Goals (From README Roadmap)

**Phase 1**: Core infrastructure → Complete
**Phase 2**: Authentication & user system → Complete
**Phase 3**: Book management & reading features → Complete
**Phase 4**: AI & intelligence layer (+ Google Books catalog) → Complete
**Phase 5**: Social & community → Complete
**Phase 6**: Performance & launch (caching, tests, CI/CD, deployment) → Upcoming
