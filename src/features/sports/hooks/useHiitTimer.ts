import { useState, useEffect, useCallback, useRef } from 'react';
import type { HiitConfig, HiitPhase } from '../../../shared/types';
import {
  createHiitEngine,
  startHiit,
  pauseHiit,
  resumeHiit,
  resetHiit,
  restartCurrentPhase as restartCurrentHiitPhase,
  advanceHiit,
  getHiitProgress,
  getEffectiveElapsed,
  getPhaseLabel,
  restoreHiitEngine,
  type HiitAlertType,
  type HiitEngine,
} from '../lib/hiitTimerEngine';
import { remoteTimerScheduler } from '../../workouts/lib/remoteTimerScheduler';
import { useActivitySync } from '../../activity-sync/useActivitySync';

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
  restartCurrentPhase: () => void;
  effectiveElapsed: number;
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

const getNextPhaseNotification = (current: HiitEngine): string => {
  if (current.state.phase === 'prep') return 'Comienza trabajo';
  if (current.state.phase === 'rest') return 'Comienza trabajo';
  if (current.state.phase === 'work'
    && current.config.restEnabled
    && current.state.currentInterval < current.config.intervals) {
    return 'Comienza descanso';
  }
  return 'HIIT completado';
};

export const useHiitTimer = (userId: string, sessionId: string): UseHiitTimerReturn => {
  const { activitySync } = useActivitySync(userId);
  const [initialRestore] = useState(() => {
    const saved = activitySync.getHiitTimerState(sessionId);
    if (!saved || saved.state.phase === 'idle' || saved.state.phase === 'done') return null;
    return { saved, restored: restoreHiitEngine(saved, Date.now()) };
  });
  const [engine, setEngine] = useState<HiitEngine>(() => initialRestore?.restored.engine ?? createHiitEngine({
    intervals: 8,
    workDuration: 30,
    restEnabled: true,
    restDuration: 15,
  }));
  const [progress, setProgress] = useState(() => getHiitProgress(engine.state, engine.config));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startedAtRef = useRef<number | null>(initialRestore?.saved.startedAtMs ?? null);
  const lastTickAtRef = useRef<number | null>(initialRestore?.restored.lastTickAtMs ?? null);
  const pausedAtRef = useRef<number | null>(
    initialRestore?.saved.pausedAtMs === null ? null : initialRestore?.saved.pausedAtMs ?? null
  );

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

  const schedulePhaseEnd = useCallback((
    current: HiitEngine,
    fromMs: number,
    requestPermission = false
  ) => {
    if (!current.isRunning || current.isPaused || current.state.secondsRemaining <= 0) return;

    void remoteTimerScheduler.schedule(userId, {
      executeAtMs: fromMs + current.state.secondsRemaining * 1000,
      title: 'HIIT Timer',
      body: getNextPhaseNotification(current),
      ...(requestPermission ? { requestPermission: true } : {})
    }).catch(() => {
      // Background push failed — non-critical
    });
  }, [userId]);

  const advanceTo = useCallback((current: HiitEngine, nowMs: number) => {
    const lastTickAtMs = lastTickAtRef.current ?? nowMs;
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastTickAtMs) / 1000));
    if (elapsedSeconds === 0) {
      return { engine: current, alerts: [] as HiitAlertType[], phaseChanged: false };
    }

    const advanced = advanceHiit(current, elapsedSeconds);
    lastTickAtRef.current = lastTickAtMs + elapsedSeconds * 1000;
    return {
      ...advanced,
      phaseChanged: advanced.engine.state.phase !== current.state.phase
        || advanced.engine.state.currentInterval !== current.state.currentInterval
    };
  }, []);

  const applyAdvancedEngine = useCallback((current: HiitEngine, nowMs: number) => {
    const advanced = advanceTo(current, nowMs);
    if (advanced.engine === current) return;

    const alert = advanced.alerts[advanced.alerts.length - 1];
    if (alert) playAlert(alert);
    setProgress(getHiitProgress(advanced.engine.state, advanced.engine.config));
    setEngine(advanced.engine);

    if (!advanced.engine.isRunning && advanced.engine.state.phase === 'done') {
      void remoteTimerScheduler.cancel(userId).catch(() => {});
      releaseWakeLock();
      activitySync.clearHiitTimerState(sessionId);
      void showNotification(
        '¡HIIT completado!',
        `Has completado ${advanced.engine.config.intervals} intervalos.`
      );
    } else if (advanced.phaseChanged) {
      schedulePhaseEnd(advanced.engine, lastTickAtRef.current ?? nowMs);
    }
  }, [activitySync, advanceTo, playAlert, releaseWakeLock, schedulePhaseEnd, sessionId, userId]);

  useEffect(() => {
    if (initialRestore?.restored.engine.isRunning && !initialRestore.restored.engine.isPaused) {
      schedulePhaseEnd(initialRestore.restored.engine, initialRestore.restored.lastTickAtMs);
    }
  }, [initialRestore, schedulePhaseEnd]);

  // Persist state changes
  useEffect(() => {
    if (engine.state.phase !== 'idle' && engine.state.phase !== 'done') {
      activitySync.saveHiitTimerState(sessionId, {
        config: engine.config,
        state: engine.state,
        startedAtMs: startedAtRef.current ?? Date.now(),
        pausedAtMs: pausedAtRef.current,
        lastTickAtMs: lastTickAtRef.current ?? Date.now()
      });
    }
  }, [activitySync, engine.state, engine.config, engine.isPaused, sessionId]);

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
      applyAdvancedEngine(engine, Date.now());
    }, TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [engine, acquireWakeLock, releaseWakeLock, startAudioContext, applyAdvancedEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Handle visibility change — restore state and check if timer expired
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        applyAdvancedEngine(engine, Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [engine, applyAdvancedEngine]);

  const handleStart = useCallback((config: HiitConfig) => {
    const newEngine = createHiitEngine(config);
    const started = startHiit(newEngine);
    const nowMs = Date.now();
    startedAtRef.current = nowMs;
    lastTickAtRef.current = nowMs;
    pausedAtRef.current = null;
    setEngine(started);
    setProgress(0);

    schedulePhaseEnd(started, nowMs, true);
  }, [schedulePhaseEnd]);

  const handlePause = useCallback(() => {
    const nowMs = Date.now();
    const reconciled = advanceTo(engine, nowMs).engine;
    const paused = pauseHiit(reconciled);
    lastTickAtRef.current = nowMs;
    pausedAtRef.current = nowMs;
    setEngine(paused);
    setProgress(getHiitProgress(paused.state, paused.config));
    void remoteTimerScheduler.cancel(userId).catch(() => {});
  }, [advanceTo, engine, userId]);

  const handleResume = useCallback(() => {
    const resumed = resumeHiit(engine);
    if (resumed === engine) return;

    const nowMs = Date.now();
    lastTickAtRef.current = nowMs;
    pausedAtRef.current = null;
    setEngine(resumed);
    schedulePhaseEnd(resumed, nowMs);
  }, [engine, schedulePhaseEnd]);

  const handleReset = useCallback(() => {
    void remoteTimerScheduler.cancel(userId).catch(() => {});
    releaseWakeLock();
    activitySync.clearHiitTimerState(sessionId);
    setEngine(resetHiit(engine));
    setProgress(0);
    startedAtRef.current = null;
    lastTickAtRef.current = null;
    pausedAtRef.current = null;
  }, [activitySync, engine, releaseWakeLock, sessionId, userId]);

  const handleRestartCurrentPhase = useCallback(() => {
    const restarted = restartCurrentHiitPhase(engine);
    const nowMs = Date.now();
    lastTickAtRef.current = nowMs;
    setEngine(restarted);
    setProgress(getHiitProgress(restarted.state, restarted.config));
    schedulePhaseEnd(restarted, nowMs);
  }, [engine, schedulePhaseEnd]);

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
    restartCurrentPhase: handleRestartCurrentPhase,
    effectiveElapsed: getEffectiveElapsed(engine.state),
    formatTime,
  };
};
