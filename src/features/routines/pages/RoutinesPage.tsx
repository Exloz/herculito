import React, { useState } from 'react';
import { Bookmark, Globe2, Plus, Target } from 'lucide-react';
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
        <section className="motion-enter mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">Biblioteca de entrenamiento</div>
            <h1 className="mt-1 font-display text-2xl text-white sm:text-3xl">Rutinas</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {activeTab === 'my'
                ? 'Crea, edita y reutiliza tus rutinas en un solo lugar.'
                : 'Activa las rutinas publicas que quieras ver en Inicio.'}
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
        </section>

        <div className="motion-enter motion-enter-delay-1 mb-4 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{myRoutines.length} propias</span>
          <span className="rounded-full bg-mint/12 px-2.5 py-1 text-mint/85">{publicRoutines.length} públicas</span>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{routinesMissingVideos} sin video</span>
          <span className="rounded-full bg-amberGlow/12 px-2.5 py-1 text-amberGlow">{visiblePublicRoutinesCount} en Inicio</span>
        </div>

        <div className="motion-enter motion-enter-delay-2 mb-5 rounded-[1.2rem] bg-graphite/80 p-1.5 shadow-soft" role="tablist" aria-label="Tipos de rutinas">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vista</div>
          <div className="grid grid-cols-2 gap-1">
          <button
            id="routines-tab-my"
            role="tab"
            aria-selected={activeTab === 'my'}
            aria-controls="routines-panel-my"
            onClick={() => handleTabChange('my')}
            className={`motion-interactive rounded-[0.95rem] px-3 py-3 text-left transition-colors ${activeTab === 'my'
              ? 'bg-mint/12 text-white shadow-soft'
              : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-current/70">
              <Bookmark size={13} />
              <span>Mis rutinas</span>
            </div>
            <div className="mt-1 font-display text-xl uppercase">{myRoutines.length}</div>
            <div className="mt-1 text-xs text-current/75">Crea, edita y repite.</div>
          </button>
          <button
            id="routines-tab-public"
            role="tab"
            aria-selected={activeTab === 'public'}
            aria-controls="routines-panel-public"
            onClick={() => handleTabChange('public')}
            className={`motion-interactive rounded-[0.95rem] px-3 py-3 text-left transition-colors ${activeTab === 'public'
              ? 'bg-amberGlow/12 text-white shadow-soft'
              : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-current/70">
              <Globe2 size={13} />
              <span>Públicas</span>
            </div>
            <div className="mt-1 font-display text-xl uppercase">{publicRoutines.length}</div>
            <div className="mt-1 text-xs text-current/75">Activa las que si vas a usar.</div>
          </button>
          </div>
        </div>

        {activeTab === 'my' && (
          <div className="motion-enter motion-enter-delay-3 mb-4 flex items-center justify-between rounded-[1rem] bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
            <span>{routinesMissingVideos} ejercicios sin video</span>
            <button
              type="button"
              onClick={handleBackfillRoutineVideos}
              disabled={routineBackfillRunning || routinesMissingVideos === 0}
              className="btn-ghost text-xs disabled:opacity-60"
            >
              {routineBackfillRunning ? 'Actualizando...' : 'Buscar videos automaticamente'}
            </button>
          </div>
        )}

        {activeTab === 'public' && publicRoutines.length > 0 && (
          <div className="motion-enter motion-enter-delay-3 mb-4 rounded-[1rem] bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
            {visiblePublicRoutinesCount} de {publicRoutines.length} rutinas publicas visibles en Inicio
          </div>
        )}

        {routineBackfillMessage && (
          <div className="motion-enter motion-enter-delay-3 mb-4 rounded-[1rem] bg-mint/10 px-3 py-2.5 text-xs text-slate-300">
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
                  {activeTab === 'my' ? 'Aun no tienes rutinas' : 'Aun no hay rutinas publicas'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {activeTab === 'my'
                    ? 'Crea tu primera rutina para empezar mas rapido.'
                    : 'Todavia no hay rutinas compartidas. Puedes publicar la primera.'
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
               <div className="space-y-3">
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
