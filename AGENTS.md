# AGENTS.md - Herculito Codebase Guide

## Project Overview
Herculito is a React/TypeScript gym workout tracking app using Firebase Firestore. Supports dual-user workout logging, rest timers, and muscle group categorization.

## Build Commands

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Production build
pnpm lint         # Run ESLint on all files
pnpm preview      # Preview production build
```

## Code Style Guidelines

### Imports
- Use absolute imports with aliases (configured in tsconfig)
- Organize imports in groups: React → external → internal → styles
- Example:
  ```tsx
  import React from 'react';
  import { Check, Clock } from 'lucide-react';
  import { Exercise, ExerciseLog } from '../types';
  import { useAuth } from './hooks/useAuth';
  ```

### TypeScript
- Use interfaces for object shapes, types for unions/primitives
- Enable `strict: true` in tsconfig.app.json
- Use optional chaining (`?.`) for potentially undefined Firebase data
- Avoid `any`; use `unknown` with type guards when needed

### Naming Conventions
- **Components**: PascalCase (`ExerciseCard`, `UserProfile`)
- **Hooks**: camelCase with `use` prefix (`useWorkouts`, `useAuth`)
- **Variables/functions**: camelCase
- **Types/interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE for config values, camelCase for others
- **Files**: kebab-case for non-components, PascalCase for components

### Component Patterns
- Use `React.FC` for typed props with `React.memo()` for performance
- Destructure props with explicit typing
- Keep components focused; extract complex logic to hooks
- Lazy load pages using `React.lazy()` with Suspense

### Error Handling
- Wrap async operations in try/catch blocks
- Set error state in hooks: `setError('user-friendly message')`
- Use silent catch only for non-critical operations (logout, log updates)
- Never expose raw Firebase errors to users

### Firebase Patterns
- Use `merge: true` for document updates: `setDoc(doc(...), data, { merge: true })`
- Composite document IDs: `${exerciseId}_${userId}_${date}`
- Clean up listeners in useEffect returns
- Initialize default data when collections are empty

### Styling (Tailwind CSS)
- Use the design system utilities: `app-shell`, `app-header`, `app-surface`, `app-card`
- Buttons: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`
- Inputs: `input`, `input-sm`; chips: `chip`, `chip-warm`
- Palette: `ink/charcoal/graphite` surfaces with `mint` and `amberGlow` accents
- Typography: use `font-display` for headings; body uses default
- Mobile-first responsive design

### State Management
- Custom hooks centralize business logic
- Return `{ data, loading, error, actions }` pattern
- Use local state for UI, Firebase for persistence
- Optimize with `useMemo`, `useCallback` for expensive operations

## Key Files

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Complete data model |
| `src/hooks/useWorkouts.ts` | Core Firebase operations |
| `src/components/ExerciseCard.tsx` | Main interaction patterns |
| `src/firebase/config.ts` | Database configuration |
| `eslint.config.js` | Linting rules |
| `tsconfig.app.json` | TypeScript configuration |

## Development Workflow

1. Run `pnpm lint` before committing
2. Test changes with `pnpm dev`
3. Build with `pnpm build` to verify production readiness
4. Follow the existing hook pattern for new features
5. Service worker is production-only; dev unregisters it to avoid stale caches
6. Bump the minor version in `package.json` for every commit
