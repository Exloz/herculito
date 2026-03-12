import React, { useMemo } from 'react';
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
  const todayStr = getCurrentDateString();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
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
        sessionId: session.id
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

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    onMonthChange(newMonth);
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
    <div className="overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(22,28,38,0.98),rgba(11,15,20,0.98))] p-3 shadow-lift sm:p-4">
      <div className="mb-3 grid gap-3 border-b border-white/8 pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">Calendario</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate font-display text-xl uppercase text-white sm:text-2xl">
              {monthNames[month]} {year}
            </h3>

            <div className="inline-flex shrink-0 items-center gap-1 rounded-[0.95rem] bg-white/[0.04] px-1.5 py-1">
              <button
                onClick={() => navigateMonth('prev')}
                className="btn-ghost p-1.5 touch-target-sm"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} className="text-slate-300" />
              </button>
              <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Mes</span>
              <button
                onClick={() => navigateMonth('next')}
                className="btn-ghost p-1.5 touch-target-sm"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="justify-self-start rounded-[1rem] bg-amberGlow/10 px-3 py-2 text-right sm:justify-self-end">
          <div className="text-[11px] uppercase tracking-[0.18em] text-amberGlow/80">Sesiones</div>
          <div className="mt-1 text-sm font-semibold text-white">{workoutsThisMonth}</div>
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
              onClick={() => onDayClick?.(day.date)}
              type="button"
              disabled={!onDayClick}
              aria-label={`Día ${dayNumber}${hasWorkout ? `, ${day.workouts.length} entrenamiento(s)` : ''}`}
              className={`
                relative aspect-square rounded-[0.9rem] p-0.5 sm:p-1 cursor-pointer transition-colors touch-manipulation
                min-h-[44px]
                ${isCurrentDay
                  ? 'bg-mint text-ink shadow-[0_8px_24px_rgba(72,229,163,0.28)]'
                  : isInCurrentMonth
                    ? 'bg-slateDeep/55 text-slate-200 hover:bg-slateDeep'
                    : 'text-slate-600 hover:bg-charcoal'
                }
                ${hasWorkout ? 'ring-1 sm:ring-2 ring-mint/45' : 'border border-transparent'}
                ${!onDayClick ? 'cursor-default' : ''}
              `}
            >
              <div className="text-center text-xs font-semibold leading-tight sm:text-sm">
                {dayNumber}
              </div>

              {hasWorkout && (
                <div className="absolute bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 right-0.5 sm:right-1">
                  <div className="flex justify-center space-x-0.5">
                    {day.workouts.slice(0, 3).map((workout) => {
                      const muscleGroup = MUSCLE_GROUPS[workout.muscleGroup];
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

      <div className="mt-4 border-t border-mist/60 pt-3">
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
      </div>
    </div>
  );
};
