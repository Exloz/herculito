import { useRef } from 'react';
import { ArrowRight, Flame, Target, X } from 'lucide-react';
import type { SportType } from '../../../shared/types';
import { DialogPortal } from '../../../shared/ui/DialogPortal';
import { useDialogA11y } from '../../../shared/hooks/useDialogA11y';

interface SportSessionPickerProps {
  onSelect: (sport: SportType) => void;
  onClose: () => void;
}

export function SportSessionPicker({ onSelect, onClose }: SportSessionPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, { onClose });

  return (
    <DialogPortal>
      <div className="motion-dialog-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sport-picker-title" tabIndex={-1}
          className="motion-dialog-panel w-full max-w-lg rounded-2xl border border-mist/60 bg-charcoal p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id="sport-picker-title" className="font-display text-2xl text-white">¿Cómo quieres moverte?</h2>
              <p className="mt-1 text-sm text-slate-300">Elige tu actividad y configura la sesión.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar selección de actividad" className="btn-ghost touch-target p-2">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { id: 'archery' as const, label: 'Tiro con arco', description: 'Registra flechas, rondas y puntuación.', icon: Target },
              { id: 'hiit' as const, label: 'HIIT', description: 'Alterna intervalos de esfuerzo y descanso.', icon: Flame }
            ].map((sport) => {
              const Icon = sport.icon;
              return (
                <button key={sport.id} type="button" onClick={() => onSelect(sport.id)}
                  aria-label={sport.label} aria-describedby={`sport-option-${sport.id}`}
                  className="flex min-h-20 w-full items-center gap-3 rounded-xl border border-mist/60 bg-slateDeep/40 p-4 text-left transition-colors hover:border-mint/40 hover:bg-mint/5">
                  <Icon size={24} className="shrink-0 text-mint" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-white">{sport.label}</span>
                    <span id={`sport-option-${sport.id}`} className="mt-1 block text-sm text-slate-300">{sport.description}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DialogPortal>
  );
}
