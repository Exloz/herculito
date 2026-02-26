import React, { useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { UIContext, type ConfirmOptions } from './ui-context';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setModalConfig(options);
    setModalOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalConfig?.onConfirm) {
      modalConfig.onConfirm();
    }
    setModalOpen(false);
    setModalConfig(null);
  }, [modalConfig]);

  const handleCancel = useCallback(() => {
    if (modalConfig?.onCancel) {
      modalConfig.onCancel();
    }
    setModalOpen(false);
    setModalConfig(null);
  }, [modalConfig]);

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}
      
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-relevant="additions text"
      >
        <div className="pointer-events-auto flex flex-col gap-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={removeToast}
            />
          ))}
        </div>
      </div>

      {modalConfig && (
        <ConfirmModal
          isOpen={modalOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDanger={modalConfig.isDanger}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </UIContext.Provider>
  );
};
