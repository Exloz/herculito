import { useState, useEffect, useCallback, useRef } from 'react';

// Extend Window interface to include alert and Notification
declare const window: Window & {
  alert: (message?: string) => void;
  Notification: {
    new (title: string, options?: NotificationOptions): Notification;
    permission: NotificationPermission;
    requestPermission(): Promise<NotificationPermission>;
  };
};

// Request notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  const NotificationAPI = window.Notification;
  if (!NotificationAPI) {
    return false;
  }

  if (NotificationAPI.permission === 'granted') {
    return true;
  }

  if (NotificationAPI.permission === 'denied') {
    return false;
  }

  try {
    const permission = await NotificationAPI.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return false;
  }
};

// Show notification using service worker
const showNotification = (title: string, body: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if service worker is available
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Send message to service worker to show notification
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      icon: '/app-logo.png',
      badge: '/app-logo.png'
    });
  } else {
    // Fallback to browser notification if service worker not available
    if ('Notification' in window) {
      const NotificationAPI = window.Notification;
      if (NotificationAPI && NotificationAPI.permission === 'granted') {
        try {
          new NotificationAPI(title, {
            body,
            icon: '/app-logo.png',
            badge: '/app-logo.png',
            tag: 'rest-timer',
            requireInteraction: false,
            silent: false
          });
        } catch (error) {
          console.warn('Failed to show notification:', error);
          // Final fallback to alert
          if (typeof window !== 'undefined') {
            (window as Window & { alert: (message?: string) => void }).alert(`${title}: ${body}`);
          }
        }
      } else {
        // Fallback to alert if no permission
        if (typeof window !== 'undefined') {
          (window as Window & { alert: (message?: string) => void }).alert(`${title}: ${body}`);
        }
      }
    } else {
      // Fallback to alert if notifications not supported
      if (typeof window !== 'undefined') {
        (window as Window & { alert: (message?: string) => void }).alert(`${title}: ${body}`);
      }
    }
  }

  // Also vibrate on mobile if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};

const TIMER_STORAGE_KEY = 'workoutTimerState';

interface TimerState {
  timeLeft: number;
  isActive: boolean;
  initialTime: number;
  startTime: number | null;
  hasNotified: boolean;
}

const saveTimerState = (state: TimerState) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save timer state to localStorage:', error);
  }
};

const loadTimerState = (): TimerState | null => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return null;
    const state = JSON.parse(stored);
    const now = Date.now();
    if (state.isActive && state.startTime) {
      const elapsed = Math.floor((now - state.startTime) / 1000);
      state.timeLeft = Math.max(0, state.initialTime - elapsed);
      if (state.timeLeft === 0) {
        state.isActive = false;
      }
    }
    return state;
  } catch (error) {
    console.warn('Failed to load timer state from localStorage:', error);
    return null;
  }
};

export const useTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasNotified, setHasNotified] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Load state on mount
  useEffect(() => {
    const savedState = loadTimerState();
    if (savedState && savedState.isActive && savedState.timeLeft > 0) {
      // Only restore if timer was active and has time left
      setTimeLeft(savedState.timeLeft);
      setIsActive(savedState.isActive);
      setInitialTime(savedState.initialTime);
      setStartTime(savedState.startTime);
      setHasNotified(false); // Don't restore notification state

      // If there's a saved active timer, restart it in the Web Worker
      if (workerRef.current && savedState.startTime) {
        const now = Date.now();
        const elapsed = Math.floor((now - savedState.startTime) / 1000);
        const remainingTime = Math.max(0, savedState.initialTime - elapsed);
        if (remainingTime > 0) {
          workerRef.current.postMessage({
            type: 'START_TIMER',
            seconds: remainingTime
          });
        }
      }
    } else {
      // Reset to clean state if no valid saved state
      setTimeLeft(0);
      setIsActive(false);
      setInitialTime(0);
      setStartTime(null);
      setHasNotified(false);
    }
    setIsInitialized(true);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    const state: TimerState = { timeLeft, isActive, initialTime, startTime, hasNotified };
    saveTimerState(state);
  }, [timeLeft, isActive, initialTime, startTime, hasNotified]);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      workerRef.current = new Worker('/timer-worker.js');

      workerRef.current.onmessage = (e) => {
        const { type, timeLeft: newTimeLeft, isActive: newIsActive } = e.data;

        if (type === 'WORKER_READY') {
          setWorkerReady(true);
        } else if (type === 'TIME_UPDATE') {
          setTimeLeft(newTimeLeft);
          setIsActive(newIsActive);
        } else if (type === 'TIMER_FINISHED') {
          setIsActive(false);
          setStartTime(null);
          if (!hasNotified) {
            setHasNotified(true);
            // Trigger notification when timer reaches 0
            showNotification(
              '¡Tiempo de descanso terminado!',
              'Tu descanso ha finalizado. ¡Es hora de continuar con tu entrenamiento!'
            );
          }
        } else if (type === 'RESET_COMPLETE') {
          setTimeLeft(0);
          setIsActive(false);
          setInitialTime(0);
          setStartTime(null);
          setHasNotified(false);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Web Worker error:', error);
      };

      // Send a message to the worker to indicate it's ready
      workerRef.current.postMessage({ type: 'INIT' });
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setWorkerReady(false);
    };
  }, [isInitialized, hasNotified]);

  const startTimer = useCallback(async (seconds: number) => {
    if (seconds <= 0 || !workerRef.current || !workerReady) {
      return;
    }

    const now = Date.now();
    // Clear any existing timer state before starting new one
    localStorage.removeItem(TIMER_STORAGE_KEY);

    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
    setStartTime(now);
    setHasNotified(false);

    // Send start message to Web Worker
    workerRef.current.postMessage({
      type: 'START_TIMER',
      seconds
    });

    // Request notification permission when starting timer
    await requestNotificationPermission();
  }, [workerReady]);

  const pauseTimer = useCallback(() => {
    if (workerRef.current && workerReady) {
      workerRef.current.postMessage({ action: 'PAUSE' });
    }
    setIsActive(false);
  }, [workerReady]);

  const resetTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    if (workerRef.current && workerReady) {
      workerRef.current.postMessage({ action: 'RESET' });
    }
    setIsActive(false);
    setTimeLeft(0);
    setInitialTime(0);
    setStartTime(null);
    setHasNotified(false);
  }, [workerReady]);

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
    formatTime: () => formatTime(timeLeft)
  };
};
