import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutSession, WorkoutCalendarDay } from '../types';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';
import { getCurrentDateString, getDateStringInAppTimeZone } from '../utils/dateUtils';

interface WorkoutCalendarProps {
  sessions: WorkoutSession[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onDayClick?: (date: string) => void;
}

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({
  sessions,
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
    const map = new Map<string, WorkoutCalendarDay['workouts']>();
    sessions.forEach((session) => {
      // TEMPORARY: Show all sessions (completed or not) using startedAt as fallback
      const dateToUse = session.completedAt || session.startedAt;
      if (!dateToUse) return;
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
  }, [sessions]);

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

  return (
    <div className="app-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="btn-ghost p-2 touch-manipulation"
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>

        <h3 className="text-base sm:text-lg font-semibold text-white text-center">
          {monthNames[month]} {year}
        </h3>

        <button
          onClick={() => navigateMonth('next')}
          className="btn-ghost p-2 touch-manipulation"
        >
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day, index) => {
          const dayNumber = new Date(day.date + 'T12:00:00').getDate();
          const hasWorkout = day.workouts.length > 0;
          const isCurrentDay = isToday(day.date);
          const isInCurrentMonth = isCurrentMonth(day.date);

          return (
            <button
              key={index}
              onClick={() => onDayClick?.(day.date)}
              type="button"
              disabled={!onDayClick}
              aria-label={`Día ${dayNumber}${hasWorkout ? `, ${day.workouts.length} entrenamiento(s)` : ''}`}
              className={`
                relative aspect-square p-0.5 sm:p-1 rounded-lg cursor-pointer transition-colors touch-manipulation
                ${isCurrentDay
                  ? 'bg-mint text-ink'
                  : isInCurrentMonth
                    ? 'hover:bg-slateDeep text-slate-200'
                    : 'text-slate-600 hover:bg-charcoal'
                }
                ${hasWorkout ? 'ring-1 sm:ring-2 ring-mint/60' : ''}
                ${!onDayClick ? 'cursor-default' : ''}
              `}
            >
              <div className="text-xs font-medium text-center leading-tight">
                {dayNumber}
              </div>

              {hasWorkout && (
                <div className="absolute bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 right-0.5 sm:right-1">
                  <div className="flex justify-center space-x-0.5">
                    {day.workouts.slice(0, 3).map((workout, idx) => {
                      const muscleGroup = MUSCLE_GROUPS[workout.muscleGroup];
                      return (
                        <div
                          key={idx}
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

      <div className="mt-4 pt-3 border-t border-mist/60">
        <div className="text-xs text-slate-400 mb-2">Grupos musculares:</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
            <div key={key} className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-xs text-slate-400 truncate">{group.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
