import { useState, useEffect, useCallback } from 'react';

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

  const permission = await NotificationAPI.requestPermission();
  return permission === 'granted';
};

// Show notification
const showNotification = (title: string, body: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const NotificationAPI = window.Notification;
  if (!NotificationAPI || NotificationAPI.permission !== 'granted') {
    return;
  }

  new NotificationAPI(title, {
    body,
    icon: '/app-logo.png', // You can change this to your app icon
    badge: '/app-logo.png',
    tag: 'rest-timer',
    requireInteraction: false,
    silent: false
  });
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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Only run timer logic after initialization
    if (isInitialized) {
      if (isActive && timeLeft > 0) {
        interval = setInterval(() => {
          setTimeLeft(time => {
            if (time <= 1) {
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
              return 0;
            }
            return time - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, hasNotified, startTime, isInitialized]);

  const startTimer = useCallback(async (seconds: number) => {
    if (seconds <= 0) {
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

    // Request notification permission when starting timer
    await requestNotificationPermission();
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setIsActive(false);
    setTimeLeft(0);
    setInitialTime(0);
    setStartTime(null);
    setHasNotified(false);
  }, []);

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
