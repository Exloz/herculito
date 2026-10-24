import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Timer as TimerIcon, X, Pause, Play } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTimer } from '../hooks/useTimer';
import { isLocalPreview } from '../../../app/preview/previewMode';

interface TimerProps {
  userId: string;
  onClose: () => void;
  initialSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({ userId, onClose, initialSeconds }) => {
  const { timeLeft, isActive, progress, startTimer, pauseTimer, resetTimer, formatTime, requestPermission } = useTimer(userId);
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

  const timerUi = (
    <div className="rest-timer-console motion-pop-in fixed left-4 right-4 z-[45] mx-auto max-w-sm rounded-xl bg-graphite px-3 py-3 shadow-lift bottom-[calc(env(safe-area-inset-bottom)+5.15rem)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TimerIcon className="shrink-0 text-mint" size={20} aria-hidden="true" />
          <div>
            <span className="text-xs text-muted">Descanso</span>
            <div className="font-mono text-2xl font-semibold leading-tight tabular-nums text-content">{formatTime()}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={isActive ? pauseTimer : () => startTimer(timeLeft || (initialSeconds || 0))}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-ink hover:bg-mintDeep"
            aria-label={isActive ? 'Pausar temporizador' : 'Reanudar temporizador'}
            title={isActive ? 'Pausar' : 'Reanudar'}>
            {isActive ? <Pause size={19} /> : <Play size={19} />}
          </button>
          <button type="button" onClick={handleClose} className="workspace-icon-button" aria-label="Cerrar temporizador">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slateDeep">
        <div className="h-full rounded-full bg-mint transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>

      {isLocalPreview() && (
        <p className="mt-2 text-center text-[11px] text-slate-400">Descanso local · push no disponible en la preview</p>
      )}

      {!isLocalPreview() && notificationPermission === 'default' && (
        <div className="mt-2 text-center">
          <button
            onClick={handleEnableNotifications}
            className="min-h-11 text-xs text-mint hover:text-mintDeep underline"
          >
            Activar notificaciones
          </button>
        </div>
      )}

      {!isLocalPreview() && notificationPermission === 'denied' && (
        <div className="mt-2 text-center text-xs text-slate-400">
          Notificaciones bloqueadas. Habilitalas en el navegador.
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(timerUi, document.body);
};
