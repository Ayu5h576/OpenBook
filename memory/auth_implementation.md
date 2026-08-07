---
name: auth-implementation
description: JWT tokens, bcrypt password hashing, AuthContext provider, token refresh
metadata:
  type: project
---

## Authentication System Architecture

**Flow**:
1. User signs up → Email + password sent to `/api/auth/signup`
2. Password hashed with bcryptjs, User + Profile + RefreshToken created in DB
3. Access token (15m TTL) + refresh token (30d TTL) returned, stored in cookies
4. AuthContext provides `user` state and auth methods to all views
5. Protected routes gated by ProtectedRoute component
6. Token refresh middleware auto-renews expired access tokens

**Key Files**:
- `src/context/AuthContext.tsx` — Provides user state, login/signup/logout
- `src/server/services/authService.ts` — Password hashing, token generation, user creation
- `src/server/controllers/authController.ts` — HTTP endpoint handlers
- `src/server/routes/authRoutes.ts` — Route definitions
- `src/server/middlewares/auth.ts` — JWT verification middleware
- `src/server/utils/tokens.ts` — Token signing/verification via jose library

**Token Management**:
- Access tokens signed with JWT_SECRET, verified on each protected request
- Refresh tokens hashed and stored in DB, can be revoked
- Tokens carry user ID + email claims
- ExpiredAt checks prevent using revoked or expired refresh tokens

**Security Practices**:
- Passwords never sent/stored in plain text (bcryptjs)
- Refresh token hash stored, not raw token
- Tokens sent in httpOnly cookies (if applicable)
- JWT_SECRET generated with `openssl rand -base64 32`

**Real-Time Validation**:
- Signup form validates email format, password strength, username uniqueness
- Server validates email uniqueness on signup attempt
- Duplicate email/username prevented via DB unique constraints
