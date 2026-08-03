# OpenBook - Folder Structure & Organization Guide

This document describes the current project folder structure and provides recommendations for future improvements as the project scales.

---

## 📁 Current Project Structure

```
openbook/
├── .claude/                 # Claude Code configuration
├── src/                     # Source code directory
│   ├── components/          # Reusable React components
│   │   ├── BookCard3D.tsx
│   │   ├── BookDNA.tsx
│   │   ├── BookMemories.tsx
│   │   ├── InteractiveBookshelf3D.tsx
│   │   ├── Navbar.tsx
│   │   ├── QuoteWall.tsx
│   │   ├── ReadingCompass.tsx
│   │   ├── ReadingRoom.tsx
│   │   ├── RecommendedForYou.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── SmartPlanner.tsx
│   │   └── WishlistGalaxy.tsx
│   ├── views/               # Page-level components (routes)
│   │   ├── AchievementsView.tsx
│   │   ├── AuthorView.tsx
│   │   ├── AuthView.tsx
│   │   ├── BookDetailView.tsx
│   │   ├── CollectionsView.tsx
│   │   ├── CommunityView.tsx
│   │   ├── ExploreView.tsx
│   │   ├── HomeView.tsx
│   │   ├── LandingView.tsx
│   │   ├── LibraryView.tsx
│   │   ├── ReaderView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── StatisticsView.tsx
│   │   └── WishlistView.tsx
│   ├── data/                # Mock data and seed data
│   │   └── mockData.ts
│   ├── utils/               # Utility functions
│   │   └── audioSynth.ts
│   ├── types.ts             # Centralized type definitions
│   ├── App.tsx              # Root application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets (if exists)
├── server.ts                # Express server
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind configuration
├── package.json             # Dependencies and scripts
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── LICENSE                  # MIT License
└── GITHUB_ISSUES_MILESTONES.md  # Issues and milestones template
```

---

## 📊 Current Structure Analysis

### ✅ Strengths

1. **Clear Separation of Concerns**
   - `components/` for reusable UI components
   - `views/` for page-level components
   - `data/` for data management
   - `utils/` for helper functions
   - `types.ts` for centralized types

2. **Scalable Component Organization**
   - Components are logically grouped
   - Easy to locate specific components
   - Clear naming conventions

3. **Frontend-Focused Structure**
   - Optimized for React/frontend development
   - Easy to manage UI components

### ⚠️ Potential Improvements for Growth

1. **Constants Management**
   - Currently no dedicated constants folder
   - Constants may be scattered in components or types.ts
   - **Recommendation**: Create `src/constants/` when constants grow

2. **Custom Hooks**
   - No dedicated hooks folder yet
   - **Recommendation**: Create `src/hooks/` when custom hooks are introduced

3. **API/Backend Integration**
   - No services or API layer folder
   - Currently using mock data
   - **Recommendation**: Create `src/services/` when backend is integrated

4. **Styling Organization**
   - Global styles in `src/index.css`
   - No component-specific styles folder
   - **Recommendation**: Keep as is (Tailwind CSS handles this)

---

## 🚀 Recommended Future Structure (Phases)

### Phase 1: Current (Frontend Focus)
```
src/
├── components/
├── views/
├── data/
├── utils/
├── types.ts
├── App.tsx
└── main.tsx
```
✅ **Current state** - No changes needed

---

### Phase 2: Adding Custom Logic (Post-Backend Integration)
```
src/
├── components/
├── views/
├── data/           # Rename to 'mocks' if mock data is no longer primary
├── services/       # NEW: API calls and external integrations
│   ├── bookService.ts
│   ├── userService.ts
│   ├── recommendationService.ts
│   └── geminiService.ts
├── hooks/          # NEW: Custom React hooks
│   ├── useBook.ts
│   ├── useUser.ts
│   ├── useRecommendations.ts
│   └── useFetch.ts
├── constants/      # NEW: Application constants
│   ├── config.ts
│   ├── routes.ts
│   ├── messages.ts
│   └── genres.ts
├── utils/
├── types.ts
├── App.tsx
└── main.tsx
```

### Phase 3: Advanced Organization (Scale)
```
src/
├── components/
│   ├── common/              # Shared components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Button.tsx
│   ├── book/                # Book-related components
│   │   ├── BookCard3D.tsx
│   │   ├── BookDNA.tsx
│   │   └── BookMemories.tsx
│   ├── reader/              # Reader-specific components
│   │   ├── ReadingRoom.tsx
│   │   └── ReadingCompass.tsx
│   ├── social/              # Community components
│   │   ├── QuoteWall.tsx
│   │   └── AuthorView.tsx
│   └── ui/                  # Pure UI components
│       └── Skeleton.tsx
├── views/
│   ├── auth/
│   ├── home/
│   ├── library/
│   └── community/
├── services/
│   ├── api/
│   │   ├── bookService.ts
│   │   ├── userService.ts
│   │   └── client.ts
│   ├── ai/
│   │   └── geminiService.ts
│   └── auth/
│       └── authService.ts
├── hooks/
│   ├── useBook.ts
│   ├── useUser.ts
│   └── useFetch.ts
├── constants/
│   ├── config.ts
│   ├── routes.ts
│   └── messages.ts
├── types/
│   ├── index.ts
│   ├── book.ts
│   ├── user.ts
│   └── community.ts
├── utils/
│   ├── audioSynth.ts
│   ├── formatters.ts
│   └── validators.ts
├── styles/
│   ├── index.css
│   ├── variables.css
│   └── components.css
├── App.tsx
└── main.tsx
```

---

## 🔄 Migration Path

### When to Reorganize

1. **Add Services Folder**: When backend integration starts
   - Move mock data calls to services
   - Create API client utilities
   - Add authentication service

2. **Add Hooks Folder**: When custom hooks are introduced
   - Extract component logic into hooks
   - Create reusable hook utilities
   - Share state management logic

3. **Add Constants Folder**: When app grows
   - Extract hardcoded strings
   - Centralize configuration values
   - Organize route definitions

4. **Organize Components by Feature**: When component count exceeds 20-30
   - Group related components
   - Create feature-specific folders
   - Maintain clear hierarchy

### Safe Migration Checklist

- [ ] Create new folder structure
- [ ] Move files incrementally
- [ ] Update import paths in affected files
- [ ] Run TypeScript type checking (`npm run lint`)
- [ ] Test application in browser (`npm run dev`)
- [ ] Verify all features work without errors
- [ ] Commit changes with clear messages
- [ ] Update documentation

---

## 📋 File Organization Best Practices

### Component Files
```typescript
// ✅ Good: Named exports for reusability
export function BookCard3D(props: BookCardProps) {
  // Component logic
}

// Default export for route components
export default BookCard3D;
```

### Utility Files
```typescript
// ✅ Good: Named exports for multiple utilities
export function formatDate(date: Date): string { }
export function parsePrice(price: string): number { }
export function calculateReadingTime(words: number): number { }
```

### Type Files
```typescript
// ✅ Good: Centralize related types
export interface Book {
  id: string;
  title: string;
  // ...
}

export interface BookProps {
  book: Book;
  onClick?: () => void;
}
```

---

## 🎯 Naming Conventions

### Files & Folders
- **Components**: `PascalCase.tsx` (e.g., `BookCard3D.tsx`)
- **Views/Pages**: `PascalCaseView.tsx` (e.g., `HomeView.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `audioSynth.ts`)
- **Folders**: `lowercase` (e.g., `components/`, `utils/`)
- **Types**: `PascalCase.ts` or in `types.ts` (e.g., `Book`, `User`)

### Imports
```typescript
// ✅ Good: Clear, organized imports
import { Book, User } from '@/types';
import { BookCard3D } from '@/components';
import { useBook } from '@/hooks';
import { bookService } from '@/services';
import { ROUTES } from '@/constants';
```

---

## 🔗 Path Aliases

The project is already configured with a path alias in `vite.config.ts`:
```typescript
alias: {
  '@': path.resolve(__dirname, '.'),
}
```

This allows clean imports:
```typescript
// Instead of:
import { Book } from '../../../types';

// You can use:
import { Book } from '@/types';
```

**Recommendation**: Use `@/` prefix for all imports from `src/`.

---

## 🚦 Next Steps

### Immediate (Foundation Phase)
- ✅ Current structure is appropriate
- No reorganization needed
- Focus on functionality

### When Backend Integration Starts
1. Create `src/services/` folder
2. Create `src/constants/` folder
3. Create `src/hooks/` folder
4. Move API calls to services
5. Extract constants and reusable logic

### When Component Count Exceeds 20-30
1. Create feature-specific component folders
2. Reorganize views by feature
3. Create feature-specific types
4. Maintain parent-level shared components

---

## 📝 Maintenance Guidelines

### Code Review Checklist
- [ ] New files in correct locations
- [ ] Import paths use `@/` alias
- [ ] File naming follows conventions
- [ ] Related files are grouped together
- [ ] No circular dependencies
- [ ] No duplicate functionality

### Regular Cleanup
- Review for unused files monthly
- Remove dead code promptly
- Update documentation when structure changes
- Keep path aliases organized

---

## 🎓 Learning Resources

- [Feature-Based Project Structures](https://www.patterns.dev/posts/module-pattern/)
- [React Project Structure Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Project Organization](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**Last Updated**: August 3, 2024
**Status**: Current structure is optimal for current phase
