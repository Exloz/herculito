import type { HiitConfig, HiitPhase, HiitState } from '../../../shared/types';

// ===== HIIT Timer Engine — Pure state machine =====
// No React dependencies. All transitions are pure functions.
// The hook (useHiitTimer) wraps this with timers and side effects.

const PREP_SECONDS = 5;

export interface HiitEngine {
  config: HiitConfig;
  state: HiitState;
  isRunning: boolean;
  isPaused: boolean;
}

export type HiitAlertType = 'prep-tick' | 'phase-start' | 'countdown-tick' | 'done';

export interface HiitTickResult {
  state: HiitState;
  isRunning: boolean;
  alert: HiitAlertType | null;
}

// --- Factory ---

export const createHiitEngine = (config: HiitConfig): HiitEngine => {
  return {
    config,
    state: {
      phase: 'idle',
      currentInterval: 0,
      secondsRemaining: 0,
      totalElapsed: 0,
    },
    isRunning: false,
    isPaused: false,
  };
};

// --- Actions ---

export const startHiit = (engine: HiitEngine): HiitEngine => {
  if (engine.isRunning) return engine;

  return {
    ...engine,
    state: {
      phase: 'prep',
      currentInterval: 0,
      secondsRemaining: PREP_SECONDS,
      totalElapsed: 0,
    },
    isRunning: true,
    isPaused: false,
  };
};

export const pauseHiit = (engine: HiitEngine): HiitEngine => {
  if (!engine.isRunning || engine.isPaused) return engine;
  if (engine.state.phase === 'idle' || engine.state.phase === 'done') return engine;

  return {
    ...engine,
    isPaused: true,
  };
};

export const resumeHiit = (engine: HiitEngine): HiitEngine => {
  if (!engine.isRunning || !engine.isPaused) return engine;

  return {
    ...engine,
    isPaused: false,
  };
};

export const resetHiit = (engine: HiitEngine): HiitEngine => {
  return {
    ...engine,
    state: {
      phase: 'idle',
      currentInterval: 0,
      secondsRemaining: 0,
      totalElapsed: 0,
    },
    isRunning: false,
    isPaused: false,
  };
};

export const restartCurrentPhase = (engine: HiitEngine): HiitEngine => {
  const { phase, secondsRemaining, totalElapsed } = engine.state;
  if (phase === 'idle' || phase === 'done') return engine;

  const phaseDuration = getPhaseDuration(phase, engine.config);
  if (phaseDuration <= 0) return engine;

  const elapsedInPhase = Math.max(0, phaseDuration - secondsRemaining);

  return {
    ...engine,
    state: {
      ...engine.state,
      secondsRemaining: phaseDuration,
      totalElapsed: Math.max(0, totalElapsed - elapsedInPhase),
    },
  };
};

// --- Tick ---

export const tickHiit = (engine: HiitEngine): HiitTickResult => {
  if (!engine.isRunning || engine.isPaused) {
    return { state: engine.state, isRunning: engine.isRunning, alert: null };
  }

  const { config, state } = engine;
  let { phase, currentInterval, secondsRemaining, totalElapsed } = state;

  let alert: HiitAlertType | null = null;
  let isRunning = true;

  // Decrement
  secondsRemaining -= 1;
  totalElapsed += 1;

  // Check alerts BEFORE transition
  if (phase === 'prep') {
    alert = 'prep-tick';
  }

  // Phase transition: secondsRemaining hits 0
  if (secondsRemaining <= 0) {
    if (phase === 'prep') {
      // Transition to first work interval
      phase = 'work';
      currentInterval = 1;
      secondsRemaining = config.workDuration;
      alert = 'phase-start';
    } else if (phase === 'work') {
      if (config.restEnabled && currentInterval < config.intervals) {
        // Transition to rest
        phase = 'rest';
        secondsRemaining = config.restDuration;
        alert = 'phase-start';
      } else if (currentInterval < config.intervals) {
        // No rest, go to next work interval
        currentInterval += 1;
        phase = 'work';
        secondsRemaining = config.workDuration;
        alert = 'phase-start';
      } else {
        // All intervals done
        phase = 'done';
        secondsRemaining = 0;
        isRunning = false;
        alert = 'done';
      }
    } else if (phase === 'rest') {
      // Rest done → next work interval
      currentInterval += 1;
      if (currentInterval > config.intervals) {
        phase = 'done';
        secondsRemaining = 0;
        isRunning = false;
        alert = 'done';
      } else {
        phase = 'work';
        secondsRemaining = config.workDuration;
        alert = 'phase-start';
      }
    }
  } else if (phase === 'work' || phase === 'rest') {
    // Check countdown alerts (last 5 seconds)
    if (secondsRemaining <= 5) {
      alert = 'countdown-tick';
    }
  }

  const newState: HiitState = {
    phase,
    currentInterval,
    secondsRemaining,
    totalElapsed,
  };

  return {
    state: newState,
    isRunning,
    alert,
  };
};

// --- Derived values ---

export const getHiitProgress = (state: HiitState, config: HiitConfig): number => {
  if (state.phase === 'idle') return 0;
  if (state.phase === 'done') return 100;

  const totalWorkSeconds = config.workDuration * config.intervals;
  const totalRestSeconds = config.restEnabled
    ? config.restDuration * Math.max(0, config.intervals - 1)
    : 0;
  const totalSessionSeconds = totalWorkSeconds + totalRestSeconds;
  const effectiveElapsed = getEffectiveElapsed(state);

  if (totalSessionSeconds === 0) return 0;

  return Math.min(100, (effectiveElapsed / totalSessionSeconds) * 100);
};

export const getEffectiveElapsed = (state: HiitState): number => {
  if (state.phase === 'idle') return 0;

  const prepElapsed = state.phase === 'prep'
    ? Math.max(0, Math.min(PREP_SECONDS, PREP_SECONDS - state.secondsRemaining))
    : PREP_SECONDS;

  return Math.max(0, state.totalElapsed - prepElapsed);
};

export const getPhaseDuration = (phase: HiitPhase, config: HiitConfig): number => {
  switch (phase) {
    case 'prep': return PREP_SECONDS;
    case 'work': return config.workDuration;
    case 'rest': return config.restDuration;
    default: return 0;
  }
};

export const getPhaseLabel = (phase: HiitPhase): string => {
  switch (phase) {
    case 'idle': return 'Listo';
    case 'prep': return 'Preparación';
    case 'work': return 'Trabajo';
    case 'rest': return 'Descanso';
    case 'done': return 'Completado';
  }
};

// --- Persistence helpers ---

const HIIT_TIMER_STORAGE_KEY = 'hiitTimerState';

export interface HiitPersistentState {
  config: HiitConfig;
  state: HiitState;
  startedAtMs: number;
  pausedAtMs: number | null;
}

export const saveHiitTimerState = (config: HiitConfig, state: HiitState, startedAtMs: number, pausedAtMs: number | null): void => {
  try {
    const persistent: HiitPersistentState = { config, state, startedAtMs, pausedAtMs };
    localStorage.setItem(HIIT_TIMER_STORAGE_KEY, JSON.stringify(persistent));
  } catch {
    // Storage full or unavailable — non-critical
  }
};

export const loadHiitTimerState = (): HiitPersistentState | null => {
  try {
    const stored = localStorage.getItem(HIIT_TIMER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as HiitPersistentState;
  } catch {
    return null;
  }
};

export const clearHiitTimerState = (): void => {
  try {
    localStorage.removeItem(HIIT_TIMER_STORAGE_KEY);
  } catch {
    // Non-critical
  }
};
