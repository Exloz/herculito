# AGENTS.md - Herculito Repository Guide

## Scope
This repository is a single frontend app, not a monorepo.
It is a React 18 + TypeScript + Vite PWA for workout tracking.
Authentication is handled by Clerk, and app data comes from an external API configured via env vars.

## Agent Rule Sources
- Included: `.github/copilot-instructions.md`
- Not present: `.cursorrules`
- Not present: `.cursor/rules/`
- The guidance below merges repository conventions with the Copilot instructions.

## Project Snapshot
- Package manager: `pnpm`
- Build tool: `vite`
- Test runner: `vitest`
- Linting: `eslint` with `typescript-eslint`, `react-hooks`, and `react-refresh`
- Styling: Tailwind CSS plus shared utility classes in `src/index.css`
- PWA: `vite-plugin-pwa` with `injectManifest` and service worker source at `src/sw.ts`
- Auth/API: Clerk on the client, custom fetch layer in `src/shared/api/apiClient.ts`

## Repository Layout
- `src/app/` - app shell, providers, navigation, bootstrapping
- `src/features/` - feature folders: `admin`, `auth`, `dashboard`, `routines`, `workouts`
- `src/shared/` - shared types, APIs, hooks, libs, UI primitives
- `src/firebase/` - legacy/demo Firebase config still referenced by docs
- `public/` - static assets and PWA icons
- `dist/` - build output; do not edit manually

## Build, Lint, Typecheck, and Test Commands
Run commands from `/Users/xlz/Documents/Code/herculito`.

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Production build: `pnpm build`
- Preview build: `pnpm preview`
- Lint: `pnpm lint`
- Lint with autofix: `pnpm lint -- --fix`
- Typecheck: `pnpm exec tsc -b`
- Run all tests: `pnpm test`
- Run one test file: `pnpm exec vitest run src/shared/lib/promisePool.test.ts`
- Another single-file example: `pnpm exec vitest run src/features/workouts/lib/workoutSessions.test.ts`
- Run one test by name: `pnpm exec vitest run src/shared/lib/promisePool.test.ts -t "preserves result order"`
- Watch one test file: `pnpm exec vitest watch src/shared/lib/promisePool.test.ts`

## Testing Notes
- Tests are colocated with source and use `*.test.ts`
- Current tests are mostly pure unit tests in `src/shared/lib/`, `src/features/dashboard/lib/`, and `src/features/workouts/lib/`
- There is no custom Vitest config file in the repo right now; defaults apply
- Tests currently run in Vitest's default Node environment unless future config changes that

## Environment and Runtime Notes
- Required client env vars are documented in `.env.example`
- Important vars include `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_JWT_TEMPLATE`, and `VITE_PUSH_API_ORIGIN`
- Do not hardcode secrets, Clerk keys, or production API origins
- `src/shared/api/apiClient.ts` centralizes bearer-token access, timeouts, and retries
- In development, service workers are unregistered in `src/app/main.tsx` to avoid stale caches

## Architecture and Data Flow
- Routing is lightweight and pathname-driven through `src/app/hooks/usePageNavigation.ts`
- There is no active React Router page system; preserve the current simple navigation model
- Feature logic lives in hooks and feature folders rather than one global store
- Shared data contracts live in `src/shared/types/index.ts`
- API response mapping usually happens near the fetch boundary before data reaches UI components
- Dates from the API are commonly normalized into real `Date` objects before rendering or comparison

## Code Style Guidelines

### Formatting
- Use 2-space indentation
- Use semicolons
- Use single quotes
- Keep lines readable; split long imports, objects, and JSX props
- There is no Prettier config, so follow existing style in nearby files

### Imports
- Order imports as: React, external packages, internal modules, styles
- Use `import type` for type-only imports whenever possible
- Prefer explicit relative imports; do not introduce path aliases unless the repo adopts them globally
- Keep import reordering minimal and consistent with surrounding files

Example:

```ts
import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/react';
import type { User } from '../../../shared/types';
import { toUserMessage } from '../../../shared/lib/errorMessages';
```

### TypeScript
- `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are enabled
- Prefer `interface` for shared object shapes
- Prefer `type` for unions, mapped types, response helpers, and literal domains
- Avoid `any`; prefer `unknown` with runtime checks or type guards
- Keep browser/API boundary parsing explicit, especially for JSON payloads and date-like values
- Convert API timestamps close to the fetch boundary with small helpers like `toDate(...)`

### Naming
- React components and pages: PascalCase (`DashboardPage.tsx`, `RoutineCard.tsx`)
- Hooks: `useX` camelCase (`useAuth.ts`, `useDashboardData.ts`)
- Utility functions and locals: camelCase
- Interfaces and types: PascalCase
- App-wide constants: UPPER_SNAKE_CASE; short local constants are often camelCase
- Match nearby file naming: components/pages usually PascalCase, hooks `useX.ts`, utilities can be camelCase or kebab-case

### React and Hooks
- Prefer functional components
- Named exports are the norm; default exports are used sparingly for entrypoints and a few lazy-loaded auth components
- Keep side effects inside hooks/components and move reusable logic into `src/shared/lib/` or feature hooks
- Use `useMemo` for reused or expensive derived state
- Use `useCallback` for handlers passed deeply or reused in dependency lists
- In `useEffect`, create an inner async function and call it with `void fn()` instead of making the effect callback async

### State and Data Patterns
- Hooks commonly return object-shaped state like `{ data, loading, error, refresh }`
- Prefer local state for transient UI and feature hooks for data orchestration
- Keep normalization close to fetch boundaries instead of spreading date/string conversion across components
- Update arrays immutably with `map`, `filter`, and spread

### Error Handling
- Catch errors as `unknown` and convert them with `toUserMessage(...)` for UI-safe copy
- Centralize HTTP failures in `ApiError` from `src/shared/api/apiClient.ts`
- Use Spanish user-facing fallbacks to match existing product copy
- Surface recoverable failures through `showToast(...)`
- Guard browser-only APIs with `typeof window !== 'undefined'`
- Fail fast for missing required env vars at startup when necessary, as in `src/app/main.tsx`

### API and Auth Conventions
- Use `fetchJson<T>(...)` instead of raw `fetch` for authenticated JSON endpoints
- Get auth tokens through `getIdToken()` / `setTokenGetter(...)`; do not hand-roll Clerk token access in multiple places
- Send JSON requests with `content-type: application/json`
- Include Clerk bearer auth in the `authorization` header for protected endpoints
- Keep API helper functions in `src/shared/api/dataApi.ts` or the closest feature API module

### Styling and UX
- Use Tailwind utilities plus shared classes from `src/index.css`
- Prefer design-system classes like `app-shell`, `app-header`, `app-card`, `app-surface`, `btn-primary`, `btn-secondary`, `input`, and `chip`
- Keep the existing visual language: dark surfaces, `mint` and `amberGlow` accents, `Khand` display font, `Hind` body font
- Design mobile first and preserve large tap targets with `touch-target` utilities
- Avoid introducing a different routing shell or conflicting design system

### Testing Style
- Use Vitest imports: `describe`, `it`, `expect`
- Keep tests small and colocated beside the module under test
- Prefer deterministic unit tests over broad integration tests unless necessary
- Use `import type` in tests when only types are needed

## Product Context From Copilot Instructions
- The app is a gym workout tracker with authentication, routines, sessions, progress tracking, and rest timers
- The dashboard is the primary user surface
- The app uses a simple page-state model instead of a heavy router flow
- Mobile-first UX is a hard requirement
- Exercise/session/routine logic depends heavily on the shared types in `src/shared/types/index.ts`

## High-Value Files
- `package.json` - canonical scripts
- `vite.config.ts` - Vite + PWA setup
- `eslint.config.js` - lint rules
- `src/app/main.tsx` - bootstrapping, Clerk provider, service worker handling
- `src/app/App.tsx` - top-level shell and lazy page loading
- `src/app/hooks/usePageNavigation.ts` - current navigation model
- `src/shared/types/index.ts` - core domain model
- `src/shared/api/apiClient.ts` - auth-aware fetch layer and `ApiError`
- `src/shared/api/dataApi.ts` - backend endpoint helpers

## Agent Workflow Recommendations
- Before changing behavior, inspect the nearest feature folder and copy existing patterns
- After code changes, run the narrowest useful test first, then `pnpm lint`, then `pnpm exec tsc -b`, then `pnpm build` when shipped behavior changes
- When adding tests, colocate them next to the implementation file
- Do not edit `dist/` manually
