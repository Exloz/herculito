import { useState } from 'react';
import { CalendarDays, ChevronDown, Clock3, Dumbbell, Flame, Play } from 'lucide-react';
import type { DashboardCompetition, DashboardSummary, Routine } from '../../../shared/types';
import { formatDateValue } from '../../../shared/lib/intl';
import { APP_TIME_ZONE } from '../../../shared/lib/dateUtils';
import { CompetitionPanel } from './CompetitionPanel';
import { WeeklyPlanEditor } from './WeeklyPlanEditor';
import type { WeekDay, WeeklyPlan } from '../lib/weeklyPlan';

interface DashboardOverviewProps {
  userName: string;
  summary: DashboardSummary;
  plannedRoutine?: Routine;
  routines: Routine[];
  weeklyPlan: WeeklyPlan;
  today: WeekDay;
  onAssignDay: (day: WeekDay, routineId: string | null | undefined) => void;
  activeRoutineName?: string;
  competition?: DashboardCompetition;
  onStart: (routineId: string) => void;
  onContinue: () => void;
  onCancel: () => void;
  onNavigateToRoutines: () => void;
}

export function DashboardOverview({ userName, summary, plannedRoutine, routines, weeklyPlan, today,
  onAssignDay, activeRoutineName, competition, onStart, onContinue, onCancel, onNavigateToRoutines }: DashboardOverviewProps) {
  const [editingWeek, setEditingWeek] = useState(false);
  const firstName = userName.trim().split(/\s+/)[0] || 'atleta';
  const isActive = Boolean(activeRoutineName);
  const isRestDay = weeklyPlan[today] === null;
  const isUnavailable = typeof weeklyPlan[today] === 'string' && !plannedRoutine;
  const totalSets = plannedRoutine?.exercises.reduce((total, exercise) => total + exercise.sets, 0) ?? 0;

  return (
    <section className="mb-7 space-y-5" aria-label="Tu entrenamiento de hoy">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-sm text-slate-400">
            {formatDateValue(new Date(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE })}
          </p>
          <h2 className="font-display text-4xl leading-tight text-white sm:text-5xl">A tu ritmo, {firstName}.</h2>
          <p className="mt-2 text-base text-slate-300">Cada serie cuenta. Vamos con la siguiente.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-mist/60 bg-charcoal px-3 py-2 text-sm text-slate-300">
          <Flame size={16} className="text-amberGlow" />{summary.thisWeekWorkouts} sesiones esta semana
        </span>
      </div>

      <div className="dashboard-priority-card grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-mint">
            <span className="h-2 w-2 rounded-full bg-mint" />
            {isActive ? 'Tu sesión sigue aquí' : 'Mi semana · hoy'}
          </span>
          <h3 className="mt-3 break-words font-display text-3xl leading-tight text-white sm:text-4xl">
            {activeRoutineName ?? plannedRoutine?.name ?? (isRestDay ? 'Día de descanso' : isUnavailable ? 'Rutina no disponible' : 'Hoy sin plan')}
          </h3>
          {(isActive || plannedRoutine?.description || isUnavailable) && (
            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-300">
              {isActive ? 'Retoma donde lo dejaste. Tus series registradas siguen guardadas.'
                : isUnavailable ? 'Elige otra rutina para hoy o vuelve a activarla en la biblioteca.'
                : plannedRoutine?.description}
            </p>
          )}
          {!isActive && plannedRoutine && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2"><Dumbbell size={16} />{plannedRoutine.exercises.length} ejercicios</span>
              <span className="flex items-center gap-2"><Clock3 size={16} />{totalSets} series</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 lg:min-w-[220px]">
          <button type="button"
            onClick={() => isActive ? onContinue() : plannedRoutine ? onStart(plannedRoutine.id) : setEditingWeek(true)}
            className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-base">
            {isActive || plannedRoutine ? <Play size={18} /> : <CalendarDays size={18} />}
            {isActive ? 'Continuar entrenamiento' : plannedRoutine ? 'Empezar entrenamiento' : 'Planificar semana'}
          </button>
          {isActive && (
            <button type="button" onClick={isActive ? onCancel : onNavigateToRoutines}
              className="btn-ghost min-h-11 text-sm">
              Cancelar esta sesión
            </button>
          )}
          {(isActive || plannedRoutine || editingWeek) && <button type="button" onClick={() => setEditingWeek((open) => !open)}
            aria-expanded={editingWeek} aria-controls="weekly-plan-editor"
            className="btn-ghost flex min-h-11 items-center justify-center gap-2 text-sm">
            <CalendarDays size={16} aria-hidden="true" />Mi semana
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${editingWeek ? 'rotate-180' : ''}`} />
          </button>}
        </div>
        {editingWeek && <WeeklyPlanEditor routines={routines} plan={weeklyPlan} today={today}
          onAssign={onAssignDay} onManageRoutines={onNavigateToRoutines} />}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-mist/50 rounded-2xl border border-mist/50 bg-charcoal/50 py-4">
        {[
          { label: 'Este mes', value: summary.thisMonthWorkouts, unit: 'sesiones' },
          { label: 'Tu racha', value: summary.currentStreak, unit: 'días' },
          { label: 'Promedio', value: summary.averageDurationMin, unit: 'min / sesión' }
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 px-2 text-center sm:px-4">
            <dt className="text-xs text-slate-400 sm:text-sm">{stat.label}</dt>
            <dd className="mt-1 font-display text-3xl text-white sm:text-4xl">{stat.value}</dd>
            <dd className="text-xs text-slate-400 sm:text-sm">{stat.unit}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-mist/40 bg-charcoal/30 px-4 py-3 text-sm text-slate-300">
        <span>Total: <strong className="text-white">{summary.totalWorkouts}</strong> sesiones registradas</span>
        <span>Mejor racha: <strong className="text-white">{summary.longestStreak}</strong> días</span>
      </div>
      <CompetitionPanel competition={competition} />
    </section>
  );
}
