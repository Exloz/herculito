import React, { useState } from 'react';
import { Plus, Edit, Trash2, Dumbbell, Target, User as UserIcon, Eye } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { RoutineEditor } from '../components/RoutineEditor';
import { User, Routine, Exercise, MuscleGroup } from '../types';
import { useUI } from '../contexts/ui-context';
import { formatDateInAppTimeZone } from '../utils/dateUtils';

interface RoutinesProps {
  user: User;
}

export const Routines: React.FC<RoutinesProps> = ({ user }) => {
  const { showToast, confirm } = useUI();
  const {
    loading,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    canEditRoutine,
    getUserRoutines,
    getPublicRoutines
  } = useRoutines(user.id);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');

  const handleCreateRoutine = () => {
    setEditingRoutine(undefined);
    setShowEditor(true);
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setShowEditor(true);
  };

  const handleSaveRoutine = async (name: string, description: string, exercises: Exercise[], isPublic: boolean = true, primaryMuscleGroup?: MuscleGroup) => {
    setSaving(true);
    try {
      if (editingRoutine) {
        // Editar rutina existente
        await updateRoutine(editingRoutine.id, {
          name,
          description,
          exercises,
          isPublic,
          primaryMuscleGroup
        });
      } else {
        // Crear nueva rutina
        await createRoutine(name, description, exercises, isPublic, primaryMuscleGroup, user.name);
      }
      setShowEditor(false);
      setEditingRoutine(undefined);
      showToast('Rutina guardada correctamente', 'success');
    } catch {
      showToast('Error guardando la rutina', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    confirm({
      title: 'Eliminar rutina',
      message: '¿Estás seguro de que quieres eliminar esta rutina? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteRoutine(routineId);
          showToast('Rutina eliminada', 'success');
        } catch {
          showToast('Error eliminando la rutina', 'error');
        }
      }
    });
  };

  // Funciones para filtrar rutinas
  const myRoutines = getUserRoutines();
  const publicRoutines = getPublicRoutines();
  const displayedRoutines = activeTab === 'my' ? myRoutines : publicRoutines;

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 text-mint animate-bounce" size={48} />
          <div className="text-slate-100 text-lg">Cargando rutinas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pb-28">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display text-white">Rutinas</h1>
            <p className="text-slate-300 text-sm">Gestiona tus entrenamientos</p>
          </div>
          <button
            onClick={handleCreateRoutine}
            className="btn-primary"
            aria-label="Crear nueva rutina"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="app-surface p-1 mb-6 flex gap-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'my'
              ? 'bg-mint/15 text-mint'
              : 'text-slate-300 hover:text-white'
              }`}
          >
            Mis Rutinas ({myRoutines.length})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'public'
              ? 'bg-mint/15 text-mint'
              : 'text-slate-300 hover:text-white'
              }`}
          >
            Públicas ({publicRoutines.length})
          </button>
        </div>

        {/* Lista de rutinas */}
        {displayedRoutines.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto mb-4 text-slate-500" size={48} />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              {activeTab === 'my' ? 'No tienes rutinas' : 'No hay rutinas públicas'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {activeTab === 'my'
                ? 'Crea tu primera rutina de entrenamiento'
                : 'Sé el primero en crear una rutina pública'
              }
            </p>
            {activeTab === 'my' && (
              <button
                onClick={handleCreateRoutine}
                className="btn-primary"
              >
                Crear Rutina
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedRoutines.map((routine) => (
              <div
                key={routine.id}
                className="app-card p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-display text-white">
                        {routine.name}
                      </h3>
                      {!routine.isPublic && (
                        <span className="chip">Privada</span>
                      )}
                      {routine.createdBy !== user.id && (
                        <span className="chip-warm">Comunidad</span>
                      )}
                    </div>
                    {routine.description && (
                      <p className="text-slate-300 text-sm mb-2">
                        {routine.description}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-slate-400 flex-wrap gap-x-3 gap-y-1">
                      <div className="flex items-center">
                        <Target size={14} className="mr-1" />
                        <span>{routine.exercises.length} ejercicios</span>
                      </div>
                      {routine.timesUsed && routine.timesUsed > 0 && (
                        <div className="flex items-center">
                          <Eye size={14} className="mr-1" />
                          <span>Usada {routine.timesUsed} veces</span>
                        </div>
                      )}
                      {routine.createdBy !== user.id && (
                        <div className="flex items-center">
                          <UserIcon size={14} className="mr-1" />
                          <span>Por {routine.createdByName || 'Otro usuario'}</span>
                        </div>
                      )}
                      <span>Creada {routine.createdAt ? formatDateInAppTimeZone(routine.createdAt, 'es-CO') : ''}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {canEditRoutine(routine) && (
                      <>
                        <button
                          onClick={() => handleEditRoutine(routine)}
                          className="btn-ghost"
                          title="Editar rutina"
                          aria-label={`Editar rutina ${routine.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          className="btn-ghost text-crimson hover:text-red-400"
                          title="Eliminar rutina"
                          aria-label={`Eliminar rutina ${routine.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview de ejercicios */}
                {routine.exercises.length > 0 && (
                  <div className="mt-3 pt-3 app-divider">
                    <p className="text-xs text-slate-400 mb-2">Ejercicios:</p>
                    <div className="space-y-1">
                      {routine.exercises.slice(0, 3).map((exercise) => (
                        <div key={exercise.id} className="text-sm text-slate-200 flex items-center justify-between">
                          <span>• {exercise.name}</span>
                          <span className="text-xs text-slate-500">
                            {exercise.sets} x {exercise.reps}
                          </span>
                        </div>
                      ))}
                      {routine.exercises.length > 3 && (
                        <div className="text-xs text-slate-500">
                          ... y {routine.exercises.length - 3} mas
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