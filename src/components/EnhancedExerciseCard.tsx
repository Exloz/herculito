import React, { useState } from 'react';
import { Check, Clock, Weight, TrendingUp, Plus, Minus } from 'lucide-react';
import { Exercise, WorkoutSet, ExerciseHistory } from '../types';

interface EnhancedExerciseCardProps {
  exercise: Exercise;
  exerciseHistory?: ExerciseHistory;
  onUpdateSets: (exerciseId: string, sets: WorkoutSet[]) => void;
  onStartTimer: () => void;
}

export const EnhancedExerciseCard: React.FC<EnhancedExerciseCardProps> = ({
  exercise,
  exerciseHistory,
  onUpdateSets,
  onStartTimer
}) => {
  const [sets, setSets] = useState<WorkoutSet[]>(() => {
    const initialSets: WorkoutSet[] = [];
    for (let i = 1; i <= exercise.sets; i++) {
      initialSets.push({
        setNumber: i,
        weight: exerciseHistory?.lastWeight[i - 1] || 0,
        completed: false
      });
    }
    return initialSets;
  });

  const updateSetWeight = (setNumber: number, weight: number) => {
    const newSets = sets.map(set => 
      set.setNumber === setNumber ? { ...set, weight } : set
    );
    setSets(newSets);
    onUpdateSets(exercise.id, newSets);
  };

  const toggleSetCompletion = (setNumber: number) => {
    const newSets = sets.map(set => 
      set.setNumber === setNumber 
        ? { ...set, completed: !set.completed, completedAt: !set.completed ? new Date() : undefined }
        : set
    );
    setSets(newSets);
    onUpdateSets(exercise.id, newSets);

    // Iniciar timer si se completó una serie y hay tiempo de descanso
    const completedSet = newSets.find(s => s.setNumber === setNumber);
    if (completedSet?.completed && exercise.restTime) {
      onStartTimer();
    }
  };

  const adjustWeight = (setNumber: number, increment: number) => {
    const currentSet = sets.find(s => s.setNumber === setNumber);
    if (currentSet) {
      const newWeight = Math.max(0, currentSet.weight + increment);
      updateSetWeight(setNumber, newWeight);
    }
  };

  const completedSets = sets.filter(s => s.completed).length;
  const progressPercentage = (completedSets / exercise.sets) * 100;

  return (
    <div className="app-card rounded-lg p-4 border border-mist/60">
      {/* Header del ejercicio */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{exercise.name}</h3>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span>{exercise.sets} series × {exercise.reps} reps</span>
            {exercise.restTime && (
              <div className="flex items-center">
                <Clock size={14} className="mr-1" />
                <span>{exercise.restTime}s descanso</span>
              </div>
            )}
          </div>
          
          {/* Información del historial */}
          {exerciseHistory && (
            <div className="mt-2 text-xs text-mint flex items-center">
              <TrendingUp size={12} className="mr-1" />
              <span>Última vez: {exerciseHistory.lastWeight.join(', ')} kg</span>
              {exerciseHistory.personalRecord > 0 && (
                <span className="ml-2 text-mint">
                  • PR: {exerciseHistory.personalRecord} kg
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {completedSets}/{exercise.sets}
          </div>
          <div className="w-16 h-2 bg-slateDeep rounded-full mt-1">
            <div
              className="h-full bg-mint rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de series */}
      <div className="space-y-2">
        {sets.map((set) => (
          <div key={set.setNumber}>
            <div className="flex items-center space-x-3">
              {/* Número de serie */}
              <div className="w-8 h-8 rounded-full bg-slateDeep flex items-center justify-center text-sm font-medium text-slate-300">
                {set.setNumber}
              </div>

              {/* Peso */}
              <div className="flex items-center space-x-2 flex-1">
                <Weight size={16} className="text-slate-400" />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => adjustWeight(set.setNumber, -2.5)}
                    className="p-1 rounded hover:bg-slateDeep text-slate-400 hover:text-white"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    value={set.weight}
                    onChange={(e) => updateSetWeight(set.setNumber, parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-slateDeep border border-mist/50 rounded text-center text-white text-sm"
                    step="0.5"
                    min="0"
                  />
                  <span className="text-xs text-slate-400">kg</span>
                  <button
                    onClick={() => adjustWeight(set.setNumber, 2.5)}
                    className="p-1 rounded hover:bg-slateDeep text-slate-400 hover:text-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Repeticiones objetivo */}
              <div className="text-sm text-slate-400">
                × {exercise.reps}
              </div>

              {/* Botón de completar */}
              <button
                onClick={() => toggleSetCompletion(set.setNumber)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  set.completed
                    ? 'bg-mint text-ink'
                    : 'bg-slateDeep text-slate-400 hover:bg-mint hover:text-ink'
                }`}
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón de timer */}
      {exercise.restTime && completedSets > 0 && completedSets < exercise.sets && (
        <button
          onClick={() => onStartTimer()}
          className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <Clock size={16} />
          <span>Iniciar Descanso ({exercise.restTime}s)</span>
        </button>
      )}
    </div>
  );
};