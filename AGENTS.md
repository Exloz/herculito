# AGENTS.md - Herculito Codebase Guide

## Projects Overview

This monorepo contains two projects:

1. **`herculito/`** - React/TypeScript gym workout tracking PWA using Firebase Firestore
2. **`herculito-push-api/`** - Bun/TypeScript REST API for push notifications and data persistence (SQLite)

---

## Build Commands

### Frontend (herculito/)
```bash
cd herculito
pnpm dev          # Start Vite dev server
pnpm build        # Production build
pnpm lint         # Run ESLint on all files
pnpm preview      # Preview production build
```

### Backend (herculito-push-api/)
```bash
cd herculito-push-api
bun dev           # Start with hot reload
bun start         # Production start
bun check         # TypeScript type check (tsc --noEmit)
bun run migrate:json      # Migrate from JSON data
bun run export:firestore  # Export Firestore data
bun run cleanup:system    # Cleanup system data
bun run backfill:sessions # Backfill session data
```

---

## Code Style Guidelines

### TypeScript (Both Projects)
- Use `strict: true` in all tsconfig files
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any`; use `unknown` with type guards when needed
- Enable `noUnusedLocals` and `noUnusedParameters`

### Naming Conventions
- **Components**: PascalCase (`ExerciseCard`, `UserProfile`)
- **Hooks**: camelCase with `use` prefix (`useWorkouts`, `useAuth`)
- **Variables/functions**: camelCase
- **Types/interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE for config values, camelCase for others
- **Files**: kebab-case for non-components, PascalCase for components

### Frontend (React/Tailwind)

#### Imports
- Organize: React → external → internal → styles
- Example:
  ```tsx
  import { useState } from 'react';
  import { Check, Clock } from 'lucide-react';
  import { Exercise, ExerciseLog } from '../types';
  import { useAuth } from './hooks/useAuth';
  ```

#### Component Patterns
- Use functional components with explicit props typing
- Destructure props with explicit typing
- Keep components focused; extract complex logic to hooks
- Use `React.memo()` for performance when appropriate

#### Styling (Tailwind CSS)
- Use design system utilities: `app-shell`, `app-header`, `app-surface`, `app-card`
- Buttons: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`
- Inputs: `input`, `input-sm`; chips: `chip`, `chip-warm`
- Palette: `ink/charcoal/graphite` surfaces with `mint` and `amberGlow` accents
- Typography: use `font-display` for headings
- Mobile-first responsive design

#### Firebase Patterns
- Use `merge: true` for document updates
- Composite document IDs: `${exerciseId}_${userId}_${date}`
- Clean up listeners in useEffect returns
- Use optional chaining (`?.`) for potentially undefined Firebase data

### Backend (Bun/SQLite)

#### API Structure
- Route handlers in `src/index.ts` with type-safe request/response
- Business logic in `src/data.ts`, database layer in `src/db.ts`
- HTTP utilities in `src/http.ts`, auth in `src/auth.ts`
- Environment config in `src/env.ts`

#### Error Handling
- Validate inputs with type guards (e.g., `isNonEmptyString`, `isValidDateKey`)
- Return JSON error responses with consistent error codes
- Log requests with structured JSON: `{ level, ts, event, requestId, method, path, status, durationMs }`
- Wrap async operations in try/catch at handler level

#### SQLite Patterns
- Use `bun:sqlite` for database operations
- Composite keys pattern: `${uid}:${deviceId}:rest` for job IDs
- Soft deletes via `isActive` flags on subscriptions
- Prepared statements for all queries

---

## State Management (Frontend)

- Custom hooks centralize business logic
- Return `{ data, loading, error, actions }` pattern
- Use local state for UI, Firebase for persistence
- Optimize with `useMemo`, `useCallback` for expensive operations

---

## Key Files

### Frontend
| File | Purpose |
|------|---------|
| `src/types/index.ts` | Complete data model |
| `src/hooks/useWorkouts.ts` | Core Firebase operations |
| `src/components/ExerciseCard.tsx` | Main interaction patterns |
| `src/firebase/config.ts` | Database configuration |
| `eslint.config.js` | Linting rules |
| `tsconfig.app.json` | TypeScript configuration |

### Backend
| File | Purpose |
|------|---------|
| `src/index.ts` | HTTP server and route handlers |
| `src/data.ts` | Business logic layer |
| `src/db.ts` | SQLite database operations |
| `src/auth.ts` | Firebase auth verification |
| `src/push.ts` | Web Push notifications |
| `src/http.ts` | HTTP utilities (CORS, JSON) |
| `src/env.ts` | Environment configuration |

---

## Development Workflow

1. Run linter before committing: `pnpm lint` (frontend) or `bun check` (backend)
2. Test changes with dev server: `pnpm dev` / `bun dev`
3. Build to verify production readiness: `pnpm build` / `bun start`
4. Follow existing patterns for new features (hooks on frontend, route+data+db on backend)
5. Service worker is production-only; dev unregisters it to avoid stale caches
6. Bump the minor version in `package.json` for every commit

---

## Copilot Instructions Summary

- React/TypeScript gym workout tracking app
- Dual-user workout logging (A/B users)
- Real-time Firestore subscriptions via `onSnapshot`
- Simple state-based routing (no React Router despite dependency)
- Document IDs pattern: `${exerciseId}_${userId}_${date}` for exercise logs
- Always use `merge: true` for Firestore updates
- Dark theme UI with gray-900 backgrounds and blue-400 accents
