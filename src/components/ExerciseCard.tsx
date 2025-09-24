import React, { useState } from 'react';
import { Check, Clock, Weight } from 'lucide-react';
import { Exercise, ExerciseLog, WorkoutSet } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog | undefined;
  userId: 'A' | 'B';
  onUpdateLog: (log: ExerciseLog) => void;
  onStartTimer: (seconds: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  log,
  userId,
  onUpdateLog,
  onStartTimer
}) => {
  const [expandedSets, setExpandedSets] = useState<number[]>([]);

  const initializeSets = (): WorkoutSet[] => {
    const sets: WorkoutSet[] = [];
    for (let i = 1; i <= exercise.sets; i++) {
      const existingSet = log?.sets.find(s => s.setNumber === i);
      sets.push(existingSet || {
        setNumber: i,
        weight: 0,
        completed: false
      });
    }
    return sets;
  };

  const currentSets = log?.sets || initializeSets();
  const completedSets = currentSets.filter(s => s.completed).length;
  const progressPercentage = (completedSets / exercise.sets) * 100;

  const updateSetWeight = (setNumber: number, weight: number) => {
    const updatedSets = currentSets.map(set =>
      set.setNumber === setNumber ? { ...set, weight } : set
    );

    const updatedLog: ExerciseLog = {
      exerciseId: exercise.id,
      userId,
      date: new Date().toISOString().split('T')[0],
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
      date: new Date().toISOString().split('T')[0],
      sets: updatedSets
    };

    onUpdateLog(updatedLog);

    // Si se completó la serie y hay tiempo de descanso, iniciar temporizador
    if (!wasCompleted && exercise.restTime) {
      onStartTimer(exercise.restTime);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 mb-4">
      {/* Header del ejercicio */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">{exercise.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Weight size={16} />
            <span>{exercise.sets} × {exercise.reps}</span>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-sm text-gray-400">
          {completedSets} de {exercise.sets} series completadas
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
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                isCompleted 
                  ? 'bg-green-900/30 border-green-600' 
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
            >
              {/* Número de serie */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {setNumber}
              </div>

              {/* Campo de peso */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={weight || ''}
                    onChange={(e) => updateSetWeight(setNumber, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-center"
                    placeholder="0"
                    step="0.5"
                    min="0"
                  />
                  <span className="text-gray-400 text-sm">kg × {exercise.reps}</span>
                </div>
              </div>

              {/* Botón de completar */}
              <button
                onClick={() => toggleSetCompleted(setNumber)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isCompleted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
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
        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-400 bg-gray-700 rounded-lg p-2">
          <Clock size={16} />
          <span>Descanso recomendado: {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
};