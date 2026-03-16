import React, { useState, useCallback } from 'react';
import { ArrowLeft, Plus, CheckCircle, MapPin } from 'lucide-react';
import type { SportSession } from '../../../../shared/types';
import { RoundCard } from './RoundCard';
import { SessionSummary } from './SessionSummary';
import { useUI } from '../../../../app/providers/ui-context';
import { toUserMessage } from '../../../../shared/lib/errorMessages';

interface ArcherySessionProps {
  session: SportSession;
  onAddRound: (distance: number, targetSize: number, arrowsPerEnd: number) => Promise<void>;
  onAddEnd: (roundId: string, arrows: { score: number; isGold: boolean }[]) => Promise<void>;
  onComplete: (notes?: string) => Promise<void>;
  onAbandon: () => void;
  onBack: () => void;
}

const DISTANCE_OPTIONS = [
  { distance: 18, targetSize: 40, label: '18m Indoor (40cm)' },
  { distance: 25, targetSize: 60, label: '25m Indoor (60cm)' },
  { distance: 30, targetSize: 80, label: '30m (80cm)' },
  { distance: 50, targetSize: 80, label: '50m (80cm)' },
  { distance: 60, targetSize: 122, label: '60m (122cm)' },
  { distance: 70, targetSize: 122, label: '70m (122cm)' },
  { distance: 90, targetSize: 122, label: '90m (122cm)' },
];

const ARROWS_PER_END_OPTIONS = [3, 6];

export const ArcherySession: React.FC<ArcherySessionProps> = ({
  session,
  onAddRound,
  onAddEnd,
  onComplete,
  onAbandon,
  onBack
}) => {
  const { showToast, confirm } = useUI();
  const [showAddRound, setShowAddRound] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(DISTANCE_OPTIONS[4]); // 70m default
  const [arrowsPerEnd, setArrowsPerEnd] = useState(6);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAddRound = useCallback(async () => {
    try {
      await onAddRound(selectedDistance.distance, selectedDistance.targetSize, arrowsPerEnd);
      setShowAddRound(false);
      showToast('Ronda agregada', 'success');
    } catch (error) {
      showToast(toUserMessage(error, 'Error agregando ronda'), 'error');
    }
  }, [onAddRound, selectedDistance, arrowsPerEnd, showToast]);

  const handleAddEnd = useCallback(async (roundId: string, arrows: { score: number; isGold: boolean }[]) => {
    try {
      await onAddEnd(roundId, arrows);
      showToast('Tanda registrada', 'success');
    } catch (error) {
      showToast(toUserMessage(error, 'Error registrando tanda'), 'error');
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
              <div>
                <label className="text-xs text-slate-400 block mb-2">Distancia</label>
                <select
                  value={selectedDistance.distance}
                  onChange={(e) => {
                    const dist = DISTANCE_OPTIONS.find(d => d.distance === Number(e.target.value));
                    if (dist) setSelectedDistance(dist);
                  }}
                  className="input"
                >
                  {DISTANCE_OPTIONS.map(opt => (
                    <option key={opt.distance} value={opt.distance}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Flechas por tanda</label>
                <div className="flex gap-2">
                  {ARROWS_PER_END_OPTIONS.map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setArrowsPerEnd(count)}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        arrowsPerEnd === count
                          ? 'bg-mint text-ink'
                          : 'bg-slateDeep text-slate-300 hover:bg-slateDeep/80'
                      }`}
                    >
                      {count} flechas
                    </button>
                  ))}
                </div>
              </div>
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
