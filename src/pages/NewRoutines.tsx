import React, { useState } from 'react';
import { Plus, Edit, Trash2, Dumbbell, Target, User as UserIcon, Eye } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { usePublicRoutineVisibility } from '../hooks/usePublicRoutineVisibility';
import { RoutineEditor } from '../components/RoutineEditor';
import { User, Routine, Exercise, MuscleGroup, ExerciseVideo } from '../types';
import { useUI } from '../contexts/ui-context';
import { formatDateInAppTimeZone } from '../utils/dateUtils';
import { fetchMusclewikiSuggestions, fetchMusclewikiVideos } from '../utils/musclewikiApi';
import { updateExerciseTemplate } from '../utils/dataApi';

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
  const {
    isRoutineVisibleOnDashboard,
    isRoutineVisibilityLoading,
    isRoutineVisibilityUpdating,
    setRoutineVisibilityOnDashboard
  } = usePublicRoutineVisibility(user.id);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [routineBackfillRunning, setRoutineBackfillRunning] = useState(false);
  const [routineBackfillMessage, setRoutineBackfillMessage] = useState('');

  const handleCreateRoutine = () => {
    setEditingRoutine(undefined);
    setShowEditor(true);
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setShowEditor(true);
  };

  const handleSaveRoutine = async (name: string, description: string, exercises: Exercise[], isPublic: boolean = false, primaryMuscleGroup?: MuscleGroup) => {
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

  const handleToggleRoutineVisibility = async (routineId: string, nextVisible: boolean) => {
    try {
      await setRoutineVisibilityOnDashboard(routineId, nextVisible);
    } catch {
      showToast('No se pudo guardar la visibilidad de la rutina', 'error');
    }
  };

  // Funciones para filtrar rutinas
  const myRoutines = getUserRoutines();
  const publicRoutines = getPublicRoutines();
  const visiblePublicRoutinesCount = publicRoutines.filter((routine) => isRoutineVisibleOnDashboard(routine.id)).length;
  const displayedRoutines = activeTab === 'my' ? myRoutines : publicRoutines;
  const routinesMissingVideos = myRoutines.reduce((total, routine) => {
    return total + routine.exercises.filter((exercise) => {
      if (!exercise.name.trim()) return false;
      if (!exercise.video) return true;
      return !exercise.video.variants || exercise.video.variants.length === 0;
    }).length;
  }, 0);

  const handleBackfillRoutineVideos = async () => {
    if (routineBackfillRunning) return;
    if (myRoutines.length === 0) {
      setRoutineBackfillMessage('No tienes rutinas para actualizar');
      return;
    }

    const routinesToUpdate = myRoutines.filter(canEditRoutine);
    const candidates = routinesToUpdate.flatMap((routine) => routine.exercises.filter((exercise) => {
      if (!exercise.name.trim()) return false;
      if (!exercise.video) return true;
      return !exercise.video.variants || exercise.video.variants.length === 0;
    }));
    if (candidates.length === 0) {
      setRoutineBackfillMessage('No hay ejercicios sin video en tus rutinas');
      return;
    }

    const threshold = 0.45;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    setRoutineBackfillRunning(true);
    setRoutineBackfillMessage(`Buscando videos... (0/${candidates.length})`);

    let processed = 0;
    for (const routine of routinesToUpdate) {
      let routineChanged = false;
      const nextExercises: Exercise[] = [];

      for (const exercise of routine.exercises) {
        if (exercise.name.trim().length === 0) {
          nextExercises.push(exercise);
          continue;
        }

        const needsVariants = !!exercise.video && (!exercise.video.variants || exercise.video.variants.length === 0);
        const needsVideo = !exercise.video;

        if (!needsVideo && !needsVariants) {
          nextExercises.push(exercise);
          continue;
        }

        try {
          const existingSlug = exercise.video?.slug
            || (exercise.video?.pageUrl?.includes('/exercise/')
              ? exercise.video.pageUrl.split('/exercise/')[1]?.split('/')[0]
              : undefined);

            if (needsVariants && existingSlug) {
              const data = await fetchMusclewikiVideos(existingSlug);
              const video: ExerciseVideo = {
                provider: 'musclewiki',
                slug: existingSlug,
                url: exercise.video?.url || data.defaultVideoUrl,
                pageUrl: exercise.video?.pageUrl || data.pageUrl,
                variants: data.variants
              };
              await updateExerciseTemplate(exercise.id, { video });
              nextExercises.push({ ...exercise, video });
              routineChanged = true;
              updated += 1;
            } else {
              const suggestions = await fetchMusclewikiSuggestions(exercise.name, 5);
            const best = suggestions[0];
            if (!best || best.score < threshold) {
              skipped += 1;
              processed += 1;
              setRoutineBackfillMessage(`Buscando videos... (${processed}/${candidates.length})`);
              nextExercises.push(exercise);
              continue;
            }

            const data = await fetchMusclewikiVideos(best.slug);
              const video: ExerciseVideo = {
                provider: 'musclewiki',
                slug: best.slug,
                url: data.defaultVideoUrl,
                pageUrl: data.pageUrl,
                variants: data.variants
              };
              await updateExerciseTemplate(exercise.id, { video });
              nextExercises.push({ ...exercise, video });
              routineChanged = true;
              updated += 1;
            }
        } catch {
          failed += 1;
          nextExercises.push(exercise);
        } finally {
          processed += 1;
          setRoutineBackfillMessage(`Buscando videos... (${processed}/${candidates.length})`);
        }
      }

      if (routineChanged) {
        await updateRoutine(routine.id, { exercises: nextExercises });
      }
    }

    const parts = [`${updated} actualizados`, `${skipped} omitidos`];
    if (failed > 0) parts.push(`${failed} errores`);
    setRoutineBackfillMessage(`Listo: ${parts.join(', ')}.`);
    setRoutineBackfillRunning(false);
  };

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
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
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

        {activeTab === 'my' && (
          <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
            <span>{routinesMissingVideos} ejercicios sin video</span>
            <button
              type="button"
              onClick={handleBackfillRoutineVideos}
              disabled={routineBackfillRunning || routinesMissingVideos === 0}
              className="btn-ghost text-xs disabled:opacity-60"
            >
              {routineBackfillRunning ? 'Actualizando...' : 'Cargar videos automáticamente'}
            </button>
          </div>
        )}

        {activeTab === 'public' && publicRoutines.length > 0 && (
          <div className="text-xs text-slate-400 mb-4">
            {visiblePublicRoutinesCount} de {publicRoutines.length} rutinas públicas visibles en Inicio
          </div>
        )}

        {routineBackfillMessage && (
          <div className="text-xs text-slate-400 mb-4">
            {routineBackfillMessage}
          </div>
        )}

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
            {displayedRoutines.map((routine) => {
              const isVisibleOnDashboard = isRoutineVisibleOnDashboard(routine.id);

              return (
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

                {activeTab === 'public' && (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-200">Mostrar en Inicio</p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isVisibleOnDashboard}
                      onClick={() => {
                        void handleToggleRoutineVisibility(routine.id, !isVisibleOnDashboard);
                      }}
                      disabled={isRoutineVisibilityLoading || isRoutineVisibilityUpdating(routine.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-md border transition-colors disabled:opacity-60 ${isVisibleOnDashboard
                        ? 'border-mint/70 bg-mint/30'
                        : 'border-slate-500 bg-slate-700'
                        }`}
                      aria-label={isVisibleOnDashboard
                        ? `Ocultar ${routine.name} del inicio`
                        : `Mostrar ${routine.name} en inicio`
                      }
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-sm bg-white transition-transform ${isVisibleOnDashboard
                          ? 'translate-x-4'
                          : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                )}

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
              );
            })}
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
