import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutSession, WorkoutCalendarDay } from '../types';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';

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
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Obtener días del mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Crear array de días del mes
  const days: WorkoutCalendarDay[] = [];

  // Días vacíos al inicio (para alineación de la semana)
  for (let i = 0; i < firstDayWeekday; i++) {
    const emptyDate = new Date(year, month, -firstDayWeekday + i + 1);
    days.push({
      date: emptyDate.toISOString().split('T')[0],
      workouts: []
    });
  }

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];

    // Encontrar entrenamientos de este día
    const dayWorkouts = sessions
      .filter(session => {
        if (!session.completedAt) return false;
        const sessionDate = session.completedAt.toISOString().split('T')[0];
        return sessionDate === dateStr;
      })
      .map(session => ({
        muscleGroup: session.primaryMuscleGroup!,
        routineName: session.routineName,
        sessionId: session.id
      }));

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
    return dateStr === today.toISOString().split('T')[0];
  };

  const isCurrentMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getMonth() === month && date.getFullYear() === year;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
        >
          <ChevronLeft size={18} className="text-gray-300" />
        </button>

        <h3 className="text-base sm:text-lg font-semibold text-white text-center">
          {monthNames[month]} {year}
        </h3>

        <button
          onClick={() => navigateMonth('next')}
          className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
        >
          <ChevronRight size={18} className="text-gray-300" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day, index) => {
          const dayNumber = new Date(day.date).getDate();
          const hasWorkout = day.workouts.length > 0;
          const isCurrentDay = isToday(day.date);
          const isInCurrentMonth = isCurrentMonth(day.date);

          return (
            <div
              key={index}
              onClick={() => onDayClick?.(day.date)}
              className={`
                relative aspect-square p-0.5 sm:p-1 rounded-lg cursor-pointer transition-colors touch-manipulation
                ${isCurrentDay
                  ? 'bg-blue-600 text-white'
                  : isInCurrentMonth
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'text-gray-600 hover:bg-gray-800'
                }
                ${hasWorkout ? 'ring-1 sm:ring-2 ring-green-500' : ''}
              `}
            >
              <div className="text-xs font-medium text-center leading-tight">
                {dayNumber}
              </div>

              {/* Indicadores de entrenamientos */}
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
                      <div className="text-xs text-gray-400">+</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda de colores */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Grupos musculares:</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
            <div key={key} className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-xs text-gray-400 truncate">{group.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};