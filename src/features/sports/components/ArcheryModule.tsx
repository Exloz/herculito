import React, { useMemo } from 'react';
import { Crosshair, Flag, Minus, Plus, Target, Trash2 } from 'lucide-react';
import { useUI } from '../../../app/providers/ui-context';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { formatNumber } from '../../../shared/lib/intl';
import type { User } from '../../../shared/types';
import { getArcheryRoundTotal, getArcherySessionTotals, useSports } from '../hooks/useSports';

interface ArcheryModuleProps {
  user: User;
}

const MAX_NOTES_LENGTH = 300;
const QUICK_DISTANCES = [18, 30, 50, 70];
const QUICK_ARROW_SCORES = [10, 9, 8, 0];

export const ArcheryModule: React.FC<ArcheryModuleProps> = ({ user }) => {
  const { showToast, confirm } = useUI();
  const {
    sessions,
    activeSession,
    loading,
    startSession,
    addRound,
    removeRound,
    updateRoundDistance,
    updateRoundArrow,
    updateSessionNotes,
    completeActiveSession,
    cancelActiveSession
  } = useSports(user.id);

  const activeSessionTotals = useMemo(() => {
    if (!activeSession) {
      return { totalPoints: 0, totalArrows: 0, averageArrow: 0 };
    }

    return getArcherySessionTotals(activeSession.rounds);
  }, [activeSession]);

  const handleStartSession = () => {
    try {
      startSession();
      showToast('Sesión de tiro con arco iniciada.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No pudimos iniciar la sesión.', 'error');
    }
  };

  const handleCompleteSession = () => {
    try {
      completeActiveSession();
      showToast('Sesión guardada.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar la sesión.', 'error');
    }
  };

  const handleCancelSession = () => {
    if (!activeSession) return;

    confirm({
      title: 'Cancelar sesión de tiro con arco',
      message: 'Se perderán los datos de la sesión activa. Esta acción no se puede deshacer.',
      confirmText: 'Cancelar sesión',
      cancelText: 'Volver',
      isDanger: true,
      onConfirm: () => {
        cancelActiveSession();
        showToast('Sesión cancelada.', 'info');
      }
    });
  };

  const handleRemoveRound = (roundId: string) => {
    if (!activeSession || activeSession.rounds.length <= 1) return;

    confirm({
      title: 'Eliminar ronda',
      message: 'Se eliminará esta ronda con sus 6 flechas.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        removeRound(roundId);
      }
    });
  };

  if (loading) {
    return <div className="rounded-[1.6rem] bg-graphite p-4 text-sm text-slate-400">Cargando módulo deportivo...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(24,34,44,0.98),rgba(11,15,20,0.98))] shadow-lift">
        <div className="h-1 bg-mint" />

        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint/85">
                <Crosshair size={13} />
                Deportes
              </div>
              <h3 className="mt-1 font-display text-2xl text-white sm:text-[1.9rem]">Tiro con arco</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Registra rondas ilimitadas, distancia y puntos por flecha con controles rápidos para móvil.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartSession}
              className="btn-primary shrink-0"
              disabled={Boolean(activeSession)}
            >
              Iniciar sesión
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-[0.9rem] bg-black/15 px-3 py-2 text-slate-300">
              <div className="text-slate-500">Sesiones</div>
              <div className="mt-1 text-base font-semibold text-white">{sessions.length}</div>
            </div>
            <div className="rounded-[0.9rem] bg-black/15 px-3 py-2 text-slate-300">
              <div className="text-slate-500">Activa</div>
              <div className="mt-1 text-base font-semibold text-white">{activeSession ? 'Sí' : 'No'}</div>
            </div>
            <div className="rounded-[0.9rem] bg-black/15 px-3 py-2 text-slate-300">
              <div className="text-slate-500">Puntos sesión</div>
              <div className="mt-1 text-base font-semibold text-white">{activeSessionTotals.totalPoints}</div>
            </div>
            <div className="rounded-[0.9rem] bg-black/15 px-3 py-2 text-slate-300">
              <div className="text-slate-500">Promedio</div>
              <div className="mt-1 text-base font-semibold text-white">
                {formatNumber(activeSessionTotals.averageArrow, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeSession && (
        <div className="overflow-hidden rounded-[1.6rem] border border-mint/20 bg-graphite shadow-lift">
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sesión activa</div>
                <div className="mt-1 text-sm text-slate-300">Inicio: {formatDateInAppTimeZone(activeSession.startedAt, 'es-CO')}</div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={addRound} className="btn-secondary inline-flex items-center gap-2">
                  <Plus size={15} />
                  Añadir ronda
                </button>
                <button type="button" onClick={handleCancelSession} className="btn-secondary text-crimson hover:text-red-400">
                  Cancelar
                </button>
                <button type="button" onClick={handleCompleteSession} className="btn-primary inline-flex items-center gap-2">
                  <Flag size={15} />
                  Guardar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeSession.rounds.map((round, roundIndex) => (
                <div key={round.id} className="rounded-[1.2rem] border border-white/8 bg-slateDeep/45 p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Ronda {roundIndex + 1}
                      </span>
                      <span className="rounded-full bg-mint/12 px-2.5 py-1 text-xs font-semibold text-mint">
                        {getArcheryRoundTotal(round)} puntos
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRound(round.id)}
                      className="btn-ghost px-2 py-1 text-crimson hover:text-red-400"
                      disabled={activeSession.rounds.length <= 1}
                      aria-label={`Eliminar ronda ${roundIndex + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mb-3">
                    <label htmlFor={`distance-${round.id}`} className="mb-1.5 block text-xs font-medium text-slate-300">
                      Distancia (m)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={`distance-${round.id}`}
                        type="number"
                        className="input input-sm w-24"
                        min="1"
                        max="300"
                        value={round.distanceM}
                        onChange={(event) => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          if (Number.isNaN(parsed)) return;
                          updateRoundDistance(round.id, parsed);
                        }}
                      />
                      {QUICK_DISTANCES.map((distance) => (
                        <button
                          key={`${round.id}-distance-${distance}`}
                          type="button"
                          onClick={() => updateRoundDistance(round.id, distance)}
                          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                            round.distanceM === distance
                              ? 'border-mint/55 bg-mint/15 text-mint'
                              : 'border-white/12 bg-white/[0.02] text-slate-300 hover:border-mint/35'
                          }`}
                        >
                          {distance}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-xs font-medium text-slate-300">Puntos por flecha</div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                      {round.arrows.map((score, arrowIndex) => {
                        const arrowId = `${round.id}-arrow-${arrowIndex}`;

                        return (
                          <div key={arrowId} className="rounded-xl border border-white/8 bg-black/10 px-2.5 py-2">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">F{arrowIndex + 1}</div>

                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => updateRoundArrow(round.id, arrowIndex, score - 1)}
                                className="touch-target-sm rounded-lg border border-white/12 bg-white/[0.03] p-1 text-slate-300 transition-colors hover:border-mint/35 hover:text-white"
                                aria-label={`Bajar punto de flecha ${arrowIndex + 1}`}
                              >
                                <Minus size={14} />
                              </button>

                              <div className="min-w-[2.6rem] rounded-lg border border-mint/25 bg-mint/10 px-2 py-1 text-center font-display text-2xl leading-none text-white">
                                {score}
                              </div>

                              <button
                                type="button"
                                onClick={() => updateRoundArrow(round.id, arrowIndex, score + 1)}
                                className="touch-target-sm rounded-lg border border-white/12 bg-white/[0.03] p-1 text-slate-300 transition-colors hover:border-mint/35 hover:text-white"
                                aria-label={`Subir punto de flecha ${arrowIndex + 1}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div className="mt-2 grid grid-cols-4 gap-1">
                              {QUICK_ARROW_SCORES.map((quickScore) => (
                                <button
                                  key={`${arrowId}-quick-${quickScore}`}
                                  type="button"
                                  onClick={() => updateRoundArrow(round.id, arrowIndex, quickScore)}
                                  className={`rounded-md px-1 py-1 text-[11px] font-semibold transition-colors ${
                                    score === quickScore
                                      ? 'bg-mint text-ink'
                                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  {quickScore}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label htmlFor="archery-notes" className="mb-1.5 block text-xs font-medium text-slate-300">
                Notas (opcional)
              </label>
              <textarea
                id="archery-notes"
                value={activeSession.notes ?? ''}
                onChange={(event) => updateSessionNotes(event.target.value.slice(0, MAX_NOTES_LENGTH))}
                className="input"
                rows={3}
                maxLength={MAX_NOTES_LENGTH}
                placeholder="Viento, técnica, observaciones..."
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[1.6rem] bg-graphite p-4 shadow-lift sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <Target size={13} className="text-mint" />
          Historial de tiro con arco
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-[1rem] bg-slateDeep/45 px-4 py-7 text-center text-sm text-slate-400">
            Todavía no hay sesiones guardadas.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.slice(0, 10).map((session) => {
              const totals = getArcherySessionTotals(session.rounds);
              const distanceSummary = Array.from(new Set(session.rounds.map((round) => round.distanceM))).sort((left, right) => left - right);

              return (
                <div key={session.id} className="rounded-[1rem] border border-white/8 bg-slateDeep/45 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">Tiro con arco</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {session.completedAt ? formatDateInAppTimeZone(session.completedAt, 'es-CO') : 'Sin finalizar'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/[0.04] px-2 py-1">{session.rounds.length} rondas</span>
                      <span className="rounded-full bg-white/[0.04] px-2 py-1">{totals.totalPoints} puntos</span>
                      <span className="rounded-full bg-white/[0.04] px-2 py-1">
                        {formatNumber(totals.averageArrow, { maximumFractionDigits: 2 })} prom.
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    Distancias: {distanceSummary.map((distance) => `${distance}m`).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
