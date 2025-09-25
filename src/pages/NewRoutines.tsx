import React, { useState } from 'react';
import { Plus, Edit, Trash2, Dumbbell, Target } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { RoutineEditor } from '../components/RoutineEditor';
import { User, Routine, Exercise } from '../types';

interface RoutinesProps {
  user: User;
}

export const Routines: React.FC<RoutinesProps> = ({ user }) => {
  const { routines, loading, createRoutine, updateRoutine, deleteRoutine } = useRoutines(user.id);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>();
  const [saving, setSaving] = useState(false);

  const handleCreateRoutine = () => {
    setEditingRoutine(undefined);
    setShowEditor(true);
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setShowEditor(true);
  };

  const handleSaveRoutine = async (name: string, description: string, exercises: Exercise[]) => {
    setSaving(true);
    try {
      if (editingRoutine) {
        // Editar rutina existente
        await updateRoutine(editingRoutine.id, {
          name,
          description,
          exercises
        });
      } else {
        // Crear nueva rutina
        await createRoutine(name, description, exercises);
      }
      setShowEditor(false);
      setEditingRoutine(undefined);
    } catch (error) {
      alert('Error guardando la rutina');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta rutina?')) {
      try {
        await deleteRoutine(routineId);
      } catch (error) {
        alert('Error eliminando la rutina');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 text-blue-400 animate-bounce" size={48} />
          <div className="text-white text-lg">Cargando rutinas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Rutinas</h1>
            <p className="text-gray-400 text-sm">Gestiona tus entrenamientos</p>
          </div>
          <button
            onClick={handleCreateRoutine}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors duration-200"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Lista de rutinas */}
        {routines.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto mb-4 text-gray-600" size={48} />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              No tienes rutinas
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Crea tu primera rutina de entrenamiento
            </p>
            <button
              onClick={handleCreateRoutine}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Crear Rutina
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
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
                    <div className="flex items-center text-sm text-gray-400">
                      <Target size={14} className="mr-1" />
                      <span>{routine.exercises.length} ejercicios</span>
                      <span className="mx-2">•</span>
                      <span>Creada {routine.createdAt?.toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditRoutine(routine)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteRoutine(routine.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Preview de ejercicios */}
                {routine.exercises.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Ejercicios:</p>
                    <div className="space-y-1">
                      {routine.exercises.slice(0, 3).map((exercise) => (
                        <div key={exercise.id} className="text-sm text-gray-300 flex items-center justify-between">
                          <span>• {exercise.name}</span>
                          <span className="text-xs text-gray-500">
                            {exercise.sets} x {exercise.reps}
                          </span>
                        </div>
                      ))}
                      {routine.exercises.length > 3 && (
                        <div className="text-xs text-gray-500">
                          ... y {routine.exercises.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Editor Modal */}
        {showEditor && (
          <RoutineEditor
            routine={editingRoutine}
            onSave={handleSaveRoutine}
            onCancel={() => {
              setShowEditor(false);
              setEditingRoutine(undefined);
            }}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
};