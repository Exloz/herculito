import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Timer as TimerIcon, X, Pause, Play } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  onClose: () => void;
  initialSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({ onClose, initialSeconds }) => {
  const { timeLeft, isActive, progress, startTimer, pauseTimer, resetTimer, formatTime, requestPermission } = useTimer();
  const startTimeRef = useRef<number | null>(null);
  const hasAutoClosed = useRef(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (initialSeconds && initialSeconds > 0 && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [initialSeconds]);

  useEffect(() => {
    if (initialSeconds && initialSeconds > 0) {
      startTimer(initialSeconds);
    }
  }, [initialSeconds, startTimer]);

  const handleClose = useCallback(() => {
    resetTimer();
    onClose();
  }, [onClose, resetTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !isActive && startTimeRef.current && !hasAutoClosed.current) {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > 1000) {
        hasAutoClosed.current = true;
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    }
  }, [timeLeft, isActive, handleClose]);

  const handleEnableNotifications = async () => {
    await requestPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  return (
    <div className="fixed left-4 right-4 mx-auto max-w-sm app-card px-3 py-2.5 z-50 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:bottom-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <TimerIcon className="text-mint" size={18} />
          <span className="text-sm text-white font-medium">Descanso</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="text-2xl font-bold text-white font-mono leading-none tabular-nums">{formatTime()}</div>
          <button
            onClick={handleClose}
            className="btn-ghost min-h-0 min-w-0 h-8 w-8 p-0"
            aria-label="Cerrar temporizador"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="w-full bg-slateDeep rounded-full h-1.5">
            <div
              className="bg-mint h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={isActive ? pauseTimer : () => startTimer(timeLeft || (initialSeconds || 0))}
          className="rounded-lg bg-mint text-ink font-semibold px-3 py-2 text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-mintDeep touch-manipulation min-w-[120px]"
          aria-label={isActive ? 'Pausar temporizador' : 'Reanudar temporizador'}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          <span>{isActive ? 'Pausar' : 'Reanudar'}</span>
        </button>
      </div>

      {notificationPermission === 'default' && (
        <div className="mt-2 text-center">
          <button
            onClick={handleEnableNotifications}
            className="text-xs text-mint hover:text-mintDeep underline"
          >
            Activar notificaciones
          </button>
        </div>
      )}

      {notificationPermission === 'denied' && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Notificaciones bloqueadas. Habilitalas en el navegador.
        </div>
      )}
    </div>
  );
};
