import { Play, Clock, Target } from 'lucide-react';
import { Routine } from '../types';

interface RoutineSelectorProps {
  routines: Routine[];
  onSelectRoutine: (routine: Routine) => void;
  loading: boolean;
}

export function RoutineSelector({ routines, onSelectRoutine, loading }: RoutineSelectorProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando rutinas...</p>
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto mb-4 text-gray-600" size={48} />
        <h3 className="text-lg font-medium text-gray-400 mb-2">
          No se encontraron rutinas
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Se están inicializando las rutinas por defecto...
        </p>
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          ¿Qué rutina quieres hacer hoy?
        </h2>
        <p className="text-gray-400">
          Selecciona una rutina para comenzar tu entrenamiento
        </p>
      </div>

      {routines.map((routine) => (
        <div
          key={routine.id}
          className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors duration-200"
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {routine.name}
                </h3>
                {routine.description && (
                  <p className="text-gray-400 text-sm mb-2">
                    {routine.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <Target size={16} className="mr-1" />
                  <span>{routine.exercises.length} ejercicios</span>
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-1" />
                  <span>
                    {Math.round(
                      routine.exercises.reduce(
                        (total, ex) => total + (ex.sets * (ex.restTime || 60)) / 60,
                        0
                      )
                    )} min est.
                  </span>
                </div>
              </div>
            </div>

            {/* Preview de ejercicios */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">Ejercicios:</div>
              <div className="space-y-1">
                {routine.exercises.slice(0, 3).map((exercise) => (
                  <div key={exercise.id} className="text-sm text-gray-300 flex justify-between">
                    <span>{exercise.name}</span>
                    <span className="text-gray-500">
                      {exercise.sets} × {exercise.reps}
                    </span>
                  </div>
                ))}
                {routine.exercises.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{routine.exercises.length - 3} ejercicios más
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onSelectRoutine(routine)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Play size={18} />
              <span>Comenzar Rutina</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
