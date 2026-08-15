# OpenBook Development Context

**Project**: OpenBook - AI-powered reading platform with immersive 3D visualizations and intelligent recommendations
**Tech Stack**: React 19 + Express + Prisma + PostgreSQL + TypeScript 5.8 + Vite 6
**Current Phase**: Phase 5 Complete - Social & Community (followers, book clubs, discussions, activity feed, achievements)

## Development Workflow

- `npm run lint` runs **`tsc --noEmit`** (type-checking only — this project has no ESLint). Run it before considering a change done.
- `tsconfig.json` is **non-strict** (no `strict`, `noUnusedLocals`, or `noUnusedParameters`) — the type-checker will not catch null-deref or unused-symbol mistakes, so guard those by hand.

### Environment Variables
Required:
- `DATABASE_URL`: PostgreSQL connection
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `GEMINI_API_KEY`: Google AI Studio

Optional:
- `ACCESS_TOKEN_TTL`: Default 15m
- `REFRESH_TOKEN_TTL_DAYS`: Default 30
- `APP_URL`: Default http://localhost:5173

## Next Steps & Opportunities

### Immediate Priorities
- [ ] Reading room (distraction-free reader) implementation
- [x] Club detail UI (discussions + comments threads) — `ClubDetailView` + `useBookClub`/`useDiscussion`, opened from CommunityView
- [x] User profile pages with follow buttons + follower/following lists — `ProfileView` + `useProfile`, reachable from the activity feed, club members/owner/discussion authors, and the Navbar "My Profile" menu
- [ ] Live data streaming for analytics dashboard

### Technical Debt / Blockers
- Mock data needs replacement with real API calls
- PDF reader not yet implemented (reading room)
- Audio synthesis utility exists but not integrated with UI

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
