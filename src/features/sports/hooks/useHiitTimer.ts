import { useState, useEffect, useCallback, useRef } from 'react';
import type { HiitConfig, HiitPhase } from '../../../shared/types';
import {
  createHiitEngine,
  startHiit,
  pauseHiit,
  resumeHiit,
  resetHiit,
  tickHiit,
  getHiitProgress,
  getPhaseLabel,
  saveHiitTimerState,
  loadHiitTimerState,
  clearHiitTimerState,
  type HiitAlertType,
  type HiitEngine,
} from '../lib/hiitTimerEngine';
import { shouldUseBackgroundRestPush, scheduleRestPush, cancelRestPush, ensureBackgroundRestPushReady } from '../../workouts/api/pushApi';

const TICK_INTERVAL_MS = 1000;

interface BeepOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
}

export interface UseHiitTimerReturn {
  config: HiitConfig | null;
  state: { phase: HiitPhase; currentInterval: number; secondsRemaining: number; totalElapsed: number };
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  phaseLabel: string;
  start: (config: HiitConfig) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
}

const showNotification = async (title: string, body: string): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/app-logo.png',
        badge: '/app-logo.png',
        tag: 'hiit-timer',
        silent: false,
      });
    } else {
      const notification = new Notification(title, { body, icon: '/app-logo.png' });
      notification.onclick = () => { window.focus(); notification.close(); };
    }
  } catch {
    // Notification failed — non-critical
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};

export const useHiitTimer = (): UseHiitTimerReturn => {
  const [engine, setEngine] = useState<HiitEngine>(() => createHiitEngine({
    intervals: 8,
    workDuration: 30,
    restEnabled: true,
    restDuration: 15,
  }));
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pushCommandSeqRef = useRef(0);
  const pushCommandAtRef = useRef(0);

  const nextPushCommand = useCallback(() => {
    const now = Date.now();
    const commandAtMs = Math.max(now, pushCommandAtRef.current + 1);
    pushCommandAtRef.current = commandAtMs;
    pushCommandSeqRef.current += 1;
    return { sequence: pushCommandSeqRef.current, commandAtMs };
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock failed — non-critical
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  const startAudioContext = useCallback(() => {
    try {
      const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch {
      // Audio context error — non-critical
    }
  }, []);

  const playBeep = useCallback((options: BeepOptions) => {
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = options.type ?? 'sine';
      oscillator.frequency.value = options.frequency;
      gainNode.gain.value = 0.3;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + options.duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + options.duration / 1000);
    } catch {
      // Beep failed — non-critical
    }
  }, []);

  const playAlert = useCallback((type: HiitAlertType) => {
    switch (type) {
      case 'prep-tick':
        playBeep({ frequency: 600, duration: 120 });
        break;
      case 'phase-start':
        playBeep({ frequency: 800, duration: 200 });
        break;
      case 'countdown-tick':
        playBeep({ frequency: 500, duration: 100 });
        break;
      case 'done':
        playBeep({ frequency: 500, duration: 500 });
        break;
    }
  }, [playBeep]);

  const scheduleBackgroundAlert = useCallback(async (secondsUntilNextPhase: number, phaseLabel: string) => {
    if (!shouldUseBackgroundRestPush()) return;

    try {
      const ready = await ensureBackgroundRestPushReady();
      if (!ready) return;

      await scheduleRestPush(secondsUntilNextPhase, {
        title: 'HIIT Timer',
        body: phaseLabel,
      });
    } catch {
      // Background push failed — non-critical
    }
  }, []);

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = loadHiitTimerState();
    if (saved && saved.state.phase !== 'idle' && saved.state.phase !== 'done') {
      const restoredEngine: HiitEngine = {
        config: saved.config,
        state: saved.state,
        isRunning: true,
        isPaused: saved.pausedAtMs !== null,
      };
      setEngine(restoredEngine);
      setProgress(getHiitProgress(saved.state, saved.config));
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    if (engine.state.phase !== 'idle') {
      saveHiitTimerState(engine.config, engine.state, startedAtRef.current ?? Date.now(), engine.isPaused ? Date.now() : null);
    }
  }, [engine.state, engine.config, engine.isPaused]);

  // Main tick loop
  useEffect(() => {
    if (!engine.isRunning || engine.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      releaseWakeLock();
      return;
    }

    startAudioContext();
    acquireWakeLock();

    intervalRef.current = setInterval(() => {
      setEngine((prev) => {
        const result = tickHiit(prev);
        const newProgress = getHiitProgress(result.state, prev.config);

        setProgress(newProgress);

        // Play audio alert
        if (result.alert) {
          playAlert(result.alert);
        }

        // Schedule background notification for phase transitions
        if (result.alert === 'phase-start') {
          const { commandAtMs } = nextPushCommand();
          void cancelRestPush({ commandAtMs }).catch(() => {});
          const phaseDuration = result.state.phase === 'work' ? prev.config.workDuration
            : result.state.phase === 'rest' ? prev.config.restDuration : 0;
          if (phaseDuration > 0) {
            void scheduleBackgroundAlert(phaseDuration, getPhaseLabel(result.state.phase));
          }
        }

        // Handle done
        if (result.state.phase === 'done') {
          const { commandAtMs } = nextPushCommand();
          void cancelRestPush({ commandAtMs }).catch(() => {});
          releaseWakeLock();
          clearHiitTimerState();
          void showNotification(
            '¡HIIT completado!',
            `Has completado ${prev.config.intervals} intervalos.`
          );
        }

        return {
          ...prev,
          state: result.state,
          isRunning: result.isRunning,
        } as HiitEngine;
      });
    }, TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [engine.isRunning, engine.isPaused, acquireWakeLock, releaseWakeLock, startAudioContext, playAlert, nextPushCommand, scheduleBackgroundAlert]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      releaseWakeLock();
      const { commandAtMs } = nextPushCommand();
      void cancelRestPush({ commandAtMs }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle visibility change — restore state and check if timer expired
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came back to foreground — cancel pending background pushes
        const { commandAtMs } = nextPushCommand();
        void cancelRestPush({ commandAtMs }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [nextPushCommand]);

  const handleStart = useCallback((config: HiitConfig) => {
    const newEngine = createHiitEngine(config);
    const started = startHiit(newEngine);
    startedAtRef.current = Date.now();
    setEngine(started);
    setProgress(0);

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  const handlePause = useCallback(() => {
    setEngine((prev) => pauseHiit(prev));
  }, []);

  const handleResume = useCallback(() => {
    setEngine((prev) => resumeHiit(prev));
  }, []);

  const handleReset = useCallback(() => {
    const { commandAtMs } = nextPushCommand();
    void cancelRestPush({ commandAtMs }).catch(() => {});
    releaseWakeLock();
    clearHiitTimerState();
    setEngine((prev) => resetHiit(prev));
    setProgress(0);
    startedAtRef.current = null;
  }, [nextPushCommand, releaseWakeLock]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    config: engine.config,
    state: engine.state,
    isRunning: engine.isRunning,
    isPaused: engine.isPaused,
    progress,
    phaseLabel: getPhaseLabel(engine.state.phase),
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    reset: handleReset,
    formatTime,
  };
};
