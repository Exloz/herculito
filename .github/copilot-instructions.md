# CityGym Copilot Instructions

## Project Overview
This is a React/TypeScript gym workout tracking app using Firebase Firestore for data persistence. The app supports dual-user workout logging with real-time progress tracking and rest timers.

## Architecture & Data Flow

### Core Data Model (`src/types/index.ts`)
- **User**: Simple A/B user system (`'A' | 'B'`)
- **Exercise**: Defines workout structure (sets, reps, rest time)
- **ExerciseLog**: Tracks per-user, per-date workout progress
- **Workout**: Groups exercises by day (monday/wednesday/friday schedule)

### Firebase Integration
- Uses Firestore collections: `workouts`, `exerciseLogs`
- Real-time subscriptions via `onSnapshot` for live progress updates
- Document IDs follow pattern: `${exerciseId}_${userId}_${date}` for exercise logs
- Demo config in `src/firebase/config.ts` - replace with actual Firebase project

### State Management Pattern
Custom hooks centralize business logic:
- `useWorkouts()`: Manages workout routines, auto-initializes default 3-day split
- `useExerciseLogs(date)`: Real-time exercise progress tracking
- `useTimer()`: Countdown timer for rest periods between sets

## Key Components & Workflows

### Dashboard (`src/pages/Dashboard.tsx`)
Main workout interface that:
1. Auto-detects current day and loads appropriate workout
2. Renders `ExerciseCard` for each exercise with set tracking
3. Integrates user switching and timer management

### ExerciseCard (`src/components/ExerciseCard.tsx`)
Complex component handling:
- Weight input per set with real-time Firestore updates
- Set completion tracking with visual progress indicators
- Rest timer integration after completing sets
- Expandable set details for weight adjustments

### Navigation Pattern
Simple state-based routing via `App.tsx` - no React Router despite dependency:
```tsx
const [currentPage, setCurrentPage] = useState<'dashboard' | 'routines'>('dashboard');
```

## Development Conventions

### Styling
- Tailwind CSS with dark theme (gray-900 background)
- Consistent component styling: rounded-lg, shadow-xl, border-gray-700
- Blue accent color (blue-400) for active states
- Mobile-first responsive design

### Firebase Patterns
- Always use `merge: true` for document updates to prevent data loss
- Composite document IDs for relational data
- Real-time listeners cleaned up in useEffect returns
- Error boundaries with user-friendly messages

### TypeScript Usage
- Strict typing for user IDs (`'A' | 'B'` literal types)
- Interface-first design for all data structures
- Optional chaining for potentially undefined Firebase data

## Commands & Scripts
```bash
npm run dev        # Vite dev server
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Preview production build
```

## Integration Points
- **Firebase**: `firebaje.js` contains actual production config (replace demo config)
- **Lucide React**: Icon system throughout UI
- **Vite**: Build tool with React plugin and Lucide optimization exclusion

## Critical Files for Context
- `src/types/index.ts` - Complete data model
- `src/hooks/useWorkouts.ts` - Core business logic and Firebase operations
- `src/components/ExerciseCard.tsx` - Main user interaction patterns
- `src/firebase/config.ts` - Database configuration (needs production setup)