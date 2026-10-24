import React, { useState } from 'react';
import { Bookmark, Globe2, Plus, Search, Target } from 'lucide-react';
import { useRoutines } from '../hooks/useRoutines';
import { usePublicRoutineVisibility } from '../hooks/usePublicRoutineVisibility';
import { RoutineCard } from '../components/RoutineCard';
import { useRoutineVideoBackfill } from '../hooks/useRoutineVideoBackfill';
import { filterRoutines } from '../lib/filterRoutines';
import { User, Routine, Exercise, MuscleGroup } from '../../../shared/types';
import { useUI } from '../../../app/providers/ui-context';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { DialogPortal } from '../../../shared/ui/DialogPortal';

interface RoutinesProps {
  user: User;
}

const RoutineEditor = React.lazy(async () => {
  const module = await import('../components/RoutineEditor');
  return { default: module.RoutineEditor };
});

const EditorLoadingFallback = () => (
  <DialogPortal>
    <div className="fixed inset-0 z-50 flex h-screen items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="app-card px-6 py-5 text-sm text-slate-200" role="status">
        Cargando editor...
      </div>
    </div>
  </DialogPortal>
);

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
  const [searchQuery, setSearchQuery] = useState('');
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
  const tabRoutines = activeTab === 'my' ? myRoutines : publicRoutines;
  const displayedRoutines = filterRoutines(tabRoutines, searchQuery);
  const isSearching = searchQuery.trim().length > 0;

  if (loading) {
    if (showRoutinesSkeleton) {
      return <PageSkeleton page="routines" />;
    }

    return <div className="app-shell" aria-hidden="true" />;
  }

  return (
    <div className="app-shell pb-28">
      <div className="page-container">
        <section className="page-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Biblioteca de entrenamiento</div>
            <h1>Tu biblioteca</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {activeTab === 'my'
                ? 'Crea, edita y reutiliza tus rutinas en un solo lugar.'
                : 'Activa las rutinas públicas que quieras ver en Inicio.'}
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

        <div className="library-tabs" role="tablist" aria-label="Tipos de rutinas">
          <button type="button" id="routines-tab-my" role="tab" aria-selected={activeTab === 'my'}
            aria-controls="routines-panel-my" className="library-tab" onClick={() => handleTabChange('my')}
            onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'End') { event.preventDefault(); handleTabChange('public'); document.getElementById('routines-tab-public')?.focus(); } }}>
            <Bookmark size={15} />Mis rutinas<small>{myRoutines.length}</small>
          </button>
          <button type="button" id="routines-tab-public" role="tab" aria-selected={activeTab === 'public'}
            aria-controls="routines-panel-public" className="library-tab" onClick={() => handleTabChange('public')}
            onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'Home') { event.preventDefault(); handleTabChange('my'); document.getElementById('routines-tab-my')?.focus(); } }}>
            <Globe2 size={15} />Comunidad<small>{publicRoutines.length}</small>
          </button>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className="library-search w-full"><Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Buscar por rutina o ejercicio</span>
            <input id="routine-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar rutina o ejercicio…" />
          </label>
          <p className="text-xs text-slate-400" role="status">{displayedRoutines.length} de {tabRoutines.length} rutinas</p>
        </div>

        {activeTab === 'public' && publicRoutines.length > 0 && (
          <div className="motion-enter motion-enter-delay-3 mb-4 rounded-[1rem] bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
            {visiblePublicRoutinesCount} de {publicRoutines.length} rutinas públicas visibles en Inicio
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
                  {isSearching ? 'No encontramos rutinas' : activeTab === 'my' ? 'Aún no tienes rutinas' : 'Aún no hay rutinas públicas'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {isSearching ? 'Prueba otro nombre o busca un ejercicio de la rutina.' : activeTab === 'my'
                    ? 'Crea tu primera rutina para empezar más rápido.'
                    : 'Todavía no hay rutinas compartidas. Puedes publicar la primera.'
                  }
                </p>
                {isSearching ? (
                  <button onClick={() => setSearchQuery('')} className="btn-secondary touch-target">Limpiar búsqueda</button>
                ) : activeTab === 'my' && (
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

        {activeTab === 'my' && routinesMissingVideos > 0 && (
          <details className="mt-6 border-t border-mist/25 py-2 text-xs text-slate-400">
            <summary className="min-h-11 cursor-pointer py-3">Videos de ejercicios · {routinesMissingVideos} pendientes</summary>
            <p className="mb-2">Puedes completar los videos sin modificar tus series ni pesos.</p>
            <button
              type="button"
              onClick={handleBackfillRoutineVideos}
              disabled={routineBackfillRunning || routinesMissingVideos === 0}
              className="btn-ghost text-xs disabled:opacity-60"
            >
              {routineBackfillRunning ? 'Actualizando...' : 'Buscar videos automáticamente'}
            </button>
          </details>
        )}

        {/* Editor Modal */}
        {showEditor && (
          <React.Suspense fallback={<EditorLoadingFallback />}>
            <RoutineEditor
              routine={editingRoutine}
              onSave={handleSaveRoutine}
              onCancel={() => {
                setShowEditor(false);
                setEditingRoutine(undefined);
              }}
              loading={saving}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};
