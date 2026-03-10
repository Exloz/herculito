import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MuscleGroup, WorkoutCalendarDay, WorkoutSession } from '../../../shared/types';
import { MUSCLE_GROUPS } from '../lib/muscleGroups';
import { getCurrentDateString, getDateStringInAppTimeZone } from '../../../shared/lib/dateUtils';

interface WorkoutCalendarProps {
  sessions?: WorkoutSession[];
  calendar?: WorkoutCalendarDay[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onDayClick?: (date: string) => void;
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const capitalize = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatLongDate = (dateString: string): string => {
  const date = new Date(`${dateString}T12:00:00`);

  return capitalize(date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }));
};

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({
  sessions = [],
  calendar,
  currentMonth,
  onMonthChange,
  onDayClick
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [monthTransitionDirection, setMonthTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const todayStr = getCurrentDateString();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthKey = `${year}-${month}`;

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
      if (!session.completedAt) return;

      const dateStr = getDateStringInAppTimeZone(session.completedAt);
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

  const days = useMemo(() => {
    const nextDays: WorkoutCalendarDay[] = [];

    for (let index = 0; index < firstDayWeekday; index += 1) {
      const emptyDate = new Date(year, month, -firstDayWeekday + index + 1);
      const dateStr = `${emptyDate.getFullYear()}-${String(emptyDate.getMonth() + 1).padStart(2, '0')}-${String(emptyDate.getDate()).padStart(2, '0')}`;
      nextDays.push({
        date: dateStr,
        workouts: workoutsByDate.get(dateStr) ?? []
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      nextDays.push({
        date: dateStr,
        workouts: workoutsByDate.get(dateStr) ?? []
      });
    }

    return nextDays;
  }, [daysInMonth, firstDayWeekday, month, workoutsByDate, year]);

  const currentMonthDays = useMemo(() => {
    return days.filter((day) => {
      const date = new Date(`${day.date}T12:00:00`);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [days, month, year]);

  useEffect(() => {
    const availableDates = new Set(currentMonthDays.map((day) => day.date));

    setSelectedDate((previousValue) => {
      if (previousValue && availableDates.has(previousValue)) {
        return previousValue;
      }

      if (availableDates.has(todayStr)) {
        return todayStr;
      }

      const firstWorkoutDay = currentMonthDays.find((day) => day.workouts.length > 0);
      if (firstWorkoutDay) {
        return firstWorkoutDay.date;
      }

      return currentMonthDays[0]?.date ?? '';
    });
  }, [currentMonthDays, todayStr]);

  const monthStats = useMemo(() => {
    const activeDays = currentMonthDays.filter((day) => day.workouts.length > 0);
    const totalSessions = activeDays.reduce((sum, day) => sum + day.workouts.length, 0);
    const groupCounts = new Map<MuscleGroup, number>();

    activeDays.forEach((day) => {
      day.workouts.forEach((workout) => {
        groupCounts.set(workout.muscleGroup, (groupCounts.get(workout.muscleGroup) ?? 0) + 1);
      });
    });

    const dominantGroup = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      activeDays: activeDays.length,
      totalSessions,
      consistency: daysInMonth > 0 ? Math.round((activeDays.length / daysInMonth) * 100) : 0,
      dominantGroup: dominantGroup ? MUSCLE_GROUPS[dominantGroup] : null
    };
  }, [currentMonthDays, daysInMonth]);

  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setMonthTransitionDirection(direction === 'next' ? 'forward' : 'backward');
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    onMonthChange(newMonth);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    onDayClick?.(date);
  };

  const isToday = (dateStr: string) => dateStr === todayStr;

  const isCurrentMonth = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.getMonth() === month && date.getFullYear() === year;
  };

  return (
    <div className="app-card overflow-hidden p-4 sm:p-5">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.18),_transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.86))] p-4 sm:p-5">
        <div className="absolute -right-12 -top-10 h-32 w-32 rounded-full bg-amberGlow/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-mint/40 to-transparent" />

        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                <Calendar size={14} className="text-mint" />
                <span>Calendario de entrenamiento</span>
              </div>
              <h3 className="mt-3 font-display text-2xl text-white sm:text-[2rem]">{monthNames[month]} {year}</h3>
              <p className="mt-1 max-w-xl text-sm text-slate-300">
                Toca un dia para abrir su detalle. Los colores muestran el grupo muscular y el badge marca cuantas sesiones registraste.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/15 p-1.5">
              <button
                onClick={() => navigateMonth('prev')}
                className="btn-ghost p-2 touch-target"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} className="text-slate-300" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="btn-ghost p-2 touch-target"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dias activos</div>
              <div className="mt-1 font-display text-xl text-white">{monthStats.activeDays}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sesiones del mes</div>
              <div className="mt-1 font-display text-xl text-white">{monthStats.totalSessions}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.05] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Consistencia</div>
              <div className="mt-1 font-display text-xl text-white">{monthStats.consistency}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 px-1">
        {weekDays.map((day) => (
          <div key={day} className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        <div className={`col-span-7 grid grid-cols-7 gap-1.5 sm:gap-2 ${monthTransitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}`} key={monthKey}>
          {days.map((day) => {
          const dayNumber = new Date(`${day.date}T12:00:00`).getDate();
          const hasWorkout = day.workouts.length > 0;
          const isCurrentDay = isToday(day.date);
          const isInCurrentMonth = isCurrentMonth(day.date);
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              onClick={() => handleSelectDate(day.date)}
              type="button"
              aria-label={`Dia ${dayNumber}${hasWorkout ? `, ${day.workouts.length} entrenamiento(s)` : ''}`}
              className={[
                'group relative flex min-h-[58px] flex-col justify-between rounded-[1rem] border p-2 text-left transition-all duration-200 touch-manipulation sm:min-h-[72px] sm:p-2.5',
                isSelected
                  ? 'border-mint/45 bg-mint/12 shadow-[0_12px_30px_rgba(72,229,163,0.16)]'
                  : 'border-white/8 bg-slateDeep/60 hover:-translate-y-0.5 hover:border-white/15 hover:bg-slateDeep/85',
                isCurrentDay ? 'ring-1 ring-amberGlow/50' : '',
                isInCurrentMonth ? 'text-slate-100' : 'text-slate-500'
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>{dayNumber}</span>
                {hasWorkout ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100">
                    {day.workouts.length}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {day.workouts.slice(0, 3).map((workout) => {
                  const muscleGroup = MUSCLE_GROUPS[workout.muscleGroup];

                  return (
                    <div
                      key={workout.sessionId}
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: muscleGroup.color }}
                      title={`${muscleGroup.name} - ${workout.routineName}`}
                    />
                  );
                })}
                {day.workouts.length > 3 ? (
                  <span className="text-[10px] font-semibold text-slate-400">+{day.workouts.length - 3}</span>
                ) : null}
              </div>
            </button>
          );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
        <div className={`rounded-[1.45rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.74))] p-4 ${monthTransitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}`} key={`${monthKey}-${selectedDate || 'empty'}-detail`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dia seleccionado</div>
              <h4 className="mt-1 font-display text-xl text-white">{selectedDate ? formatLongDate(selectedDate) : 'Selecciona un dia'}</h4>
            </div>

            {selectedDay ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                {selectedDay.workouts.length} {selectedDay.workouts.length === 1 ? 'sesion' : 'sesiones'}
              </div>
            ) : null}
          </div>

          {selectedDay && selectedDay.workouts.length > 0 ? (
            <div className="mt-4 space-y-2">
              {selectedDay.workouts.map((workout) => {
                const group = MUSCLE_GROUPS[workout.muscleGroup];

                return (
                  <div key={workout.sessionId} className="rounded-[1.15rem] border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{workout.routineName}</div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.name}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">Registrado</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-400">
              No hay entrenamientos en esta fecha. Usa esta vista para detectar huecos y distribuir mejor tu semana.
            </div>
          )}
        </div>

        <div className="rounded-[1.45rem] border border-white/8 bg-slateDeep/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Leyenda rapida</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
              <div key={key} className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3 text-sm text-slate-300">
            <div className="font-semibold text-white">Lectura del mes</div>
            <p className="mt-1 text-sm text-slate-400">
              {monthStats.dominantGroup
                ? `Tu grupo mas repetido este mes es ${monthStats.dominantGroup.name}.`
                : 'Todavia no hay un grupo dominante este mes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
