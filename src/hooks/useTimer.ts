import { useState, useEffect, useCallback } from 'react';

export const useTimer = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const startTimer = useCallback((seconds: number) => {
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
    setInitialTime(0);
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