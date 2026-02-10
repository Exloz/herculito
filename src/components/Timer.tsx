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
    <div className="fixed bottom-4 left-4 right-4 app-card p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TimerIcon className="text-mint" size={20} />
          <span className="text-white font-medium">Descanso</span>
        </div>
        <button
          onClick={handleClose}
          className="btn-ghost"
          aria-label="Cerrar temporizador"
        >
          <X size={20} />
        </button>
      </div>

      <div className="text-center mb-3">
        <div className="text-3xl font-bold text-white font-mono">{formatTime()}</div>
        <div className="w-full bg-slateDeep rounded-full h-2 mt-2">
          <div
            className="bg-mint h-2 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={isActive ? pauseTimer : () => startTimer(timeLeft || (initialSeconds || 0))}
          className="btn-primary flex items-center gap-2 touch-manipulation"
          aria-label={isActive ? 'Pausar temporizador' : 'Reanudar temporizador'}
        >
          {isActive ? <Pause size={18} /> : <Play size={18} />}
          <span>{isActive ? 'Pausar' : 'Reanudar'}</span>
        </button>
        <button
          onClick={resetTimer}
          className="btn-secondary touch-manipulation"
          aria-label="Reiniciar temporizador"
        >
          Reiniciar
        </button>
      </div>

      {notificationPermission === 'default' && (
        <div className="mt-3 text-center">
          <button
            onClick={handleEnableNotifications}
            className="text-sm text-mint hover:text-mintDeep underline"
          >
            Activar notificaciones
          </button>
        </div>
      )}

      {notificationPermission === 'denied' && (
        <div className="mt-3 text-center text-xs text-slate-400">
          Notificaciones bloqueadas. Habilitalas en el navegador.
        </div>
      )}
    </div>
  );
};
