import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, CheckCircle, MapPin } from 'lucide-react';
import type { SportSession } from '../../../../shared/types';
import { RoundCard } from './RoundCard';
import { SessionSummary } from './SessionSummary';
import { PresetNumericInput } from './PresetNumericInput';
import { useUI } from '../../../../app/providers/ui-context';
import { toUserMessage } from '../../../../shared/lib/errorMessages';

interface ArcherySessionProps {
  session: SportSession;
  onAddRound: (distance: number, targetSize: number, arrowsPerEnd: number) => Promise<void>;
  onAddEnd: (roundId: string, arrows: { score: number; isGold: boolean }[]) => Promise<void>;
  onComplete: (notes?: string) => Promise<void>;
  onNotesChange?: (notes: string) => void;
  onAbandon: () => void;
  onBack: () => void;
  pendingSyncCount?: number;
}

const SUGGESTED_DISTANCES = [18, 25, 30, 50, 60, 70, 90] as const;
const SUGGESTED_TARGET_SIZES = [40, 60, 80, 122] as const;
const SUGGESTED_ARROWS_PER_END = [3, 6] as const;

const DEFAULT_DISTANCE = 70;
const DEFAULT_TARGET_SIZE = 122;
const DEFAULT_ARROWS_PER_END = 6;
const MAX_ARROWS_PER_END = 12;
const MAX_DISTANCE = 200;
const MAX_TARGET_SIZE = 200;

export const ArcherySession: React.FC<ArcherySessionProps> = ({
  session,
  onAddRound,
  onAddEnd,
  onComplete,
  onNotesChange,
  onAbandon,
  onBack,
  pendingSyncCount = 0
}) => {
  const { showToast, confirm } = useUI();
  const [showAddRound, setShowAddRound] = useState(false);
  const [distance, setDistance] = useState(DEFAULT_DISTANCE);
  const [targetSize, setTargetSize] = useState(DEFAULT_TARGET_SIZE);
  const [arrowsPerEnd, setArrowsPerEnd] = useState(DEFAULT_ARROWS_PER_END);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [notes, setNotes] = useState(session.notes ?? '');

  useEffect(() => {
    onNotesChange?.(notes);
  }, [notes, onNotesChange]);

  const handleAddRound = useCallback(async () => {
    try {
      await onAddRound(distance, targetSize, arrowsPerEnd);
      setShowAddRound(false);
      showToast('Ronda agregada', 'success');
    } catch (error) {
      showToast(toUserMessage(error, 'Error agregando ronda'), 'error');
    }
  }, [onAddRound, distance, targetSize, arrowsPerEnd, showToast]);

  const handleAddEnd = useCallback(async (roundId: string, arrows: { score: number; isGold: boolean }[]) => {
    try {
      await onAddEnd(roundId, arrows);
      showToast('Tanda registrada', 'success');
    } catch (error) {
      showToast(toUserMessage(error, 'Error registrando tanda'), 'error');
      throw error;
    }
  }, [onAddEnd, showToast]);

  const handleComplete = useCallback(async () => {
    confirm({
      title: 'Completar sesión',
      message: '¿Estás seguro de que quieres finalizar esta sesión? No podrás agregar más rondas después.',
      confirmText: 'Completar',
      cancelText: 'Continuar',
      onConfirm: async () => {
        setIsCompleting(true);
        try {
          await onComplete(notes);
          setShowSummary(true);
          showToast('Sesión completada', 'success');
        } catch (error) {
          showToast(toUserMessage(error, 'Error completando sesión'), 'error');
        } finally {
          setIsCompleting(false);
        }
      }
    });
  }, [confirm, onComplete, notes, showToast]);

  const handleAbandon = useCallback(() => {
    confirm({
      title: 'Abandonar sesión',
      message: '¿Estás seguro? Se perderán todos los datos de esta sesión.',
      confirmText: 'Abandonar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: onAbandon
    });
  }, [confirm, onAbandon]);

  if (showSummary) {
    return (
      <div className="app-shell pb-28">
        <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <SessionSummary
            session={session}
            onClose={onBack}
          />
        </div>
      </div>
    );
  }

  const totalScore = session.archeryData?.totalScore ?? 0;
  const rounds = session.archeryData?.rounds ?? [];
  const hasRounds = rounds.length > 0;

  return (
    <div className="app-shell pb-28">
      {/* Header */}
      <header className="app-header px-4 pb-4 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleAbandon}
            className="btn-ghost inline-flex items-center gap-2 text-slate-400"
          >
            <ArrowLeft size={18} />
            <span>Salir</span>
          </button>
          <div className="text-center">
            <div className="text-xs text-slate-400">Tiro con Arco</div>
            <div className="font-display text-lg text-white">
              {totalScore} pts
            </div>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Score Display */}
        <div className="app-card p-6 mb-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="score-display-lg text-mint">{totalScore}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Total</div>
            </div>
            <div>
              <div className="score-display-lg text-white">
                {session.archeryData?.averageArrow ?? '--'}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Promedio</div>
            </div>
            <div>
              <div className="score-display-lg text-amberGlow">
                {session.archeryData?.goldCount ?? 0}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Oros</div>
            </div>
          </div>
        </div>

        {/* Notes Input */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <MapPin size={14} />
            <span>Ubicación / Notas</span>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Arco Club, viento fuerte..."
            className="input"
          />
        </div>

        {pendingSyncCount > 0 && (
          <div className="mb-5 rounded-2xl border border-amberGlow/30 bg-amberGlow/10 px-4 py-3 text-sm text-amberGlow">
            Guardado local. {pendingSyncCount} cambio{pendingSyncCount === 1 ? '' : 's'} pendiente{pendingSyncCount === 1 ? '' : 's'} de sincronizar.
          </div>
        )}

        {/* Rounds */}
        <div className="space-y-3 mb-5">
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              isActive={true}
              onAddEnd={handleAddEnd}
              disabled={isCompleting}
            />
          ))}
        </div>

        {/* Add Round Button */}
        {!showAddRound ? (
          <button
            type="button"
            onClick={() => setShowAddRound(true)}
            disabled={isCompleting}
            className="w-full btn-secondary inline-flex items-center justify-center gap-2 mb-5"
          >
            <Plus size={18} />
            <span>Agregar ronda</span>
          </button>
        ) : (
          <div className="app-card p-4 mb-5">
            <div className="text-sm font-medium text-white mb-3">
              Nueva ronda
            </div>
            <div className="space-y-3">
              <PresetNumericInput
                label="Distancia (m)"
                value={distance}
                onChange={setDistance}
                presets={SUGGESTED_DISTANCES}
                min={1}
                max={MAX_DISTANCE}
                unit="m"
              />
              <PresetNumericInput
                label="Tamaño del blanco (cm)"
                value={targetSize}
                onChange={setTargetSize}
                presets={SUGGESTED_TARGET_SIZES}
                min={1}
                max={MAX_TARGET_SIZE}
                unit="cm"
              />
              <PresetNumericInput
                label="Flechas por tanda"
                value={arrowsPerEnd}
                onChange={setArrowsPerEnd}
                presets={SUGGESTED_ARROWS_PER_END}
                min={1}
                max={MAX_ARROWS_PER_END}
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRound(false)}
                  className="flex-1 btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="flex-1 btn-primary"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Button */}
        {hasRounds && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full btn-primary inline-flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            <span>{isCompleting ? 'Guardando...' : 'Completar sesión'}</span>
          </button>
        )}
      </main>
    </div>
  );
};
