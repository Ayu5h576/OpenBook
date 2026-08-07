---
name: db-schema
description: Prisma models, UUID PKs, timestamptz, cascade deletes, key indexes
metadata:
  type: project
---

## Database Schema (Prisma)

**8 Model Groups**:

### 1. Auth (User Identity)
- `User`: Email + password hash + timestamps, cascade deletes all user data
- `Profile`: Username, avatar, bio, favorite genres, reading goal
- `RefreshToken`: Hashed token, expiration, revocation support

### 2. Books (Catalog)
- `Book`: Google Books ID, title, authors[], description, cover, page count, categories[], ISBN, ratings
- Indexed on title + authors for fast search

### 3. User Library (Reading Tracking)
- `LibraryEntry`: Links user to book with status + progress
  - Statuses: READING, COMPLETED, PAUSED, DROPPED, ARCHIVED, OWNED
  - Tracks: current page, favorite, pinned, started/finished/last read timestamps
- `ReadingSession`: Per-session tracking (start/end page, duration)
- `BookNote`: User notes on book (with page/chapter)
- `BookHighlight`: Highlighted passages (color, page/chapter)

### 4. Wishlist
- `WishlistEntry`: Book with priority (HIGH, MEDIUM, LOW) + notes

### 5. Collections (Curation)
- `Collection`: User-owned collection (name, description, cover, public/private)
- `CollectionBook`: Many-to-many books in collection (with sort order)

### 6. Reviews & Ratings
- `Review`: User rating (1-10) + title + body per book (unique per user)

### 7. Quotes
- `UserQuote`: Quoted text + page + category

### 8. Goals
- `ReadingGoal`: Yearly targets (books count, page count)

**Technical Patterns**:
- All PKs: `String @id @default(uuid()) @db.Uuid`
- All timestamps: `@db.Timestamptz(6)` (PostgreSQL precision)
- DB column names snake_case via `@map()`, Prisma camelCase
- Cascade deletes on user (orphans all data) and LibraryEntry (orphans notes/highlights)
- Unique constraints prevent duplicate entries (e.g., one review per user per book)
- Indexes on high-cardinality lookups (userId, status, isFavorite, priority)
