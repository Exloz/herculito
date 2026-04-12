import React, { useState, useCallback } from 'react';
import { Target, Plus, Calendar, Trash2, MapPin, Timer } from 'lucide-react';
import type { User, ArcheryBowType, HiitConfig } from '../../../shared/types';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { useSportSessions } from '../hooks/useSportSessions';
import { useActiveArcherySession } from '../hooks/useActiveArcherySession';
import { ArcherySession } from '../components/archery/ArcherySession';
import { HiitConfig as HiitConfigPanel } from '../components/hiit/HiitConfig';
import { HiitActive } from '../components/hiit/HiitActive';
import { useUI } from '../../../app/providers/ui-context';
import { toUserMessage } from '../../../shared/lib/errorMessages';

interface SportsProps {
  user: User;
}

const BOW_TYPE_OPTIONS: { value: ArcheryBowType; label: string }[] = [
  { value: 'recurve', label: 'Recurvo' },
  { value: 'compound', label: 'Compuesto' },
  { value: 'barebow', label: 'Barebow' },
  { value: 'longbow', label: 'Longbow' }
];

const Sports: React.FC<SportsProps> = ({ user }) => {
  const { showToast, confirm } = useUI();
  const {
    sessions,
    stats,
    loading,
    error,
    startSession,
    deleteSession,
    refresh
  } = useSportSessions(user);

  const {
    activeSession,
    hasActiveSession,
    startSession: startActiveSession,
    addRound,
    addEnd,
    completeSession: completeActiveSession,
    abandonSession
  } = useActiveArcherySession();

  const showSkeleton = useDelayedLoading(loading, 180);
  const [activeTab, setActiveTab] = useState<'sessions' | 'stats'>('sessions');
  const [showSetup, setShowSetup] = useState(false);
  const [bowType, setBowType] = useState<ArcheryBowType>('recurve');
  const [arrowsUsed, setArrowsUsed] = useState(12);
  const [isStarting, setIsStarting] = useState(false);
  const [activeHiitConfig, setActiveHiitConfig] = useState<HiitConfig | null>(null);
  const [showHiitConfig, setShowHiitConfig] = useState(false);

  const handleStartSession = useCallback(async () => {
    setIsStarting(true);
    try {
      const session = await startSession('archery', {
        archeryConfig: { bowType, arrowsUsed }
      });
      startActiveSession(session, { bowType, arrowsUsed });
      setShowSetup(false);
      showToast('Sesión iniciada', 'success');
    } catch (err) {
      showToast(toUserMessage(err, 'Error iniciando sesión'), 'error');
    } finally {
      setIsStarting(false);
    }
  }, [startSession, startActiveSession, bowType, arrowsUsed, showToast]);

  const handleStartHiit = useCallback(async (config: HiitConfig) => {
    setIsStarting(true);
    try {
      await startSession('hiit', {
        hiitConfig: config
      });
      setActiveHiitConfig(config);
      setShowHiitConfig(false);
      showToast('Sesión HIIT iniciada', 'success');
    } catch (err) {
      showToast(toUserMessage(err, 'Error iniciando sesión HIIT'), 'error');
    } finally {
      setIsStarting(false);
    }
  }, [startSession, showToast]);

  const handleAddRound = useCallback(async (
    distance: number,
    targetSize: number,
    arrowsPerEnd: number
  ) => {
    if (!activeSession) return;
    await addRound(distance, targetSize, arrowsPerEnd);
  }, [activeSession, addRound]);

  const handleAddEnd = useCallback(async (
    roundId: string,
    arrows: { score: number; isGold: boolean }[]
  ) => {
    if (!activeSession) return;
    await addEnd(roundId, arrows);
  }, [activeSession, addEnd]);

  const handleCompleteSession = useCallback(async (notes?: string) => {
    if (!activeSession) return;
    await completeActiveSession(notes);
    refresh();
  }, [activeSession, completeActiveSession, refresh]);

  const handleCloseCompletedSession = useCallback(() => {
    abandonSession();
    refresh();
  }, [abandonSession, refresh]);

  const handleAbandonSession = useCallback(() => {
    abandonSession();
    showToast('Sesión abandonada', 'info');
  }, [abandonSession, showToast]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    confirm({
      title: 'Eliminar sesión',
      message: '¿Estás seguro de que quieres eliminar esta sesión permanentemente?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteSession(sessionId);
          showToast('Sesión eliminada', 'success');
        } catch (err) {
          showToast(toUserMessage(err, 'Error eliminando sesión'), 'error');
        }
      }
    });
  }, [confirm, deleteSession, showToast]);

  // Show active session
  if (hasActiveSession && activeSession) {
    return (
      <ArcherySession
        session={activeSession}
        onAddRound={handleAddRound}
        onAddEnd={handleAddEnd}
        onComplete={handleCompleteSession}
        onAbandon={handleAbandonSession}
        onBack={handleCloseCompletedSession}
      />
    );
  }

  // Show active HIIT session
  if (activeHiitConfig) {
    return (
      <HiitActive
        config={activeHiitConfig}
        onAbandon={() => setActiveHiitConfig(null)}
        onComplete={() => {
          setActiveHiitConfig(null);
          refresh();
          showToast('Sesión HIIT completada', 'success');
        }}
      />
    );
  }

  if (loading && showSkeleton) {
    return <PageSkeleton page="sports" />;
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const hasSessions = completedSessions.length > 0;

  return (
    <div className="app-shell pb-28">
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
        {/* Header */}
        <section className="motion-enter mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">
              Control de Rendimiento
            </div>
            <h1 className="mt-1 font-display text-2xl text-white sm:text-3xl">
              Deportes
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Registra y analiza tus sesiones de tiro con arco y otros deportes.
            </p>
          </div>

          <button
            onClick={() => setShowSetup(true)}
            className="btn-primary inline-flex items-center justify-center gap-2 self-start sm:self-auto"
            aria-label="Iniciar nueva sesión"
          >
            <Plus size={18} />
            <span>Nueva sesión</span>
          </button>
        </section>

        {/* Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="motion-dialog-panel w-full max-w-lg rounded-2xl border border-mist/60 bg-charcoal shadow-2xl p-6">
              <h2 className="text-xl font-display font-bold text-white mb-4">
                Nueva sesión de tiro con arco
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Tipo de arco</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BOW_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBowType(opt.value)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                          bowType === opt.value
                            ? 'bg-mint text-ink'
                            : 'bg-slateDeep text-slate-300 hover:bg-slateDeep/80'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 block mb-2">
                    Flechas disponibles: {arrowsUsed}
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    step="6"
                    value={arrowsUsed}
                    onChange={(e) => setArrowsUsed(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>6</span>
                    <span>12</span>
                    <span>18</span>
                    <span>24</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="flex-1 btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={isStarting}
                  className="flex-1 btn-primary"
                >
                  {isStarting ? 'Iniciando...' : 'Iniciar sesión'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HIIT Config Modal */}
        {showHiitConfig && (
          <HiitConfigPanel
            onStart={handleStartHiit}
            onClose={() => setShowHiitConfig(false)}
            isStarting={isStarting}
          />
        )}

        {/* Sports Selection */}
        <section className="motion-enter motion-enter-delay-1 mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Selecciona un deporte
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setShowSetup(true)}
              className="sport-card active motion-interactive"
            >
              <div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center">
                <Target size={24} className="text-mint" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-white">Tiro con Arco</div>
                <div className="text-xs text-slate-400 mt-1">
                  {stats?.totalSessions ?? 0} sesiones
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowHiitConfig(true)}
              className="sport-card active motion-interactive"
            >
              <div className="w-12 h-12 rounded-2xl bg-amberGlow/15 flex items-center justify-center">
                <Timer size={24} className="text-amberGlow" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-white">HIIT</div>
                <div className="text-xs text-slate-400 mt-1">
                  Temporizador
                </div>
              </div>
            </button>

            <div className="sport-card locked opacity-50">
              <div className="w-12 h-12 rounded-2xl bg-slateDeep flex items-center justify-center">
                <Calendar size={24} className="text-slate-500" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-400">Más deportes</div>
                <div className="text-xs text-slate-500 mt-1">En desarrollo</div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Summary */}
        {stats && (
          <section className="motion-enter motion-enter-delay-2 mb-5">
            <div className="app-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="section-title">Resumen</div>
                <div className="text-xs text-slate-400">Últimos 30 días</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="score-display-lg text-mint">{stats.totalSessions}</div>
                  <div className="score-label mt-1">Sesiones</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-amberGlow">{stats.totalArrowsShot}</div>
                  <div className="score-label mt-1">Flechas</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-white">{stats.averageScore}</div>
                  <div className="score-label mt-1">Promedio</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-mint">{stats.personalBest}</div>
                  <div className="score-label mt-1">Mejor</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <div className="motion-enter motion-enter-delay-2 mb-5 rounded-xl bg-crimson/10 border border-crimson/30 p-4">
            <div className="text-crimson text-sm">{error}</div>
            <button
              onClick={refresh}
              className="text-xs text-crimson/80 underline mt-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tabs */}
        <section className="motion-enter motion-enter-delay-3">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-mint/15 text-mint'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sesiones recientes
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-mint/15 text-mint'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Estadísticas
            </button>
          </div>

          {activeTab === 'sessions' && (
            <>
              {!hasSessions ? (
                <div className="app-card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-mint/10 flex items-center justify-center mx-auto mb-4">
                    <Target size={32} className="text-mint" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No hay sesiones aún
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                    Comienza registrando tu primera sesión de tiro con arco. Podrás llevar un control detallado de tus puntuaciones y progreso.
                  </p>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    <span>Iniciar primera sesión</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="app-card p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center">
                          <Target size={18} className="text-mint" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {session.startedAt.toLocaleDateString('es-ES', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{session.archeryData?.rounds.length ?? 0} rondas</span>
                            {session.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  {session.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-display font-bold text-white">
                            {session.archeryData?.totalScore ?? 0}
                          </div>
                          <div className="text-xs text-slate-400">
                            {session.archeryData?.averageArrow ?? 0} avg
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-2 text-slate-400 hover:text-crimson transition-colors"
                          aria-label="Eliminar sesión"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'stats' && stats && (
            <div className="space-y-3">
              <div className="app-card p-4">
                <div className="text-sm font-medium text-white mb-3">Estadísticas generales</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slateDeep/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Racha actual</div>
                    <div className="text-2xl font-display font-bold text-white">
                      {stats.currentStreak} días
                    </div>
                  </div>
                  <div className="bg-slateDeep/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Mejor racha</div>
                    <div className="text-2xl font-display font-bold text-white">
                      {stats.longestStreak} días
                    </div>
                  </div>
                  <div className="bg-slateDeep/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Esta semana</div>
                    <div className="text-2xl font-display font-bold text-mint">
                      {stats.thisWeekSessions}
                    </div>
                  </div>
                  <div className="bg-slateDeep/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Este mes</div>
                    <div className="text-2xl font-display font-bold text-mint">
                      {stats.thisMonthSessions}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Sports;
