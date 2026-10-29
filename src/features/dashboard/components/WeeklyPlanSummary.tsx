import { useEffect, useId, useRef, useState } from 'react';
import { CircleDashed, Dumbbell, Moon, PencilLine, TriangleAlert } from 'lucide-react';
import type { Routine } from '../../../shared/types';
import { APP_TIME_ZONE, getWeekDates } from '../../../shared/lib/dateUtils';
import { formatCountLabel, formatDateValue } from '../../../shared/lib/intl';
import { WEEK_DAYS } from '../lib/weeklyPlan';
import type { WeekDay, WeeklyPlan } from '../lib/weeklyPlan';

interface WeeklyPlanSummaryProps {
  routines: Routine[];
  plan: WeeklyPlan;
  today: WeekDay;
  editing: boolean;
  onEdit: () => void;
}

const toDate = (date: string) => new Date(`${date}T12:00:00Z`);

export function WeeklyPlanSummary({ routines, plan, today, editing, onEdit }: WeeklyPlanSummaryProps) {
  const dates = getWeekDates();
  const weekStart = dates[0];
  const [selection, setSelection] = useState({ day: today, today, weekStart });
  const selectedDay = selection.today === today && selection.weekStart === weekStart ? selection.day : today;
  const railRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const headingId = useId();
  const detailId = useId();
  const selectedIndex = WEEK_DAYS.findIndex(({ id }) => id === selectedDay);
  const selectedRoutine = routines.find((routine) => routine.id === plan[selectedDay]);
  const isRest = plan[selectedDay] === null;
  const isUnavailable = typeof plan[selectedDay] === 'string' && !selectedRoutine;
  const selectedTitle = selectedRoutine?.name ?? (isRest ? 'Descanso' : isUnavailable ? 'Rutina no disponible' : 'Sin plan');

  const revealButton = (button: HTMLButtonElement) => {
    const rail = railRef.current;
    if (!rail) return;
    if (button.offsetLeft < rail.scrollLeft) rail.scrollLeft = button.offsetLeft;
    else if (button.offsetLeft + button.offsetWidth > rail.scrollLeft + rail.clientWidth) {
      rail.scrollLeft = button.offsetLeft + button.offsetWidth - rail.clientWidth;
    }
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const updateRail = () => {
      setOverflows(rail.scrollWidth - rail.clientWidth > 2);
      const selected = rail.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (selected) revealButton(selected);
    };
    updateRail();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateRail);
    observer?.observe(rail);
    window.addEventListener('resize', updateRail);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateRail);
    };
  }, [selectedDay, weekStart]);

  const selectDay = (day: WeekDay) => setSelection({ day, today, weekStart });

  return (
    <section className="weekly-plan-summary" aria-labelledby={headingId}>
      <div className="weekly-summary-heading">
        <div className="min-w-0">
          <h3 id={headingId}>Tu semana</h3>
          <p>{formatDateValue(toDate(dates[0]), { day: 'numeric', month: 'short', timeZone: APP_TIME_ZONE })}
            {' – '}{formatDateValue(toDate(dates[6]), { day: 'numeric', month: 'short', timeZone: APP_TIME_ZONE })}</p>
        </div>
        <button type="button" className="weekly-edit-button" aria-expanded={editing}
          aria-controls="weekly-plan-editor" onClick={onEdit}>
          <PencilLine size={14} aria-hidden="true" />Editar semana
        </button>
      </div>
      <div className="week-strip" role="group" aria-label="Consultar plan semanal" ref={railRef}>
        {WEEK_DAYS.map(({ id, label }, index) => {
          const routine = routines.find((item) => item.id === plan[id]);
          const unavailable = typeof plan[id] === 'string' && !routine;
          const Icon = routine ? Dumbbell : plan[id] === null ? Moon : unavailable ? TriangleAlert : CircleDashed;
          const assignment = routine?.name ?? (plan[id] === null ? 'Descanso' : unavailable ? 'Rutina no disponible' : 'Sin plan');
          const dateLabel = formatDateValue(toDate(dates[index]), { day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE });
          return (
            <button key={id} type="button" className="week-day" data-state={routine ? 'planned' : 'other'}
              aria-current={today === id ? 'date' : undefined} aria-pressed={selectedDay === id} aria-controls={detailId}
              aria-label={`${label}, ${dateLabel}${today === id ? ', hoy' : ''}: ${assignment}`}
              onClick={() => selectDay(id)}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) revealButton(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? 6
                  : event.key === 'ArrowRight' ? (index + 1) % 7 : event.key === 'ArrowLeft' ? (index + 6) % 7 : null;
                if (nextIndex === null) return;
                event.preventDefault();
                selectDay(WEEK_DAYS[nextIndex].id);
                railRef.current?.querySelectorAll('button')[nextIndex].focus({ preventScroll: true });
              }}>
              <span className="week-day-name">{label.slice(0, 3)}</span>
              <time className="week-day-number" dateTime={dates[index]}>{toDate(dates[index]).getUTCDate()}</time>
              <span className="week-day-status" aria-hidden="true"><Icon size={13} />{today === id && <small>Hoy</small>}</span>
            </button>
          );
        })}
      </div>
      {overflows && <p className="weekly-scroll-hint">Desliza para ver todos los días</p>}
      <div id={detailId} className="week-selection-details" role="status" aria-live="polite" aria-atomic="true">
        <p className="week-selection-date">{WEEK_DAYS[selectedIndex].label}, {' '}
          {formatDateValue(toDate(dates[selectedIndex]), { day: 'numeric', month: 'long', timeZone: APP_TIME_ZONE })}
          {selectedDay === today && ' · Hoy'}</p>
        <p className="week-selection-title">{selectedTitle}</p>
        <p className="week-selection-meta">
          {selectedRoutine
            ? `${formatCountLabel(selectedRoutine.exercises.length, 'ejercicio', 'ejercicios')} · ${formatCountLabel(selectedRoutine.exercises.reduce((total, exercise) => total + exercise.sets, 0), 'serie', 'series')}`
            : isRest ? 'Recuperación prevista en tu plan.'
              : isUnavailable ? 'Activa la rutina en la biblioteca o cambia la asignación en Editar semana.'
                : 'Todavía sin rutina asignada.'}
        </p>
      </div>
      <div className="weekly-summary-legend" aria-hidden="true">
        <span><Dumbbell size={12} />Rutina</span><span><Moon size={12} />Descanso</span><span><CircleDashed size={12} />Sin plan</span>
      </div>
    </section>
  );
}
