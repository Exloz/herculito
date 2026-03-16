# Herculito Copilot Instructions

## Project Overview
This is a React + TypeScript gym workout tracking app.
Authentication is handled with Clerk, and app data is fetched from an external API configured via environment variables.

## Architecture and Data Flow

### Core Data Model
- Shared domain contracts live in `src/shared/types/index.ts`.
- Keep date normalization close to API boundaries before rendering or comparison.

### Auth and API Integration
- Use Clerk for sign-in/sign-out and token retrieval.
- Use the centralized API client in `src/shared/api/apiClient.ts`.
- Prefer `fetchJson<T>(...)` helpers and feature APIs in `src/shared/api/dataApi.ts`.
- Do not hardcode credentials or API origins.

### Navigation Pattern
- Navigation is lightweight and pathname-driven through `src/app/hooks/usePageNavigation.ts`.
- Keep the current simple page-state model instead of introducing a heavy router flow.

### State Management Pattern
- Business logic is mainly organized in feature hooks under `src/features/*/hooks`.
- Keep transient UI state local to components.

## Development Conventions

### Styling
- Use Tailwind CSS utilities and shared classes from `src/index.css`.
- Prefer the established design-system classes (`app-shell`, `app-card`, `btn-primary`, `btn-secondary`, `input`, `chip`).
- Preserve the current visual language and mobile-first behavior.

### TypeScript Usage
- Keep strict typing and avoid `any`.
- Use `import type` for type-only imports.
- Parse unknown API payloads explicitly and guard browser-only APIs.

## Commands and Scripts
```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm test
pnpm exec tsc -b
```

## Integration Points
- **Clerk**: Authentication provider and JWT token source.
- **API client**: `src/shared/api/apiClient.ts` for auth-aware fetch, timeout and retry handling.
- **Vite + PWA**: build and service worker setup in `vite.config.ts` and `src/sw.ts`.
- **Lucide React**: icon set used throughout the UI.

## Critical Files for Context
- `src/app/main.tsx` - app bootstrap, Clerk provider and service worker behavior
- `src/app/App.tsx` - top-level shell and lazy page loading
- `src/app/hooks/usePageNavigation.ts` - pathname-driven navigation model
- `src/shared/types/index.ts` - core domain model
- `src/shared/api/apiClient.ts` - API client, auth token and error handling
- `src/shared/api/dataApi.ts` - feature-facing API helpers
