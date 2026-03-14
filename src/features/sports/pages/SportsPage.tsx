import React, { useMemo, useState } from 'react';
import { Crosshair, Flag, Plus, Target, Trash2 } from 'lucide-react';
import type { User } from '../../../shared/types';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { formatNumber } from '../../../shared/lib/intl';
import { normalizeSingleLine } from '../../../shared/lib/inputSanitizers';
import { useUI } from '../../../app/providers/ui-context';
import {
  getArcheryRoundTotal,
  getArcherySessionTotals,
  MAX_SPORT_NAME_LENGTH,
  useSports
} from '../hooks/useSports';

interface SportsPageProps {
  user: User;
}

const MAX_NOTES_LENGTH = 300;

export const SportsPage: React.FC<SportsPageProps> = ({ user }) => {
  const { showToast, confirm } = useUI();
  const {
    sports,
    sessions,
    sessionsBySport,
    activeSession,
    loading,
    createSport,
    startSession,
    addRound,
    removeRound,
    updateRoundDistance,
    updateRoundArrow,
    updateSessionNotes,
    completeActiveSession,
    cancelActiveSession
  } = useSports(user.id);

  const [newSportName, setNewSportName] = useState('Tiro con arco');

  const activeSessionTotals = useMemo(() => {
    if (!activeSession) {
      return { totalPoints: 0, totalArrows: 0, averageArrow: 0 };
    }

    return getArcherySessionTotals(activeSession.rounds);
  }, [activeSession]);

  const handleCreateSport = (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const normalizedName = normalizeSingleLine(newSportName, MAX_SPORT_NAME_LENGTH);
      createSport(normalizedName, 'archery');
      setNewSportName('');
      showToast('Deporte creado correctamente.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo crear el deporte.', 'error');
    }
  };

  const handleStartSession = (sportId: string) => {
    try {
      startSession(sportId);
      showToast('Sesión iniciada.', 'success');
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
      title: 'Cancelar sesión de deporte',
      message: 'Se perderán los datos de esta sesión activa. Esta acción no se puede deshacer.',
      confirmText: 'Cancelar sesión',
      cancelText: 'Volver',
      isDanger: true,
      onConfirm: () => {
        cancelActiveSession();
        showToast('Sesión activa cancelada.', 'info');
      }
    });
  };

  if (loading) {
    return <div className="app-shell" aria-hidden="true" />;
  }

  return (
    <div className="app-shell pb-28">
      <div className="mx-auto max-w-5xl px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
        <section className="motion-enter mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">Seguimiento deportivo</div>
            <h1 className="mt-1 font-display text-2xl text-white sm:text-3xl">Deportes</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Crea deportes sin tocar tus rutinas de gimnasio. Usa tiro con arco para registrar distancia, puntos por flecha y rondas ilimitadas.
            </p>
          </div>
        </section>

        <section className="motion-enter motion-enter-delay-1 mb-5 rounded-[1.3rem] bg-graphite p-4 shadow-lift sm:p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Crear deporte</div>
          <form onSubmit={handleCreateSport} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="sport-name" className="mb-1.5 block text-sm text-slate-300">
                Nombre
              </label>
              <input
                id="sport-name"
                type="text"
                value={newSportName}
                onChange={(event) => setNewSportName(event.target.value.slice(0, MAX_SPORT_NAME_LENGTH))}
                className="input"
                placeholder="Ej: Tiro con arco"
                maxLength={MAX_SPORT_NAME_LENGTH}
                dir="auto"
              />
              <div className="mt-1 text-xs text-slate-500">{newSportName.length}/{MAX_SPORT_NAME_LENGTH}</div>
            </div>

            <button
              type="submit"
              className="btn-primary inline-flex items-center justify-center gap-2 self-end sm:min-w-[11rem]"
              disabled={normalizeSingleLine(newSportName, MAX_SPORT_NAME_LENGTH).length < 2}
            >
              <Plus size={16} />
              <span>Crear deporte</span>
            </button>
          </form>
        </section>

        <section className="motion-enter motion-enter-delay-2 mb-5 rounded-[1.3rem] bg-graphite p-4 shadow-lift sm:p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mis deportes</div>

          {sports.length === 0 ? (
            <div className="rounded-[1.05rem] bg-slateDeep/45 px-4 py-7 text-center text-slate-400">
              Crea tu primer deporte para empezar el seguimiento.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sports.map((sport) => {
                const sportSessions = sessionsBySport[sport.id] ?? [];

                return (
                  <div key={sport.id} className="rounded-[1.05rem] border border-white/8 bg-slateDeep/45 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-white">{sport.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Tiro con arco</div>
                      </div>
                      <Crosshair size={16} className="shrink-0 text-mint" />
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      {sportSessions.length} sesión{sportSessions.length === 1 ? '' : 'es'} guardada{sportSessions.length === 1 ? '' : 's'}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartSession(sport.id)}
                      className="btn-secondary mt-3 w-full"
                      disabled={Boolean(activeSession)}
                    >
                      Iniciar sesión
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {activeSession && (
          <section className="motion-enter motion-enter-delay-3 mb-5 rounded-[1.35rem] border border-mint/25 bg-[linear-gradient(180deg,rgba(18,27,38,0.97),rgba(11,16,24,0.98))] p-4 shadow-lift sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mint/85">Sesión activa</div>
                <h2 className="mt-1 font-display text-xl text-white sm:text-2xl">{activeSession.sportName}</h2>
                <div className="mt-1 text-xs text-slate-400">Inicio: {formatDateInAppTimeZone(activeSession.startedAt, 'es-CO')}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[16rem]">
                <div className="rounded-xl bg-black/20 px-2 py-2">
                  <div className="text-slate-400">Rondas</div>
                  <div className="mt-1 font-semibold text-white">{activeSession.rounds.length}</div>
                </div>
                <div className="rounded-xl bg-black/20 px-2 py-2">
                  <div className="text-slate-400">Puntos</div>
                  <div className="mt-1 font-semibold text-white">{activeSessionTotals.totalPoints}</div>
                </div>
                <div className="rounded-xl bg-black/20 px-2 py-2">
                  <div className="text-slate-400">Promedio</div>
                  <div className="mt-1 font-semibold text-white">{formatNumber(activeSessionTotals.averageArrow, { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {activeSession.rounds.map((round, roundIndex) => (
                <div key={round.id} className="rounded-[1rem] border border-white/8 bg-slateDeep/45 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">Ronda {roundIndex + 1}</div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                        Total: {getArcheryRoundTotal(round)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRound(round.id)}
                        className="btn-ghost px-2 py-1 text-crimson hover:text-red-400"
                        disabled={activeSession.rounds.length <= 1}
                        aria-label={`Eliminar ronda ${roundIndex + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 max-w-[12rem]">
                    <label htmlFor={`round-distance-${round.id}`} className="mb-1 block text-xs font-medium text-slate-300">
                      Distancia (m)
                    </label>
                    <input
                      id={`round-distance-${round.id}`}
                      type="number"
                      className="input input-sm"
                      min="1"
                      max="300"
                      value={round.distanceM}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        if (Number.isNaN(parsed)) return;
                        updateRoundDistance(round.id, parsed);
                      }}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 text-xs font-medium text-slate-300">Puntos de flechas (6)</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {round.arrows.map((score, arrowIndex) => (
                        <div key={`${round.id}-arrow-${arrowIndex}`}>
                          <label htmlFor={`${round.id}-arrow-${arrowIndex}`} className="mb-1 block text-[11px] text-slate-500">
                            F{arrowIndex + 1}
                          </label>
                          <input
                            id={`${round.id}-arrow-${arrowIndex}`}
                            type="number"
                            className="input input-sm text-center"
                            min="0"
                            max="10"
                            value={score}
                            onChange={(event) => {
                              const parsed = Number.parseInt(event.target.value, 10);
                              if (Number.isNaN(parsed)) return;
                              updateRoundArrow(round.id, arrowIndex, parsed);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addRound} className="btn-secondary mt-3 inline-flex items-center gap-2">
              <Plus size={15} />
              Añadir ronda
            </button>

            <div className="mt-4">
              <label htmlFor="sport-session-notes" className="mb-1.5 block text-xs font-medium text-slate-300">
                Notas (opcional)
              </label>
              <textarea
                id="sport-session-notes"
                value={activeSession.notes ?? ''}
                onChange={(event) => updateSessionNotes(event.target.value.slice(0, MAX_NOTES_LENGTH))}
                className="input"
                rows={3}
                maxLength={MAX_NOTES_LENGTH}
                placeholder="Sensaciones, técnica, viento, observaciones..."
              />
            </div>

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCancelSession} className="btn-secondary">
                Cancelar sesión
              </button>
              <button type="button" onClick={handleCompleteSession} className="btn-primary inline-flex items-center gap-2">
                <Flag size={16} />
                Guardar sesión
              </button>
            </div>
          </section>
        )}

        <section className="motion-enter motion-enter-delay-3 rounded-[1.3rem] bg-graphite p-4 shadow-lift sm:p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Historial reciente</div>

          {sessions.length === 0 ? (
            <div className="rounded-[1.05rem] bg-slateDeep/45 px-4 py-7 text-center text-slate-400">
              Completa tu primera sesión para ver estadísticas aquí.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.slice(0, 12).map((session) => {
                const totals = getArcherySessionTotals(session.rounds);
                const distanceSummary = Array.from(new Set(session.rounds.map((round) => round.distanceM))).sort((left, right) => left - right);

                return (
                  <div key={session.id} className="rounded-[1rem] border border-white/8 bg-slateDeep/45 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{session.sportName}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {session.completedAt ? formatDateInAppTimeZone(session.completedAt, 'es-CO') : 'Sin finalizar'}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="rounded-full bg-white/[0.04] px-2 py-1">{session.rounds.length} rondas</span>
                        <span className="rounded-full bg-white/[0.04] px-2 py-1">{totals.totalPoints} puntos</span>
                        <span className="rounded-full bg-white/[0.04] px-2 py-1">{formatNumber(totals.averageArrow, { maximumFractionDigits: 2 })} prom.</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <Target size={12} className="text-mint" />
                      <span>
                        Distancias: {distanceSummary.map((distance) => `${distance}m`).join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
