import { useState, useEffect, useCallback, useRef } from 'react';
import { remoteTimerScheduler } from '../lib/remoteTimerScheduler';

const TIMER_STORAGE_KEY = 'workoutTimerState';
const SW_READY_TIMEOUT_MS = 1200;

interface TimerState {
  timeLeft: number;
  isActive: boolean;
  initialTime: number;
  startTime: number | null;
  endsAtMs: number | null;
  hasNotified: boolean;
}

const showAlertFallback = (title: string, body: string): void => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}: ${body}`);
  }
};

const DEBUG_TIMERS = import.meta.env.DEV;

const logTimerEvent = (event: string, details?: Record<string, unknown>): void => {
  if (DEBUG_TIMERS) console.info('[timer]', event, details ?? {});
};

const waitForServiceWorkerReady = async (timeoutMs: number): Promise<ServiceWorkerRegistration> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('sw_ready_timeout')), timeoutMs);
  });

  return Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
};

type ShowTimerNotificationOptions = {
  suppressAlertFallback?: boolean;
  source?: 'interval' | 'resume';
};

const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  const NotificationAPI = window.Notification;
  if (!NotificationAPI) return false;

  if (NotificationAPI.permission === 'granted') return true;
  if (NotificationAPI.permission === 'denied') return false;

  try {
    const permission = await NotificationAPI.requestPermission();
    return permission === 'granted';
  } catch {
    console.warn('Failed to request notification permission');
    return false;
  }
};

const showTimerNotification = async (
  title: string,
  body: string,
  notificationOptions?: ShowTimerNotificationOptions
): Promise<void> => {
  if (typeof window === 'undefined') return;

  if (!('Notification' in window)) {
    if (!notificationOptions?.suppressAlertFallback) {
      showAlertFallback(title, body);
    }
    return;
  }

  if (Notification.permission !== 'granted') {
    if (!notificationOptions?.suppressAlertFallback) {
      showAlertFallback(title, body);
    }
    return;
  }

  const notificationTag = 'rest-timer';
  const nativeOptions: NotificationOptions = {
    body,
    icon: '/app-logo.png',
    badge: '/app-logo.png',
    tag: notificationTag,
    requireInteraction: false,
    silent: false
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await waitForServiceWorkerReady(SW_READY_TIMEOUT_MS);
      await registration.showNotification(title, nativeOptions);
      logTimerEvent('notification_shown', { source: notificationOptions?.source ?? 'interval', channel: 'service_worker' });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      return;
    } catch (error) {
      console.warn('Service worker notification failed:', error);
    }
  }

  try {
    const notification = new Notification(title, nativeOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn('Notification failed:', error);
    if (!notificationOptions?.suppressAlertFallback) {
      showAlertFallback(title, body);
    }
  }

  logTimerEvent('notification_shown', { source: notificationOptions?.source ?? 'interval', channel: 'window' });

  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
};

const saveTimerState = (state: TimerState): void => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save timer state');
  }
};

const loadTimerState = (): TimerState | null => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as TimerState;
    const now = Date.now();

    if (state.isActive) {
      const endsAtMs = state.endsAtMs
        ?? (state.startTime ? state.startTime + state.initialTime * 1000 : null);
      if (endsAtMs) {
        state.endsAtMs = endsAtMs;
        state.timeLeft = Math.max(0, Math.ceil((endsAtMs - now) / 1000));
      }

      if (state.timeLeft === 0) {
        state.isActive = false;
        state.endsAtMs = null;
      }
    }

    return state;
  } catch {
    console.warn('Failed to load timer state');
    return null;
  }
};

export const cancelWorkoutTimer = (userId: string): void => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch {
    console.warn('Failed to clear timer state');
  }
  void remoteTimerScheduler.cancel(userId).catch(() => {
    console.warn('Failed to cancel background push');
  });
};

export const useTimer = (userId: string) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [hasNotified, setHasNotified] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        console.warn('Wake lock failed');
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
      const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch {
      console.warn('Audio context error');
    }
  }, []);

  const loadState = useCallback((): TimerState | null => {
    const savedState = loadTimerState();
    if (savedState) {
      setTimeLeft(savedState.timeLeft);
      setIsActive(savedState.isActive && savedState.timeLeft > 0);
      setInitialTime(savedState.initialTime);
      setStartTime(savedState.isActive && savedState.timeLeft > 0 ? savedState.startTime : null);
      setEndsAtMs(savedState.isActive && savedState.timeLeft > 0 ? savedState.endsAtMs ?? null : null);
      setHasNotified(savedState.hasNotified);
      return savedState;
    } else {
      setTimeLeft(0);
      setIsActive(false);
      setInitialTime(0);
      setStartTime(null);
      setEndsAtMs(null);
      setHasNotified(false);
      return null;
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const state: TimerState = { timeLeft, isActive, initialTime, startTime, endsAtMs, hasNotified };
    saveTimerState(state);
  }, [timeLeft, isActive, initialTime, startTime, endsAtMs, hasNotified]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const restored = loadState();

        if (restored && !restored.isActive && restored.timeLeft === 0 && restored.initialTime > 0 && !restored.hasNotified) {
          const nextState = { ...restored, hasNotified: true };
          saveTimerState(nextState);
          setHasNotified(true);

          void remoteTimerScheduler.cancel(userId).catch(() => {
            console.warn('Failed to cancel background push on resume');
          });

          void showTimerNotification(
            '¡Descanso terminado!',
            'Continúa con tu entrenamiento.',
            { suppressAlertFallback: true, source: 'resume' }
          );

          logTimerEvent('resume_expired_timer_notified');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadState, userId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();

      endTimeRef.current = null;
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      releaseWakeLock();
      return;
    }

    startAudioContext();
    acquireWakeLock();

    endTimeRef.current = endsAtMs;

    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;

      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsActive(false);
        setStartTime(null);
        setEndsAtMs(null);
        endTimeRef.current = null;

        if (!hasNotified) {
          setHasNotified(true);

          void remoteTimerScheduler.cancel(userId).catch(() => {
            console.warn('Failed to cancel background push');
          });

          void showTimerNotification(
            '¡Descanso terminado!',
            'Continúa con tu entrenamiento.',
            { source: 'interval' }
          );
        }

        releaseWakeLock();
      }
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, hasNotified, endsAtMs, acquireWakeLock, startAudioContext, releaseWakeLock, userId]);

  const requestPermission = useCallback(async () => {
    return requestNotificationPermission();
  }, []);

  const startTimer = useCallback(async (seconds: number) => {
    if (seconds <= 0) return;

    const startedAtMs = Date.now();
    const executeAtMs = startedAtMs + seconds * 1000;

    localStorage.removeItem(TIMER_STORAGE_KEY);

    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
    setStartTime(startedAtMs);
    setEndsAtMs(executeAtMs);
    setHasNotified(false);

    const canRequestPermission = typeof navigator !== 'undefined'
      && 'userActivation' in navigator
      && (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
    void remoteTimerScheduler.schedule(userId, {
      executeAtMs,
      ...(canRequestPermission ? { requestPermission: true } : {})
    }).catch(() => {
      console.warn('Failed to schedule background push');
    });
  }, [userId]);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    setStartTime(null);
    setEndsAtMs(null);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    void remoteTimerScheduler.cancel(userId).catch(() => {
      console.warn('Failed to cancel background push');
    });

    releaseWakeLock();
  }, [releaseWakeLock, userId]);

  const resetTimer = useCallback(() => {
    cancelWorkoutTimer(userId);
    setIsActive(false);
    setTimeLeft(0);
    setInitialTime(0);
    setStartTime(null);
    setEndsAtMs(null);
    setHasNotified(false);
    endTimeRef.current = null;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    releaseWakeLock();
  }, [releaseWakeLock, userId]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;

  return {
    timeLeft,
    isActive,
    progress,
    startTimer,
    pauseTimer,
    resetTimer,
    formatTime: () => formatTime(timeLeft),
    requestPermission
  };
};
