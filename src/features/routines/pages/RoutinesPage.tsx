import React, { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { usePublicRoutineVisibility } from '../hooks/usePublicRoutineVisibility';
import { RoutineEditor } from '../components/RoutineEditor';
import { RoutineCard } from '../components/RoutineCard';
import { useRoutineVideoBackfill } from '../hooks/useRoutineVideoBackfill';
import { User, Routine, Exercise, MuscleGroup } from '../../../shared/types';
import { useUI } from '../../../app/providers/ui-context';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';

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
  } = useRoutines(user.id, { includeVideos: true });
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
  const [tabTransitionDirection, setTabTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [tabTransitionVersion, setTabTransitionVersion] = useState(0);
  const showRoutinesSkeleton = useDelayedLoading(loading, 180);

  const handleTabChange = (nextTab: 'my' | 'public') => {
    if (activeTab === nextTab) return;

    setTabTransitionDirection(nextTab === 'public' ? 'forward' : 'backward');
    setTabTransitionVersion((previous) => previous + 1);
    setActiveTab(nextTab);
  };

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
    } catch (error) {
      showToast(toUserMessage(error, 'Error guardando la rutina'), 'error');
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
        } catch (error) {
          showToast(toUserMessage(error, 'Error eliminando la rutina'), 'error');
        }
      }
    });
  };

  const handleToggleRoutineVisibility = async (routineId: string, nextVisible: boolean) => {
    try {
      await setRoutineVisibilityOnDashboard(routineId, nextVisible);
    } catch (error) {
      showToast(toUserMessage(error, 'No se pudo guardar la visibilidad de la rutina'), 'error');
    }
  };

  // Funciones para filtrar rutinas
  const myRoutines = getUserRoutines();
  const publicRoutines = getPublicRoutines();
  const {
    routineBackfillRunning,
    routineBackfillMessage,
    routinesMissingVideos,
    handleBackfillRoutineVideos
  } = useRoutineVideoBackfill({
    routines: myRoutines,
    canEditRoutine,
    updateRoutine
  });
  const visiblePublicRoutinesCount = publicRoutines.filter((routine) => isRoutineVisibleOnDashboard(routine.id)).length;
  const displayedRoutines = activeTab === 'my' ? myRoutines : publicRoutines;

  if (loading) {
    if (showRoutinesSkeleton) {
      return <PageSkeleton page="routines" />;
    }

    return <div className="app-shell" aria-hidden="true" />;
  }

  return (
    <div className="app-shell pb-28">
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-mint/20 bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.14),transparent_28%),linear-gradient(180deg,rgba(17,24,39,0.98),rgba(11,15,20,0.98))] shadow-lift sm:mb-8">
          <div className="border-b border-white/8 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-mint/85 sm:px-6">
            Biblioteca de entrenamiento
          </div>
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  {activeTab === 'my' ? 'Tus rutinas activas' : 'Rutinas de la comunidad'}
                </div>
                <h1 className="mt-3 font-display text-[2.4rem] uppercase leading-[0.92] text-white sm:text-[3.3rem]">
                  {activeTab === 'my' ? 'Crea, ajusta y repite.' : 'Explora y activa nuevas ideas.'}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {activeTab === 'my'
                    ? 'Organiza tus entrenamientos, edita ejercicios y deja listas las rutinas que más usas.'
                    : 'Activa en Inicio las rutinas públicas que quieres tener a mano para entrenar rápido.'}
                </p>
              </div>

              <button
                onClick={handleCreateRoutine}
                className="btn-primary inline-flex items-center justify-center gap-2 self-start sm:self-auto"
                aria-label="Crear nueva rutina"
              >
                <Plus size={18} />
                <span>Nueva rutina</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Propias</div>
                <div className="mt-1 font-display text-2xl text-white">{myRoutines.length}</div>
              </div>
              <div className="rounded-[1.35rem] border border-mint/20 bg-mint/10 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-mint/80">Públicas</div>
                <div className="mt-1 font-display text-2xl text-white">{publicRoutines.length}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Sin video</div>
                <div className="mt-1 font-display text-2xl text-white">{routinesMissingVideos}</div>
              </div>
              <div className="rounded-[1.35rem] border border-amberGlow/20 bg-amberGlow/10 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-amberGlow/80">En Inicio</div>
                <div className="mt-1 font-display text-2xl text-white">{visiblePublicRoutinesCount}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Tipos de rutinas">
          <button
            id="routines-tab-my"
            role="tab"
            aria-selected={activeTab === 'my'}
            aria-controls="routines-panel-my"
            onClick={() => handleTabChange('my')}
            className={`rounded-[1.5rem] border px-4 py-4 text-left transition-colors ${activeTab === 'my'
              ? 'border-mint/30 bg-mint/10 text-white shadow-lift'
              : 'border-mist/50 bg-graphite text-slate-300 hover:border-mint/20 hover:text-white'
              }`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Mis rutinas</div>
            <div className="mt-1 font-display text-2xl uppercase">{myRoutines.length}</div>
            <div className="mt-1 text-sm text-current/80">Edita tus planes y deja listas las sesiones que repites.</div>
          </button>
          <button
            id="routines-tab-public"
            role="tab"
            aria-selected={activeTab === 'public'}
            aria-controls="routines-panel-public"
            onClick={() => handleTabChange('public')}
            className={`rounded-[1.5rem] border px-4 py-4 text-left transition-colors ${activeTab === 'public'
              ? 'border-amberGlow/30 bg-amberGlow/10 text-white shadow-lift'
              : 'border-mist/50 bg-graphite text-slate-300 hover:border-amberGlow/20 hover:text-white'
              }`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">Públicas</div>
            <div className="mt-1 font-display text-2xl uppercase">{publicRoutines.length}</div>
            <div className="mt-1 text-sm text-current/80">Activa las que quieres ver en Inicio y entrena sin buscarlas de nuevo.</div>
          </button>
        </div>

        {activeTab === 'my' && (
          <div className="mb-4 flex items-center justify-between rounded-[1.3rem] border border-mist/50 bg-graphite px-4 py-3 text-xs text-slate-400">
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
          <div className="mb-4 rounded-[1.3rem] border border-mist/50 bg-graphite px-4 py-3 text-xs text-slate-400">
            {visiblePublicRoutinesCount} de {publicRoutines.length} rutinas públicas visibles en Inicio
          </div>
        )}

        {routineBackfillMessage && (
          <div className="mb-4 rounded-[1.3rem] border border-mint/20 bg-mint/10 px-4 py-3 text-xs text-slate-300">
            {routineBackfillMessage}
          </div>
        )}

        {/* Lista de rutinas */}
        <div className="relative isolation-isolate min-h-[16rem]">
          <div
            id={activeTab === 'my' ? 'routines-panel-my' : 'routines-panel-public'}
            role="tabpanel"
            aria-labelledby={activeTab === 'my' ? 'routines-tab-my' : 'routines-tab-public'}
            key={`${activeTab}-${tabTransitionVersion}`}
            className={tabTransitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}
          >
            {displayedRoutines.length === 0 ? (
              <div className="text-center py-12 content-fade-in">
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
                    Crear rutina
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedRoutines.map((routine) => {
                  const isVisibleOnDashboard = isRoutineVisibleOnDashboard(routine.id);

                  return (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      user={user}
                      activeTab={activeTab}
                      canEditRoutine={canEditRoutine}
                      isVisibleOnDashboard={isVisibleOnDashboard}
                      isRoutineVisibilityLoading={isRoutineVisibilityLoading}
                      isRoutineVisibilityUpdating={isRoutineVisibilityUpdating}
                      onEdit={handleEditRoutine}
                      onDelete={handleDeleteRoutine}
                      onToggleVisibility={(routineId, nextVisible) => {
                        void handleToggleRoutineVisibility(routineId, nextVisible);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

        </div>

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
