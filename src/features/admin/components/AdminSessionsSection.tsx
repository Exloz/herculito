import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdminRoutineOverview, AdminSessionOverview } from '../../../shared/types';
import { SectionAccordion } from './AdminShared';
import {
  formatDateTime,
  formatDuration,
  getCompletedSetsCount,
  getRoutineExerciseName,
  getTopWeight,
  isExerciseLog,
  looksLikeId,
  type AdminSessionSort
} from '../lib/adminPage';

interface AdminSessionsSectionProps {
  sessions: AdminSessionOverview[];
  totalSessions: number;
  routinesById: Map<string, AdminRoutineOverview>;
  sessionSort: AdminSessionSort;
  remainingSessions: number;
  onSessionSortChange: (value: AdminSessionSort) => void;
  onShowMore: () => void;
  onResetFilters: () => void;
}

export const AdminSessionsSection: React.FC<AdminSessionsSectionProps> = ({
  sessions,
  totalSessions,
  routinesById,
  sessionSort,
  remainingSessions,
  onSessionSortChange,
  onShowMore,
  onResetFilters
}) => {
  return (
    <SectionAccordion
      title="Bitácora de sesiones"
      subtitle="Registro detallado de sesiones individuales solo para auditoría puntual."
      badge={<div className="chip">{totalSessions}</div>}
    >
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400 sm:text-sm">Se mantiene como log auxiliar para auditoría puntual.</p>
        <select value={sessionSort} onChange={(event) => onSessionSortChange(event.target.value as AdminSessionSort)} className="input input-sm h-10 bg-white/[0.03] text-sm sm:w-auto">
          <option value="recent">Más recientes</option>
          <option value="duration">Más largas</option>
          <option value="user">Usuario</option>
        </select>
      </div>

      <div className="space-y-2.5">
        {sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-mist/25 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
            <p>No hay sesiones para mostrar con los filtros actuales.</p>
            <button type="button" onClick={onResetFilters} className="btn-secondary mt-3 text-sm">
              Reiniciar filtros
            </button>
          </div>
        )}

        {sessions.map((session) => (
          <details key={session.sessionId} className="group overflow-hidden rounded-xl border border-mist/20 bg-white/[0.03]">
            <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-white sm:text-base">{session.routineName}</div>
                <div className="mt-1 text-xs text-slate-400 sm:text-sm">{session.userName && !looksLikeId(session.userName) ? session.userName : 'Usuario sin nombre'}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTime(session.startedAt)} - {formatDateTime(session.completedAt)}</div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:min-w-[210px]">
                <div className="rounded-lg bg-ink/40 px-2.5 py-2 text-center">
                  <div className="text-base font-display text-white">{formatDuration(session.totalDuration)}</div>
                  <div className="text-[11px] text-slate-400">duracion</div>
                </div>
                <div className="flex items-center justify-center rounded-lg bg-ink/40 px-2.5 py-2 text-slate-300 transition group-open:rotate-180">
                  <ChevronDown size={16} />
                </div>
              </div>
            </summary>

            <div className="border-t border-mist/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {session.exercises.filter(isExerciseLog).map((exerciseLog) => {
                  const exerciseName = getRoutineExerciseName(routinesById, session.routineId, exerciseLog.exerciseId);
                  return (
                    <div key={`${session.sessionId}-${exerciseLog.exerciseId}`} className="rounded-xl border border-white/5 bg-ink/40 p-3">
                      <div className="text-sm font-semibold text-white">{exerciseName}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-slate-300">
                          Series: {getCompletedSetsCount(exerciseLog.sets)}/{exerciseLog.sets.length}
                        </div>
                        <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-slate-300">
                          Top: {getTopWeight(exerciseLog.sets) > 0 ? `${getTopWeight(exerciseLog.sets)} kg` : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        ))}

        {remainingSessions > 0 && (
          <button type="button" onClick={onShowMore} className="btn-secondary w-full">
            Mostrar {remainingSessions} sesiones mas
          </button>
        )}
      </div>
    </SectionAccordion>
  );
};
