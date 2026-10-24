import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div
      className="app-toast"
      data-type={type}
      role={type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
    >
      <span className="shrink-0">{icons[type]}</span>
      <p dir="auto" className="min-w-0 flex-1 break-words text-sm font-medium" style={{ overflowWrap: 'anywhere' }}>{message}</p>
      <button 
        onClick={() => onClose(id)} 
        className="shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
};
