import React from 'react';
import { Check, Clock, Weight } from 'lucide-react';
import { Exercise, ExerciseLog, WorkoutSet } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  userId: string;
  onUpdateLog: (log: ExerciseLog) => void;
  onStartTimer: (seconds: number) => void;
  previousWeights?: number[]; // Pesos de la sesión anterior
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  log,
  userId,
  onUpdateLog,
  onStartTimer,
  previousWeights
}) => {

  const initializeSets = (): WorkoutSet[] => {
    const sets: WorkoutSet[] = [];
    for (let i = 1; i <= exercise.sets; i++) {
      const existingSet = log.sets.find(s => s.setNumber === i);
      if (existingSet) {
        sets.push(existingSet);
      } else {
        // Usar el peso anterior si está disponible, sino usar 0
        const previousWeight = previousWeights && previousWeights[i - 1] !== undefined
          ? previousWeights[i - 1]
          : 0;

        sets.push({
          setNumber: i,
          weight: previousWeight,
          completed: false
        });
      }
    }
    return sets;
  };

  const currentSets = log.sets.length > 0 ? log.sets : initializeSets();
  const completedSets = currentSets.filter(s => s.completed).length;
  const progressPercentage = (completedSets / exercise.sets) * 100;

  const updateSetWeight = (setNumber: number, weight: number) => {
    const updatedSets = currentSets.map(set =>
      set.setNumber === setNumber ? { ...set, weight } : set
    );

    const updatedLog: ExerciseLog = {
      exerciseId: exercise.id,
      userId,
      date: getCurrentDateString(),
      sets: updatedSets
    };

    onUpdateLog(updatedLog);
  };

  const toggleSetCompleted = (setNumber: number) => {
    const currentSet = currentSets.find(s => s.setNumber === setNumber);
    if (!currentSet) return;

    const wasCompleted = currentSet.completed;

    const updatedSets = currentSets.map(set =>
      set.setNumber === setNumber
        ? { ...set, completed: !set.completed, completedAt: !set.completed ? new Date() : undefined }
        : set
    );

    const updatedLog: ExerciseLog = {
      exerciseId: exercise.id,
      userId,
      date: getCurrentDateString(),
      sets: updatedSets
    };

    onUpdateLog(updatedLog);

     // Si se completó la serie y hay tiempo de descanso, iniciar temporizador
     if (!wasCompleted && exercise.restTime && exercise.restTime > 0) {
       onStartTimer(exercise.restTime);
     }
  };

  return (
    <div className="app-card p-4 mb-4">
      {/* Header del ejercicio */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">{exercise.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <Weight size={16} />
            <span>{exercise.sets} × {exercise.reps}</span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slateDeep rounded-full h-2 mb-2">
          <div
            className="bg-mint h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-sm text-slate-400">
          {completedSets} de {exercise.sets} series completadas
          {/* Información sobre pesos anteriores */}
          {previousWeights && previousWeights.length > 0 && (
            <span className="ml-2 text-mint">
              • Pesos precargados de la sesión anterior
            </span>
          )}
        </div>
      </div>

      {/* Lista de series */}
      <div className="space-y-3">
        {Array.from({ length: exercise.sets }, (_, index) => {
          const setNumber = index + 1;
          const currentSet = currentSets.find(s => s.setNumber === setNumber);
          const isCompleted = currentSet?.completed || false;
          const weight = currentSet?.weight || 0;

          return (
            <div
              key={setNumber}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${isCompleted
                ? 'bg-mint/10 border-mint/50'
                : 'bg-slateDeep border-mist/60 hover:border-mint/40'
                }`}
            >
              {/* Numero de serie */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted ? 'bg-mint text-ink' : 'bg-charcoal text-slate-300'
                }`}>
                {setNumber}
              </div>

              {/* Campo de peso */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={weight || ''}
                      onChange={(e) => updateSetWeight(setNumber, parseFloat(e.target.value) || 0)}
                      className="input input-sm w-20 text-center"
                      placeholder="0"
                      step="0.5"
                      min="0"
                    />
                    {/* Indicador de peso anterior */}
                    {previousWeights && previousWeights[setNumber - 1] !== undefined && weight === previousWeights[setNumber - 1] && (
                      <div className="absolute -top-2 -right-2 w-3 h-3 bg-mint rounded-full" title="Peso de la sesión anterior" />
                    )}
                  </div>
                  <span className="text-slate-400 text-sm">kg × {exercise.reps}</span>
                </div>
              </div>

              {/* Boton de completar */}
              <button
                onClick={() => toggleSetCompleted(setNumber)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isCompleted
                  ? 'bg-mint text-ink hover:bg-mintDeep'
                  : 'bg-charcoal text-slate-300 hover:bg-slateDeep'
                  }`}
              >
                <Check size={20} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Información de descanso */}
      {exercise.restTime && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 bg-slateDeep rounded-xl p-2">
          <Clock size={16} />
          <span>Descanso recomendado: {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
     </div>
   );
});