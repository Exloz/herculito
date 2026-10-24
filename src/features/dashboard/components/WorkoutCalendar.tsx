import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutSession, WorkoutCalendarDay } from '../../../shared/types';
import { MUSCLE_GROUPS } from '../lib/muscleGroups';
import { getCurrentDateString, getDateStringInAppTimeZone } from '../../../shared/lib/dateUtils';

interface WorkoutCalendarProps {
  sessions?: WorkoutSession[];
  calendar?: WorkoutCalendarDay[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onDayClick?: (date: string) => void;
}

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({
  sessions = [],
  calendar,
  currentMonth,
  onMonthChange,
  onDayClick
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayStr = getCurrentDateString();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const workoutsByDate = useMemo(() => {
    if (calendar) {
      const map = new Map<string, WorkoutCalendarDay['workouts']>();
      calendar.forEach((day) => {
        map.set(day.date, day.workouts);
      });
      return map;
    }

    const map = new Map<string, WorkoutCalendarDay['workouts']>();
    sessions.forEach((session) => {
      // Only show completed sessions (where user clicked "Finalizar Entrenamiento")
      if (!session.completedAt) return;
      const dateToUse = session.completedAt;
      const dateStr = getDateStringInAppTimeZone(dateToUse);
      const workouts = map.get(dateStr) ?? [];
      workouts.push({
        muscleGroup: session.primaryMuscleGroup || 'fullbody',
        routineName: session.routineName,
        sessionId: session.id,
        activityKind: 'workout'
      });
      map.set(dateStr, workouts);
    });
    return map;
  }, [calendar, sessions]);

  const days: WorkoutCalendarDay[] = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    const emptyDate = new Date(year, month, -firstDayWeekday + i + 1);
    const dateStr = `${emptyDate.getFullYear()}-${String(emptyDate.getMonth() + 1).padStart(2, '0')}-${String(emptyDate.getDate()).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      workouts: []
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dayWorkouts = workoutsByDate.get(dateStr) ?? [];

    days.push({
      date: dateStr,
      workouts: dayWorkouts
    });
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(year, month, 1);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    onMonthChange(newMonth);
    setSelectedDate(null);
  };

  const isToday = (dateStr: string) => {
    return dateStr === todayStr;
  };

  const isCurrentMonth = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getMonth() === month && date.getFullYear() === year;
  };

  const workoutsThisMonth = days.reduce((total, day) => {
    if (!isCurrentMonth(day.date)) {
      return total;
    }

    return total + day.workouts.length;
  }, 0);

  return (
    <div className="app-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-mist/30 pb-3">
        <h3 className="min-w-0 text-lg font-semibold leading-tight text-white sm:text-xl">
          {monthNames[month]} {year}
        </h3>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-xs tabular-nums text-slate-400">
            {workoutsThisMonth} {workoutsThisMonth === 1 ? 'sesión' : 'sesiones'}
          </div>
          <div className="inline-flex shrink-0 items-center gap-1">
            <button
              onClick={() => navigateMonth('prev')}
              className="motion-interactive flex h-11 w-11 items-center justify-center rounded-[0.8rem] bg-transparent text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="motion-interactive flex h-11 w-11 items-center justify-center rounded-[0.8rem] bg-transparent text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:py-2 sm:text-[11px]">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayNumber = new Date(day.date + 'T12:00:00').getDate();
          const hasWorkout = day.workouts.length > 0;
          const isCurrentDay = isToday(day.date);
          const isInCurrentMonth = isCurrentMonth(day.date);

          return (
            <button
                key={day.date}
              onClick={() => {
                setSelectedDate(day.date);
                onDayClick?.(day.date);
              }}
              type="button"
              disabled={!isInCurrentMonth}
              aria-pressed={selectedDate === day.date}
               aria-label={`${dayNumber} de ${monthNames[new Date(day.date + 'T12:00:00').getMonth()]} de ${new Date(day.date + 'T12:00:00').getFullYear()}${hasWorkout ? `, ${day.workouts.length} ${day.workouts.length === 1 ? 'sesión' : 'sesiones'}` : ', sin sesiones'}${isCurrentDay ? ', hoy' : ''}`}
               aria-current={isCurrentDay ? 'date' : undefined}
              className="calendar-day"
            >
              <div className="text-center text-xs font-semibold leading-tight sm:text-sm">
                {dayNumber}
              </div>

              {hasWorkout && (
                <div className="absolute bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 right-0.5 sm:right-1">
                  <div className="flex justify-center space-x-0.5">
                    {day.workouts.slice(0, 3).map((workout) => {
                      const muscleGroup = workout.muscleGroup
                        ? MUSCLE_GROUPS[workout.muscleGroup]
                        : { name: workout.routineName, color: workout.sportType === 'archery' ? 'rgb(var(--color-sky))' : 'rgb(var(--color-peach))' };
                      return (
                        <div
                          key={workout.sessionId}
                          className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                          style={{ backgroundColor: muscleGroup.color }}
                          title={`${muscleGroup.name} - ${workout.routineName}`}
                        />
                      );
                    })}
                    {day.workouts.length > 3 && (
                      <div className="text-xs text-slate-400">+</div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && isCurrentMonth(selectedDate) && (
        <section className="app-surface-muted mt-4 p-3" aria-label="Sesiones del día" aria-live="polite">
          <h4 className="font-display text-lg text-white">{new Date(selectedDate + 'T12:00:00').getDate()} de {monthNames[month]}</h4>
          {(workoutsByDate.get(selectedDate) ?? []).length > 0 ? (
            <ul className="mt-2 space-y-2">
              {(workoutsByDate.get(selectedDate) ?? []).map((workout) => (
                <li key={workout.sessionId} className="rounded-xl bg-white/[0.04] p-3">
                  <div className="break-words text-sm font-semibold text-white">{workout.routineName}</div>
                  <div className="mt-1 text-xs text-slate-400">{workout.muscleGroup ? MUSCLE_GROUPS[workout.muscleGroup].name : workout.sportType === 'archery' ? 'Tiro con arco' : 'HIIT'}</div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-400">No hay sesiones registradas este día.</p>}
        </section>
      )}
      <p className="mt-3 text-xs text-slate-400">{workoutsThisMonth === 0 ? 'No hay sesiones registradas este mes. Usa las flechas para consultar otro mes.' : 'Toca un día para consultar sus sesiones. Los puntos indican actividad registrada.'}</p>
      <details className="mt-4 border-t border-mist/60 pt-3">
        <summary className="touch-target cursor-pointer text-xs text-slate-300">Leyenda de grupos musculares</summary>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Grupos musculares</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
            <div key={key} className="flex min-w-0 items-center gap-1.5 rounded-[0.95rem] bg-white/[0.04] px-2.5 py-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="truncate text-xs text-slate-300">{group.name}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};
