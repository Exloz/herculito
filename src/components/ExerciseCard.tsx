import React from 'react';
import { Check, Clock, Weight, Plus, Minus, Play } from 'lucide-react';
import { Exercise, ExerciseLog, WorkoutSet, ExerciseVideo } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  userId: string;
  onUpdateLog: (log: ExerciseLog) => void;
  onStartTimer: (seconds: number) => void;
  previousWeights?: number[]; // Pesos de la sesión anterior
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  log,
  userId,
  onUpdateLog,
  onStartTimer,
  previousWeights
}) => {
  const [showVideo, setShowVideo] = React.useState(false);
  const [draftWeights, setDraftWeights] = React.useState<Record<number, string>>({});

  const currentSets = React.useMemo((): WorkoutSet[] => {
    const normalizedBySetNumber = new Map<number, WorkoutSet>();

    log.sets.forEach((set) => {
      const setNumber = Number(set.setNumber);
      if (!Number.isInteger(setNumber)) return;
      if (setNumber < 1 || setNumber > exercise.sets) return;
      normalizedBySetNumber.set(setNumber, set);
    });

    const sets: WorkoutSet[] = [];
    for (let i = 1; i <= exercise.sets; i++) {
      const existingSet = normalizedBySetNumber.get(i);
      if (existingSet) {
        sets.push(existingSet);
        continue;
      }

      const previousWeight = previousWeights && previousWeights[i - 1] !== undefined
        ? previousWeights[i - 1]
        : 0;

      sets.push({
        setNumber: i,
        weight: previousWeight,
        completed: false
      });
    }

    return sets;
  }, [exercise.sets, log.sets, previousWeights]);

  const getVideoUrls = (video: ExerciseVideo) => {
    const variants = video.variants ?? [];
    const frontVariant = variants.find((variant) => variant.kind.includes('front'));
    const sideVariant = variants.find((variant) => variant.kind.includes('side'));
    const detectView = (url: string) => {
      if (url.includes('-front')) return 'front';
      if (url.includes('-side')) return 'side';
      return 'unknown';
    };

    const detectedView = detectView(video.url);
    const frontCandidate = frontVariant?.url ?? (detectedView === 'front' ? video.url : undefined);
    const sideCandidate = sideVariant?.url ?? (detectedView === 'side' ? video.url : undefined);
    const fallbackSource = frontCandidate ?? sideCandidate ?? video.url;

    const frontUrl = frontCandidate
      ?? (fallbackSource.includes('-side') ? fallbackSource.replace('-side', '-front') : fallbackSource);
    let sideUrl = sideCandidate
      ?? (fallbackSource.includes('-front') ? fallbackSource.replace('-front', '-side') : undefined);

    if (sideUrl === frontUrl) {
      sideUrl = undefined;
    }

    return { frontUrl, sideUrl };
  };

  const completedSets = currentSets.filter(s => s.completed).length;
  const progressPercentage = exercise.sets > 0
    ? Math.min(100, (completedSets / exercise.sets) * 100)
    : 0;

  const updateSetWeight = (setNumber: number, weight: number) => {
    const updatedSets = currentSets.map(set =>
      set.setNumber === setNumber ? { ...set, weight } : set
    );

    const updatedLog: ExerciseLog = {
      exerciseId: exercise.id,
      userId,
      date: getCurrentDateString(),
      sets: updatedSets
    };

    onUpdateLog(updatedLog);
  };

  const clearDraftWeight = (setNumber: number) => {
    setDraftWeights((previousDrafts) => {
      if (!(setNumber in previousDrafts)) {
        return previousDrafts;
      }

      const nextDrafts = { ...previousDrafts };
      delete nextDrafts[setNumber];
      return nextDrafts;
    });
  };

  const handleWeightChange = (setNumber: number, rawValue: string) => {
    setDraftWeights((previousDrafts) => ({
      ...previousDrafts,
      [setNumber]: rawValue
    }));

    if (rawValue.trim() === '') {
      return;
    }

    const parsedWeight = Number(rawValue);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      return;
    }

    updateSetWeight(setNumber, parsedWeight);
  };

  const handleWeightBlur = (setNumber: number) => {
    const rawDraftValue = draftWeights[setNumber];

    if (rawDraftValue === undefined) {
      return;
    }

    if (rawDraftValue.trim() === '') {
      updateSetWeight(setNumber, 0);
      clearDraftWeight(setNumber);
      return;
    }

    const parsedWeight = Number(rawDraftValue);
    if (Number.isFinite(parsedWeight) && parsedWeight >= 0) {
      updateSetWeight(setNumber, parsedWeight);
    }

    clearDraftWeight(setNumber);
  };

  const adjustWeight = (setNumber: number, delta: number) => {
    const set = currentSets.find(s => s.setNumber === setNumber);
    const currentWeight = set?.weight || 0;
    const newWeight = Math.max(0, currentWeight + delta);
    updateSetWeight(setNumber, Number(newWeight.toFixed(1)));
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
      date: getCurrentDateString(),
      sets: updatedSets
    };

    onUpdateLog(updatedLog);

    // Si se completó la serie y hay tiempo de descanso, iniciar temporizador
    if (!wasCompleted && exercise.restTime && exercise.restTime > 0) {
      onStartTimer(exercise.restTime);
    }
  };

  return (
    <div className="app-card p-4 mb-4">
      {/* Header del ejercicio */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{exercise.name}</h3>
            {exercise.video?.url && (
              <button
                type="button"
                onClick={() => setShowVideo((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${showVideo
                  ? 'border-mint/70 text-mint bg-mint/10'
                  : 'border-mist/60 text-slate-300 hover:text-white hover:border-mint/50'
                  }`}
              >
                <Play size={12} />
                <span>{showVideo ? 'Ocultar video' : 'Ver video'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-400 shrink-0">
            <Weight size={16} />
            <span>{exercise.sets} × {exercise.reps}</span>
          </div>
        </div>


        {exercise.video?.url && showVideo && (
          <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {(() => {
              const { frontUrl, sideUrl } = getVideoUrls(exercise.video);
              return (
                <div className={`grid gap-3 ${sideUrl ? 'sm:grid-cols-2' : ''}`}>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Vista frontal</div>
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                      <video
                        className="h-full w-full"
                        src={frontUrl}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  </div>
                  {sideUrl && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Vista lateral</div>
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                        <video
                          className="h-full w-full"
                          src={sideUrl}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="text-xs text-slate-400">
              <a
                href={exercise.video.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-mint hover:text-mintDeep"
              >
                Abrir en MuscleWiki
              </a>
            </div>
          </div>
        )}


        {/* Barra de progreso */}
        <div className="w-full bg-slateDeep rounded-full h-2 mb-2">
          <div
            className="bg-mint h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-sm text-slate-400">
          {completedSets} de {exercise.sets} series completadas
          {/* Información sobre pesos anteriores */}
          {previousWeights && previousWeights.length > 0 && (
            <span className="ml-2 text-mint">
              • Pesos precargados de la sesión anterior
            </span>
          )}
        </div>
      </div>

      {/* Lista de series */}
      <div className="space-y-3">
        {Array.from({ length: exercise.sets }, (_, index) => {
          const setNumber = index + 1;
          const currentSet = currentSets.find(s => s.setNumber === setNumber);
          const isCompleted = currentSet?.completed || false;
          const weight = currentSet?.weight || 0;
          const draftWeight = draftWeights[setNumber];

          return (
            <div
              key={setNumber}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${isCompleted
                ? 'bg-mint/10 border-mint/50'
                : 'bg-slateDeep border-mist/60 hover:border-mint/40'
                }`}
            >
              {/* Numero de serie */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted ? 'bg-mint text-ink' : 'bg-charcoal text-slate-300'
                }`}>
                {setNumber}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slateDeep rounded-lg border border-mist/60 overflow-hidden">
                    <button
                      onClick={() => adjustWeight(setNumber, -2.5)}
                      className="flex items-center justify-center px-2 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors border-r border-mist/60"
                      aria-label="Reducir peso 2.5kg"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        value={draftWeight !== undefined ? draftWeight : (Number.isFinite(weight) ? String(weight) : '')}
                        onChange={(e) => handleWeightChange(setNumber, e.target.value)}
                        onBlur={() => handleWeightBlur(setNumber)}
                        className="w-16 bg-transparent text-center text-sm font-medium focus:outline-none py-1"
                        placeholder="0"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        aria-label={`Peso para serie ${setNumber}`}
                      />
                      {previousWeights && previousWeights[setNumber - 1] !== undefined && weight === previousWeights[setNumber - 1] && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-mint rounded-full translate-x-1/2 -translate-y-1/2" title="Peso anterior" />
                      )}
                    </div>
                    <button
                      onClick={() => adjustWeight(setNumber, 2.5)}
                      className="flex items-center justify-center px-2 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors border-l border-mist/60"
                      aria-label="Aumentar peso 2.5kg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">kg × {exercise.reps}</span>
                </div>
              </div>

              <button
                onClick={() => toggleSetCompleted(setNumber)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${isCompleted
                  ? 'bg-mint text-ink hover:bg-mintDeep'
                  : 'bg-charcoal text-slate-300 hover:bg-slateDeep border border-mist/60'
                  }`}
                aria-label={isCompleted ? "Marcar serie como incompleta" : "Marcar serie como completada"}
              >
                <Check size={20} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Información de descanso */}
      {exercise.restTime && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 bg-slateDeep rounded-xl p-2">
          <Clock size={16} />
          <span>Descanso recomendado: {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
});
