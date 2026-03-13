import React from 'react';
import { Check, Clock, Weight, Plus, Minus, Play } from 'lucide-react';
import { Exercise, ExerciseLog, WorkoutSet, ExerciseVideo } from '../../../shared/types';
import { getCurrentDateString } from '../../../shared/lib/dateUtils';
import { vibrateLight, vibrateSuccess } from '../../../shared/lib/mobileFeedback';

const MAX_WEIGHT_KG = 2000;

const parseWeightInput = (rawValue: string): number | null => {
  const normalizedValue = rawValue.replace(',', '.').trim();

  if (normalizedValue === '') {
    return 0;
  }

  if (!/^\d{1,4}(\.\d)?$/.test(normalizedValue)) {
    return null;
  }

  const parsedWeight = Number(normalizedValue);
  if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > MAX_WEIGHT_KG) {
    return null;
  }

  return Number(parsedWeight.toFixed(1));
};

interface ExerciseCardProps {
  exercise: Exercise;
  log: ExerciseLog;
  userId: string;
  onUpdateLog: (log: ExerciseLog) => void;
  onStartTimer: (seconds: number) => void;
  previousWeights?: number[]; // Pesos de la sesión anterior
  exerciseNumber?: number;
  isCompleted?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  log,
  userId,
  onUpdateLog,
  onStartTimer,
  previousWeights,
  exerciseNumber,
  isCompleted = false
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

    const parsedWeight = parseWeightInput(rawValue);
    if (parsedWeight === null) {
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

    const parsedWeight = parseWeightInput(rawDraftValue);
    if (parsedWeight !== null) {
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

    if (!wasCompleted) {
      vibrateSuccess();
    } else {
      vibrateLight();
    }

    // Si se completó la serie y hay tiempo de descanso, iniciar temporizador
    if (!wasCompleted && exercise.restTime && exercise.restTime > 0) {
      onStartTimer(exercise.restTime);
    }
  };

  return (
    <div className={`app-card mb-3 p-3.5 sm:p-4 ${isCompleted ? 'border-mint/35 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(10,18,24,0.98))]' : ''}`}>
      {/* Header del ejercicio */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {exerciseNumber ? (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold ${isCompleted ? 'border-mint/50 bg-mint/12 text-mint' : 'border-mist/60 bg-white/[0.03] text-slate-200'}`}>
                {isCompleted ? <Check size={18} /> : exerciseNumber}
              </div>
            ) : null}
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white sm:text-[1.35rem]">{exercise.name}</h3>
              {isCompleted && (
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint">Ejercicio completado</div>
              )}
            </div>
            {exercise.video?.url && (
                <button
                  type="button"
                  onClick={() => setShowVideo((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors touch-target-sm ${showVideo
                    ? 'border-mint/70 text-mint bg-mint/10'
                    : 'border-mist/60 text-slate-300 hover:text-white hover:border-mint/50'
                    }`}
                >
                <Play size={12} />
                <span>{showVideo ? 'Ocultar video' : 'Ver video'}</span>
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-400">
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
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400">
          <span>{completedSets} de {exercise.sets} series completadas</span>
          {previousWeights && previousWeights.length > 0 && (
            <span className="text-mint">• Pesos precargados de tu último registro con peso</span>
          )}
        </div>
      </div>

      {/* Lista de series */}
      <div className="space-y-2.5">
        {Array.from({ length: exercise.sets }, (_, index) => {
          const setNumber = index + 1;
          const currentSet = currentSets.find(s => s.setNumber === setNumber);
          const isCompleted = currentSet?.completed || false;
          const weight = currentSet?.weight || 0;
          const draftWeight = draftWeights[setNumber];

          return (
            <div
              key={setNumber}
               className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-200 ${isCompleted
                 ? 'bg-mint/10 border-mint/50'
                 : 'bg-slateDeep border-mist/60 hover:border-mint/40'
                 }`}
            >
              {/* Numero de serie */}
               <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isCompleted ? 'bg-mint text-ink' : 'bg-charcoal text-slate-300'
                 }`}>
                {setNumber}
              </div>

              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <div className="flex items-center overflow-hidden rounded-lg border border-mist/60 bg-slateDeep">
                    <button
                      type="button"
                      onClick={() => adjustWeight(setNumber, -2.5)}
                      className="flex items-center justify-center px-2 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors border-r border-mist/60 touch-target-sm"
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
                        max={MAX_WEIGHT_KG}
                        aria-label={`Peso para serie ${setNumber}`}
                      />
                      {previousWeights && previousWeights[setNumber - 1] !== undefined && weight === previousWeights[setNumber - 1] && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-mint rounded-full translate-x-1/2 -translate-y-1/2" title="Peso anterior" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustWeight(setNumber, 2.5)}
                      className="flex items-center justify-center px-2 py-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors border-l border-mist/60 touch-target-sm"
                      aria-label="Aumentar peso 2.5kg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                   <span className="whitespace-nowrap text-xs text-slate-400 sm:text-sm">kg × {exercise.reps}</span>
                 </div>
               </div>

              <button
                type="button"
                onClick={() => toggleSetCompleted(setNumber)}
                 className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 touch-target ${isCompleted
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
         <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slateDeep px-3 py-2 text-sm text-slate-400">
           <Clock size={16} />
           <span>Descanso recomendado: {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}</span>
         </div>
      )}
    </div>
  );
});
