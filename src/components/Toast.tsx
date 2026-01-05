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

  const bgColors = {
    success: 'bg-mint/10 border-mint/40 text-mint',
    error: 'bg-crimson/10 border-crimson/40 text-crimson',
    info: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${bgColors[type]}`}>
      <span className="shrink-0">{icons[type]}</span>
      <p className="text-sm font-medium">{message}</p>
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
