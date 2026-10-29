import { useState } from 'react';
import { Activity, CalendarDays, ChevronDown, Clock3, Dumbbell, Play } from 'lucide-react';
import type { DashboardCompetition, DashboardSummary, Routine } from '../../../shared/types';
import { formatCountLabel, formatDateValue, formatNumber } from '../../../shared/lib/intl';
import { APP_TIME_ZONE } from '../../../shared/lib/dateUtils';
import { WeeklyPlanEditor } from './WeeklyPlanEditor';
import { WeeklyPlanSummary } from './WeeklyPlanSummary';
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
  onChooseRoutine: () => void;
}

export function DashboardOverview({ userName, summary, plannedRoutine, routines, weeklyPlan, today,
  onAssignDay, activeRoutineName, onStart, onContinue, onCancel, onNavigateToRoutines, onChooseRoutine }: DashboardOverviewProps) {
  const [editingWeek, setEditingWeek] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const firstName = userName.trim().split(/\s+/)[0] || 'atleta';
  const isActive = Boolean(activeRoutineName);
  const isRestDay = weeklyPlan[today] === null;
  const isUnavailable = typeof weeklyPlan[today] === 'string' && !plannedRoutine;
  const isEmptyRoutine = Boolean(plannedRoutine && plannedRoutine.exercises.length === 0);
  const totalSets = plannedRoutine?.exercises.reduce((total, exercise) => total + exercise.sets, 0) ?? 0;

  return (
    <section className="dashboard-overview" aria-label="Tu entrenamiento de hoy">
      <div className="page-heading dashboard-greeting">
        <div>
          <p className="eyebrow">
            {formatDateValue(new Date(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE })}
          </p>
          <h1>A tu ritmo, <span className="greeting-name">{firstName}</span><span className="text-mint">.</span></h1>
          <p>Tu espacio para entrenar, registrar y seguir avanzando.</p>
        </div>
      </div>
      <div className="dashboard-priority-card" data-active={isActive} data-mode={isActive ? 'active' : isRestDay ? 'rest' : 'ready'}>
        <svg className="priority-art" viewBox="0 0 200 200" fill="none" aria-hidden="true" focusable="false">
          <circle cx="110" cy="90" r="67" /><circle cx="110" cy="90" r="48" /><circle cx="110" cy="90" r="29" />
          <path d="M43 90a67 67 0 0 1 67-67" className="priority-art-arc" /><circle cx="110" cy="23" r="4" className="priority-art-point" />
        </svg>
        <div className="min-w-0">
          <span className="priority-status">
            {isActive && <span className="status-dot" aria-hidden="true" />}
            {isActive ? 'Sesión en curso' : 'Para hoy'}
          </span>
          <h2 className="priority-title">
            {activeRoutineName ?? plannedRoutine?.name ?? (isRestDay ? 'Día de descanso' : isUnavailable ? 'Rutina no disponible' : 'Hoy sin plan')}
          </h2>
          {(isActive || plannedRoutine?.description || isUnavailable || isEmptyRoutine) && (
            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-300">
              {isActive ? 'Retoma donde lo dejaste. Tus series registradas siguen guardadas.'
                : isEmptyRoutine ? 'Esta rutina aún no tiene ejercicios. Añádelos en tu biblioteca para empezar.'
                : isUnavailable ? 'Elige otra rutina para hoy o vuelve a activarla en la biblioteca.'
                : plannedRoutine?.description}
            </p>
          )}
          {!isActive && !plannedRoutine && !isUnavailable && <p className="mt-2 text-sm text-slate-400">
            {isRestDay ? 'Recuperar también es parte del progreso.' : 'Organiza tu semana o elige una rutina de tu biblioteca.'}
          </p>}
          {!isActive && plannedRoutine && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2"><Dumbbell size={16} />{plannedRoutine.exercises.length} ejercicios</span>
              <span className="flex items-center gap-2"><Clock3 size={16} />{totalSets} series</span>
            </div>
          )}
        </div>
        <div className="priority-actions">
          <button type="button"
            onClick={() => isActive ? onContinue() : isEmptyRoutine ? onNavigateToRoutines() : plannedRoutine ? onStart(plannedRoutine.id)
              : routines.length && !isRestDay ? onChooseRoutine() : setEditingWeek(true)}
            className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-base">
            {isEmptyRoutine && !isActive ? <Dumbbell size={18} /> : isActive || plannedRoutine || (routines.length > 0 && !isRestDay) ? <Play size={18} /> : <CalendarDays size={18} />}
            {isActive ? 'Continuar entrenamiento' : isEmptyRoutine ? 'Revisar rutina' : plannedRoutine ? 'Empezar entrenamiento'
              : routines.length && !isRestDay ? 'Elegir rutina' : 'Planificar semana'}
          </button>
          {isActive && (
            <button type="button" onClick={onCancel}
              className="btn-ghost min-h-11 text-sm">
              Cancelar sesión
            </button>
          )}
        </div>
      </div>
      <WeeklyPlanSummary routines={routines} plan={weeklyPlan} today={today} editing={editingWeek}
        onEdit={() => setEditingWeek((open) => !open)} />
      {editingWeek && <div className="app-card p-4"><WeeklyPlanEditor routines={routines} plan={weeklyPlan} today={today}
        onAssign={onAssignDay} onManageRoutines={onNavigateToRoutines} /></div>}
      <div className="activity-overview">
        <button type="button" className="overview-summary"
          aria-label={`Resumen de actividad${metricsExpanded ? '' : `: ${formatCountLabel(summary.thisWeekWorkouts, 'sesión', 'sesiones')} esta semana`}`}
          aria-expanded={metricsExpanded} aria-controls="overview-metrics"
          onClick={() => setMetricsExpanded((expanded) => !expanded)}>
          <span className="overview-summary-label"><Activity size={17} aria-hidden="true" />
            {metricsExpanded ? <strong>Tu actividad</strong>
              : <span><strong>{formatCountLabel(summary.thisWeekWorkouts, 'sesión', 'sesiones')}</strong> esta semana</span>}
          </span>
          <span className="overview-summary-action">{metricsExpanded ? 'Ocultar' : 'Resumen'}
            <ChevronDown size={16} aria-hidden="true" className={metricsExpanded ? 'rotate-180' : ''} />
          </span>
        </button>
        <dl id="overview-metrics" className="overview-metrics" data-expanded={metricsExpanded} aria-label="Resumen de actividad">
          {[
            { label: 'Esta semana', value: summary.thisWeekWorkouts, unit: summary.thisWeekWorkouts === 1 ? 'sesión' : 'sesiones' },
            { label: 'Este mes', value: summary.thisMonthWorkouts, unit: summary.thisMonthWorkouts === 1 ? 'sesión' : 'sesiones',
              note: `${formatCountLabel(summary.totalWorkouts, 'sesión', 'sesiones')} en total` },
            { label: 'Tu racha', value: summary.currentStreak, unit: summary.currentStreak === 1 ? 'día' : 'días',
              note: `Mejor: ${formatCountLabel(summary.longestStreak, 'día', 'días')}` },
            { label: 'Duración media', value: summary.averageDurationMin, unit: 'min', note: 'Por sesión' }
          ].map(({ label, value, unit, note }) => <div key={label} className="metric-card">
            <dt>{label}</dt>
            <dd className="metric-value"><span className="metric-number">{formatNumber(value)}</span>{' '}
              <span className="metric-value-unit">{unit}</span>
            </dd>
            {note && <dd className="metric-note">{note}</dd>}
          </div>)}
        </dl>
      </div>
    </section>
  );
}
