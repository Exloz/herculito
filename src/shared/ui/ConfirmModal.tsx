import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useDialogA11y(modalRef, { enabled: isOpen, onClose: onCancel });

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    confirmButtonRef.current?.focus();
    return () => {
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="motion-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        className="motion-dialog-panel w-full max-w-lg rounded-2xl border border-mist/60 bg-charcoal shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDanger ? 'bg-crimson/15 text-crimson' : 'bg-mint/15 text-mint'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 id="modal-title" dir="auto" className="min-w-0 break-words text-lg font-display text-white" style={{ overflowWrap: 'anywhere' }}>
              {title}
            </h3>
          </div>

          <p id="modal-desc" dir="auto" className="mb-6 text-sm leading-relaxed text-slate-300 break-words" style={{ overflowWrap: 'anywhere' }}>
            {message}
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="btn-ghost text-sm"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`text-sm font-semibold rounded-xl px-4 py-2 transition-colors ${
                isDanger
                  ? 'bg-crimson text-ink hover:bg-red-500'
                  : 'bg-mint text-ink hover:bg-mintDeep'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
