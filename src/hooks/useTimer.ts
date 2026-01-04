import { useState, useEffect, useCallback, useRef } from 'react';

const TIMER_STORAGE_KEY = 'workoutTimerState';

interface TimerState {
  timeLeft: number;
  isActive: boolean;
  initialTime: number;
  startTime: number | null;
  hasNotified: boolean;
}

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const showAlertFallback = (title: string, body: string): void => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}: ${body}`);
  }
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

const showTimerNotification = async (title: string, body: string): Promise<void> => {
  if (typeof window === 'undefined') return;

  if (!('Notification' in window)) {
    showAlertFallback(title, body);
    return;
  }

  if (Notification.permission !== 'granted') {
    showAlertFallback(title, body);
    return;
  }

  const options: NotificationOptions = {
    body,
    icon: '/app-logo.png',
    badge: '/app-logo.png',
    tag: 'rest-timer',
    requireInteraction: false,
    silent: false
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      return;
    } catch (error) {
      console.warn('Service worker notification failed:', error);
    }
  }

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn('Notification failed:', error);
    showAlertFallback(title, body);
  }

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

    if (state.isActive && state.startTime) {
      const elapsed = Math.floor((now - state.startTime) / 1000);
      state.timeLeft = Math.max(0, state.initialTime - elapsed);

      if (state.timeLeft === 0) {
        state.isActive = false;
      }
    }

    return state;
  } catch {
    console.warn('Failed to load timer state');
    return null;
  }
};

export const useTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasNotified, setHasNotified] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !isMobileDevice()) {
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

  const loadState = useCallback(() => {
    const savedState = loadTimerState();
    if (savedState && savedState.isActive && savedState.timeLeft > 0) {
      setTimeLeft(savedState.timeLeft);
      setIsActive(savedState.isActive);
      setInitialTime(savedState.initialTime);
      setStartTime(savedState.startTime);
      setHasNotified(false);
    } else {
      setTimeLeft(0);
      setIsActive(false);
      setInitialTime(0);
      setStartTime(null);
      setHasNotified(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const state: TimerState = { timeLeft, isActive, initialTime, startTime, hasNotified };
    saveTimerState(state);
  }, [timeLeft, isActive, initialTime, startTime, hasNotified]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadState]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
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

    const now = Date.now();
    timerStartTimeRef.current = now;
    endTimeRef.current = now + (initialTime * 1000);

    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;

      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsActive(false);
        setStartTime(null);
        endTimeRef.current = null;

        if (!hasNotified) {
          setHasNotified(true);
          void showTimerNotification(
            '¡Descanso terminado!',
            'Continúa con tu entrenamiento basura!'
          );
        }

        releaseWakeLock();
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, hasNotified, initialTime, acquireWakeLock, startAudioContext, releaseWakeLock]);

  const requestPermission = useCallback(async () => {
    return requestNotificationPermission();
  }, []);

  const startTimer = useCallback(async (seconds: number) => {
    if (seconds <= 0) return;

    localStorage.removeItem(TIMER_STORAGE_KEY);

    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
    setStartTime(Date.now());
    setHasNotified(false);

    if (typeof navigator !== 'undefined' && 'userActivation' in navigator) {
      if ((navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive) {
        await requestNotificationPermission();
      }
    }
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setIsActive(false);
    setTimeLeft(0);
    setInitialTime(0);
    setStartTime(null);
    setHasNotified(false);
    timerStartTimeRef.current = null;
    endTimeRef.current = null;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

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
