# OpenBook Development Context

**Project**: OpenBook - AI-powered reading platform with immersive 3D visualizations and intelligent recommendations
**Tech Stack**: React 19 + Express + Prisma + PostgreSQL + TypeScript 5.8 + Vite 6
**Current Phase**: Phase 3 - Book Management System with Live Data

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
- **Controllers**: Business logic in `src/server/controllers/`
- **Services**: Data layer in `src/server/services/`
  - `authService`: Auth logic, password hashing (bcrypt), JWT tokens (jose)
  - `libraryService`, `bookService`, `profileService`, `collectionService`, etc.
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

1. **Phase 3 Complete**: Book management system with live data (a08b659)
2. **Auth Validation**: Real-time signup validation + Prisma migration (08e13df)
3. **Auth UI Integration**: AuthContext wiring with UI (d80cc84)
4. **Dev Setup**: Added nodemon auto-restart, fixed .env.example security (ca97dd5)
5. **Auth System**: Complete Supabase integration (fd7df2c)

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
- **Hooks**: Custom hooks for data fetching (useLibrary, useBookSearch, useCollections, useAnalytics, useWishlist)

## Next Steps & Opportunities

### Immediate Priorities
- [ ] Book catalog integration (Google Books API or similar)
- [ ] Reading room (distraction-free reader) implementation
- [ ] Live data streaming for analytics dashboard
- [ ] Collection management UI completion

### Technical Debt / Blockers
- Mock data needs replacement with real API calls
- PDF reader not yet implemented (reading room)
- Audio synthesis utility exists but not integrated with UI
- Community features (followers, book clubs) are views only, no backend

### Performance Considerations
- 3D visualizations may need optimization for large libraries
- Pagination needed for book listings (library entries, collections)
- Consider caching for book metadata and recommendations

## Project Goals (From README Roadmap)

**Phase 1** (Current): Core infrastructure → 95% complete
**Phase 2**: Book management & reading features
**Phase 3**: AI & intelligence layer
**Phase 4**: Social & community
**Phase 5**: Mobile app
**Phase 6**: Advanced features (search, themes, monetization)
