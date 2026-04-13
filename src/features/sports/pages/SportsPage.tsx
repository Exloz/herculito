import React, { useState, useCallback } from 'react';
import { Target, Plus, Calendar, Timer, TrendingUp, Flame } from 'lucide-react';
import type { User, ArcheryBowType, HiitConfig, SportSession } from '../../../shared/types';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { useDelayedLoading } from '../../../shared/hooks/useDelayedLoading';
import { useSportSessions } from '../hooks/useSportSessions';
import { useActiveArcherySession } from '../hooks/useActiveArcherySession';
import { ArcherySession } from '../components/archery/ArcherySession';
import { SessionSummary } from '../components/archery/SessionSummary';
import { HiitConfig as HiitConfigPanel } from '../components/hiit/HiitConfig';
import { HiitActive } from '../components/hiit/HiitActive';
import { HiitSessionSummary } from '../components/hiit/HiitSessionSummary';
import { SportSessionCard } from '../components/SportSessionCard';
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

const formatMinutes = (mins: number | undefined): string => {
  if (!mins) return '--';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

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
  const [selectedSession, setSelectedSession] = useState<SportSession | null>(null);

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

  // Check for sport-specific data
  const hasArcheryStats = stats && (stats.totalArrowsShot != null || stats.averageScore != null);
  const hasHiitStats = stats && (stats.totalHiitIntervals != null || stats.totalHiitWorkTime != null);

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
              Registra y analiza tus sesiones deportivas.
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
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
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

        {/* Session Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
            <div className="motion-dialog-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-mist/60 bg-charcoal shadow-2xl p-6">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="mb-4 text-sm text-slate-400 hover:text-white transition-colors"
              >
                ← Volver
              </button>
              {selectedSession.sportType === 'archery' ? (
                <SessionSummary session={selectedSession} onClose={() => setSelectedSession(null)} />
              ) : selectedSession.sportType === 'hiit' ? (
                <HiitSessionSummary session={selectedSession} onClose={() => setSelectedSession(null)} />
              ) : null}
            </div>
          </div>
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

        {/* Stats Summary — Generic */}
        {stats && (
          <section className="motion-enter motion-enter-delay-2 mb-5">
            <div className="app-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="section-title">Resumen</div>
                <div className="text-xs text-slate-400">Últimos 30 días</div>
              </div>

              {/* Generic stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="score-display-lg text-mint">{stats.totalSessions}</div>
                  <div className="score-label mt-1">Sesiones</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-amberGlow">{formatMinutes(stats.totalDuration)}</div>
                  <div className="score-label mt-1">Duración</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-white">{stats.thisWeekSessions}</div>
                  <div className="score-label mt-1">Esta semana</div>
                </div>
                <div className="text-center">
                  <div className="score-display-lg text-white">{stats.currentStreak} días</div>
                  <div className="score-label mt-1">Racha</div>
                </div>
              </div>

              {/* Archery-specific stats */}
              {hasArcheryStats && (
                <div className="border-t border-mist/20 pt-3 mt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-mint" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tiro con Arco</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {stats.totalArrowsShot != null && (
                      <div className="text-center">
                        <div className="text-lg font-display font-bold text-white">{stats.totalArrowsShot}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Flechas</div>
                      </div>
                    )}
                    {stats.averageScore != null && (
                      <div className="text-center">
                        <div className="text-lg font-display font-bold text-white">{stats.averageScore}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Promedio</div>
                      </div>
                    )}
                    {stats.personalBest != null && (
                      <div className="text-center">
                        <div className="text-lg font-display font-bold text-mint">{stats.personalBest}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Mejor</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HIIT-specific stats */}
              {hasHiitStats && (
                <div className="border-t border-mist/20 pt-3 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame size={14} className="text-amberGlow" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HIIT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.totalHiitIntervals != null && (
                      <div className="text-center">
                        <div className="text-lg font-display font-bold text-white">{stats.totalHiitIntervals}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Intervalos</div>
                      </div>
                    )}
                    {stats.totalHiitWorkTime != null && (
                      <div className="text-center">
                        <div className="text-lg font-display font-bold text-amberGlow">
                          {Math.round(stats.totalHiitWorkTime / 60)}m
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Tiempo trabajo</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                    <TrendingUp size={32} className="text-mint" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No hay sesiones aún
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                    Comienza registrando tu primera sesión deportiva. Lleva control de tu progreso y rendimiento.
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
                    <SportSessionCard
                      key={session.id}
                      session={session}
                      onDelete={handleDeleteSession}
                      onClick={setSelectedSession}
                    />
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

              {hasArcheryStats && (
                <div className="app-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-mint" />
                    <span className="text-sm font-medium text-white">Tiro con Arco</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {stats.totalArrowsShot != null && (
                      <div className="bg-slateDeep/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400">Flechas</div>
                        <div className="text-xl font-display font-bold text-white">{stats.totalArrowsShot}</div>
                      </div>
                    )}
                    {stats.averageScore != null && (
                      <div className="bg-slateDeep/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400">Promedio</div>
                        <div className="text-xl font-display font-bold text-white">{stats.averageScore}</div>
                      </div>
                    )}
                    {stats.personalBest != null && (
                      <div className="bg-slateDeep/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400">Mejor</div>
                        <div className="text-xl font-display font-bold text-mint">{stats.personalBest}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasHiitStats && (
                <div className="app-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={16} className="text-amberGlow" />
                    <span className="text-sm font-medium text-white">HIIT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.totalHiitIntervals != null && (
                      <div className="bg-slateDeep/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400">Intervalos</div>
                        <div className="text-xl font-display font-bold text-white">{stats.totalHiitIntervals}</div>
                      </div>
                    )}
                    {stats.totalHiitWorkTime != null && (
                      <div className="bg-slateDeep/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400">Tiempo trabajo</div>
                        <div className="text-xl font-display font-bold text-amberGlow">
                          {Math.round(stats.totalHiitWorkTime / 60)}m
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Sports;