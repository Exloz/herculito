import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Timer, Minus, Plus, X } from 'lucide-react';
import type { HiitConfig as HiitConfigType } from '../../../../shared/types';
import { useDialogA11y } from '../../../../shared/hooks/useDialogA11y';

interface HiitConfigProps {
  onStart: (config: HiitConfigType) => void;
  onClose: () => void;
  isStarting: boolean;
}

const CONFIG_PRESETS: Array<{ label: string; config: HiitConfigType }> = [
  { label: 'Rápido', config: { intervals: 4, workDuration: 20, restEnabled: true, restDuration: 10 } },
  { label: 'Clásico', config: { intervals: 8, workDuration: 30, restEnabled: true, restDuration: 15 } },
  { label: 'Intenso', config: { intervals: 12, workDuration: 40, restEnabled: true, restDuration: 20 } },
];

const NumberStepper: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, min, max, step = 1, unit, disabled }) => {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-40' : ''}`}>
      <label className="text-sm text-slate-400 block">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slateDeep text-white transition-colors hover:bg-mint/20 disabled:opacity-30 disabled:hover:bg-slateDeep touch-target"
          aria-label={`Reducir ${label}`}
        >
          <Minus size={18} />
        </button>
        <div className="flex-1 text-center">
          <span className="text-3xl font-display font-bold text-white">{value}</span>
          {unit && <span className="ml-1.5 text-sm text-slate-400">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slateDeep text-white transition-colors hover:bg-mint/20 disabled:opacity-30 disabled:hover:bg-slateDeep touch-target"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export const HiitConfig: React.FC<HiitConfigProps> = ({ onStart, onClose, isStarting }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, { onClose });
  const [intervals, setIntervals] = useState(8);
  const [workDuration, setWorkDuration] = useState(30);
  const [restEnabled, setRestEnabled] = useState(true);
  const [restDuration, setRestDuration] = useState(15);

  const handleStart = () => {
    onStart({
      intervals,
      workDuration,
      restEnabled,
      restDuration: restEnabled ? restDuration : 0,
    });
  };

  const totalWorkTime = intervals * workDuration;
  const totalRestTime = restEnabled ? Math.max(0, intervals - 1) * restDuration : 0;
  const totalTime = totalWorkTime + totalRestTime;
  const totalMinutes = Math.floor(totalTime / 60);
  const totalSecondsRem = totalTime % 60;
  const hasDom = typeof document !== 'undefined';

  const modal = (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-sm sm:items-center">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hiit-config-title" tabIndex={-1} className="motion-dialog-panel w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-mist/60 bg-charcoal shadow-2xl sm:max-h-[85vh]">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15">
              <Timer size={20} className="text-mint" />
            </div>
            <div>
              <h2 id="hiit-config-title" className="text-lg font-display font-bold text-white">Temporizador HIIT</h2>
              <p className="text-xs text-slate-400">Configura tu sesión</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-9 w-9 p-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-3">
          {/* Presets */}
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Configuraciones rápidas</div>
            <div className="grid grid-cols-3 gap-2">
              {CONFIG_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setIntervals(preset.config.intervals);
                    setWorkDuration(preset.config.workDuration);
                    setRestEnabled(preset.config.restEnabled);
                    setRestDuration(preset.config.restDuration);
                  }}
                  className="rounded-xl bg-slateDeep px-2 py-2.5 text-center transition-colors hover:bg-mint/10 hover:text-mint"
                  aria-pressed={intervals === preset.config.intervals && workDuration === preset.config.workDuration && restEnabled === preset.config.restEnabled && restDuration === preset.config.restDuration}
                >
                   <div className="text-sm font-semibold text-white">{preset.label}</div>
                   <div className="mt-1 text-xs text-slate-400">{preset.config.intervals} × {preset.config.workDuration}s</div>
                </button>
              ))}
            </div>
          </div>

          {/* Config fields */}
          <div className="space-y-5">
            <NumberStepper
              label="Intervalos"
              value={intervals}
              onChange={setIntervals}
              min={1}
              max={50}
            />

            <NumberStepper
              label="Trabajo"
              value={workDuration}
              onChange={setWorkDuration}
              min={5}
              max={300}
              unit="s"
            />

            <div className="rounded-xl bg-slateDeep/60 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Descanso entre intervalos</label>
                <button
                  type="button"
                  role="switch"
                  aria-label="Descanso entre intervalos"
                  aria-checked={restEnabled}
                  onClick={() => setRestEnabled(!restEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${restEnabled ? 'bg-mint' : 'bg-slate-600'
                    }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#fff] shadow ring-0 transition duration-200 ease-in-out ${restEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </button>
              </div>

              {restEnabled && (
                <NumberStepper
                  label="Duración del descanso"
                  value={restDuration}
                  onChange={setRestDuration}
                  min={5}
                  max={120}
                  unit="s"
                />
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
         <div className="mx-5 mb-4 rounded-xl bg-[linear-gradient(180deg,rgb(var(--color-accent)/0.08),transparent)] border border-mint/20 p-4">
           <p className="mb-3 text-xs text-slate-300">{intervals} intervalos de {workDuration} segundos{restEnabled ? `, con ${restDuration} segundos de descanso entre ellos. No hay descanso al finalizar.` : ', sin descanso entre ellos.'}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-display font-bold text-mint">{intervals}</div>
              <div className="px-1 text-[9px] uppercase tracking-[0.14em] leading-tight text-slate-400 sm:text-[10px] sm:tracking-widest">Intervalos</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-amberGlow">
                {totalMinutes > 0 ? `${totalMinutes}:${String(totalSecondsRem).padStart(2, '0')}` : `${totalTime}s`}
              </div>
              <div className="px-1 text-[9px] uppercase tracking-[0.14em] leading-tight text-slate-400 sm:text-[10px] sm:tracking-widest">Duración total</div>
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-white">{workDuration}/{restEnabled ? restDuration : 0}</div>
              <div className="px-1 text-[9px] uppercase tracking-[0.14em] leading-tight break-words text-slate-400 sm:text-[10px] sm:tracking-widest">Trabajo/Descanso</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-charcoal px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
          >
            {isStarting ? 'Iniciando...' : 'Comenzar'}
          </button>
        </div>
      </div>
    </div>
  );

  return hasDom ? createPortal(modal, document.body) : null;
};
