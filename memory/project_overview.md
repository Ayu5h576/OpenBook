---
name: openbook-project
description: Full-stack React+Express AI reading platform with Prisma/PostgreSQL
metadata:
  type: project
---

## OpenBook: AI-Powered Reading Platform

**Core Purpose**: Transform book discovery, reading, and community through immersive 3D visualizations and AI recommendations.

**Tech Stack**:
- Frontend: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Motion animations
- Backend: Node.js, Express.js, esbuild bundler
- Database: PostgreSQL + Prisma ORM
- APIs: Google Gemini AI for recommendations/analysis

**Project Scale**: 
- 50+ React components/views across 8 feature domains
- 8 Prisma model groups (Auth, Books, Library, Wishlist, Collections, Reviews, Quotes, Goals)
- Full authentication with JWT + refresh tokens
- SSR-capable build pipeline

**Current Status** (as of 2026-08-07):
- Phase 1 (Core Infrastructure): 95% complete
- Phase 3 book management system with live data just completed
- Real-time signup validation integrated
- AuthContext wired end-to-end
- Nodemon dev server set up for auto-restart

**Why This Matters**: This is a greenfield full-stack app with sophisticated UX requirements (3D visualizations, real-time data, complex state). Future work focuses on replacing mock data with live APIs and building Phase 2 (reading features) + Phase 3 (AI intelligence).
