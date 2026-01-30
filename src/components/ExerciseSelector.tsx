import React, { useState } from 'react';
import { Plus, Search, ChevronDown, X, Loader, Play } from 'lucide-react';
import { useExerciseTemplates, ExerciseTemplate } from '../hooks/useExerciseTemplates';
import { useAuth } from '../hooks/useAuth';
import { Exercise, ExerciseVideo } from '../types';
import {
  fetchMusclewikiSuggestions,
  fetchMusclewikiVideos,
  type MusclewikiSuggestion
} from '../utils/musclewikiApi';

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise) => void;
  onCancel: () => void;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelectExercise,
  onCancel
}) => {
  const { user } = useAuth();

  const {
    exercises,
    loading,
    createExerciseTemplate,
    updateExerciseTemplate,
    incrementUsage,
    getCategories,
    searchExercises
  } = useExerciseTemplates(user?.id || '');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [videoSuggestions, setVideoSuggestions] = useState<MusclewikiSuggestion[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');

  // Estado para ejercicio personalizado
  const [customExercise, setCustomExercise] = useState({
    name: '',
    category: '',
    sets: 3,
    reps: 10,
    restTime: 90,
    description: ''
  });

  // Logging cuando el componente se monta/desmonta
  React.useEffect(() => {
    return () => {
    };
  }, []);

  // Obtener ejercicios filtrados
  const filteredExercises = searchExercises(searchTerm, selectedCategory);
  const categories = getCategories();
  const ownVideoCandidates = user?.id
    ? exercises.filter((exercise) => exercise.createdBy === user.id && !exercise.video).length
    : 0;

  const handleSelectTemplate = async (template: ExerciseTemplate) => {
    const exercise: Exercise = {
      id: `${template.id}_${Date.now()}`, // ID único para la rutina
      name: template.name,
      sets: template.sets,
      reps: template.reps,
      restTime: template.restTime,
      video: template.video
    };

    // Incrementar contador de uso
    await incrementUsage(template.id);
    onSelectExercise(exercise);
  };

  const handleCustomExercise = async () => {
    if (!customExercise.name.trim()) {
      setError('El nombre del ejercicio es requerido');
      return;
    }

    setCreatingExercise(true);
    setError(''); // Limpiar errores previos
    setSuccessMessage('');

    try {
      // Crear el template en la base de datos
      const templateId = await createExerciseTemplate(
        customExercise.name,
        customExercise.category || 'Personalizado',
        customExercise.sets,
        customExercise.reps,
        customExercise.restTime,
        customExercise.description,
        false, // No público por defecto
        selectedVideo ?? undefined
      );

      // Crear el ejercicio para la rutina
      const exercise: Exercise = {
        id: `${templateId}_${Date.now()}`,
        name: customExercise.name,
        sets: customExercise.sets,
        reps: customExercise.reps,
        restTime: customExercise.restTime,
        video: selectedVideo ?? undefined
      };

      // Mostrar mensaje de éxito
      setSuccessMessage(`¡Ejercicio "${customExercise.name}" creado y añadido exitosamente!`);

      // Limpiar el formulario
      setCustomExercise({
        name: '',
        category: '',
        sets: 3,
        reps: 10,
        restTime: 90,
        description: ''
      });
      setVideoSuggestions([]);
      setSelectedVideo(null);
      setVideoError('');

      onSelectExercise(exercise);

    } catch {
      setError('Error al crear el ejercicio. Por favor, intenta de nuevo.');
    } finally {
      setCreatingExercise(false);
    }
  };

  const handleSuggestVideos = async () => {
    if (!customExercise.name.trim()) {
      setVideoError('Escribe un nombre para buscar videos');
      return;
    }

    setVideoLoading(true);
    setVideoError('');
    setVideoSuggestions([]);
    setSelectedVideo(null);

    try {
      const suggestions = await fetchMusclewikiSuggestions(customExercise.name, 5);
      setVideoSuggestions(suggestions);
      if (suggestions.length === 0) {
        setVideoError('No se encontraron sugerencias para este nombre');
      }
    } catch {
      setVideoError('No pudimos buscar videos en este momento');
    } finally {
      setVideoLoading(false);
    }
  };

  const handlePickSuggestion = async (suggestion: MusclewikiSuggestion) => {
    setVideoLoading(true);
    setVideoError('');

    try {
      const data = await fetchMusclewikiVideos(suggestion.slug);
      setSelectedVideo({
        provider: 'musclewiki',
        slug: suggestion.slug,
        url: data.defaultVideoUrl,
        pageUrl: data.pageUrl
      });
    } catch {
      setVideoError('No pudimos obtener el video seleccionado');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleBackfillVideos = async () => {
    if (!user?.id || backfillRunning) return;

    const candidates = exercises.filter(
      (exercise) => exercise.createdBy === user.id && !exercise.video && exercise.name.trim()
    );

    if (candidates.length === 0) {
      setBackfillMessage('No hay ejercicios sin video para actualizar');
      return;
    }

    const threshold = 0.45;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    setBackfillRunning(true);
    setBackfillMessage(`Buscando videos... (0/${candidates.length})`);

    for (let index = 0; index < candidates.length; index += 1) {
      const exercise = candidates[index];
      setBackfillMessage(`Buscando videos... (${index + 1}/${candidates.length})`);

      try {
        const suggestions = await fetchMusclewikiSuggestions(exercise.name, 5);
        const best = suggestions[0];
        if (!best || best.score < threshold) {
          skipped += 1;
          continue;
        }

        const data = await fetchMusclewikiVideos(best.slug);
        const video: ExerciseVideo = {
          provider: 'musclewiki',
          slug: best.slug,
          url: data.defaultVideoUrl,
          pageUrl: data.pageUrl
        };
        await updateExerciseTemplate(exercise.id, { video });
        updated += 1;
      } catch {
        failed += 1;
      }
    }

    const parts = [`${updated} actualizados`, `${skipped} omitidos`];
    if (failed > 0) parts.push(`${failed} errores`);
    setBackfillMessage(`Listo: ${parts.join(', ')}.`);
    setBackfillRunning(false);
  };

  if (!user?.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="app-card p-6 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-mint" size={32} />
          <p className="text-white">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="app-card p-6 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-mint" size={32} />
          <p className="text-white">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="app-card w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-mist/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Añadir Ejercicio</h3>
            <button
              type="button"
              onClick={() => {
                onCancel();
              }}
              className="btn-ghost"
            >
              <X size={20} />
            </button>
          </div>

          {/* Pestañas */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${!showCustomForm
                  ? 'bg-mint/15 text-mint'
                  : 'bg-slateDeep text-slate-300 hover:text-white'
                }`}
            >
              Ejercicios ({exercises.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${showCustomForm
                  ? 'bg-mint/15 text-mint'
                  : 'bg-slateDeep text-slate-300 hover:text-white'
                }`}
            >
              Crear Nuevo
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {!showCustomForm ? (
            <div className="p-4">
              {/* Filtros */}
              <div className="space-y-3 mb-4">
                {/* Buscador */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar ejercicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10 text-sm"
                  />
                </div>

                {/* Selector de categoría */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input text-sm appearance-none cursor-pointer"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {user?.id && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{ownVideoCandidates} ejercicios sin video</span>
                    <button
                      type="button"
                      onClick={handleBackfillVideos}
                      disabled={backfillRunning || ownVideoCandidates === 0}
                      className="btn-ghost text-xs disabled:opacity-60"
                    >
                      {backfillRunning ? 'Actualizando...' : 'Auto videos'}
                    </button>
                  </div>
                )}

                {backfillMessage && (
                  <div className="text-xs text-slate-400">
                    {backfillMessage}
                  </div>
                )}
              </div>

              {/* Lista de ejercicios */}
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => handleSelectTemplate(exercise)}
                    className="w-full p-3 bg-slateDeep hover:bg-charcoal rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-medium">{exercise.name}</h4>
                        <div className="flex items-center text-xs text-slate-400 space-x-2">
                          <span>{exercise.category}</span>
                          {exercise.timesUsed > 0 && (
                            <>
                              <span>•</span>
                              <span>Usado {exercise.timesUsed} veces</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {exercise.sets} x {exercise.reps}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredExercises.length === 0 && !loading && (
                  <div className="text-center py-8 text-slate-400">
                    <p>No se encontraron ejercicios</p>
                    <p className="text-xs mt-1">Crea uno nuevo usando la pestaña "Crear Nuevo"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Formulario para crear nuevo ejercicio */
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nombre del ejercicio *</label>
                  <input
                    type="text"
                    value={customExercise.name}
                    onChange={(e) => {
                      setCustomExercise({ ...customExercise, name: e.target.value });
                      if (error) setError(''); // Limpiar error cuando el usuario empieza a escribir
                      if (successMessage) setSuccessMessage(''); // Limpiar mensaje de exito
                      if (videoSuggestions.length > 0 || selectedVideo) {
                        setVideoSuggestions([]);
                        setSelectedVideo(null);
                      }
                      if (videoError) setVideoError('');
                    }}
                    className="input text-sm"
                    placeholder="Ej: Press de banca"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-500 rounded-md p-3 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="bg-mint/10 border border-mint rounded-md p-3 text-mint text-sm">
                    {successMessage}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={customExercise.category}
                    onChange={(e) => setCustomExercise({ ...customExercise, category: e.target.value })}
                    className="input text-sm"
                    placeholder="Ej: Pecho, Espalda, Piernas..."
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={customExercise.description}
                    onChange={(e) => setCustomExercise({ ...customExercise, description: e.target.value })}
                    className="input text-sm"
                    placeholder="Describe como hacer el ejercicio..."
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm text-slate-300">Video (MuscleWiki)</label>
                    <button
                      type="button"
                      onClick={handleSuggestVideos}
                      disabled={!customExercise.name.trim() || videoLoading}
                      className="btn-ghost text-xs disabled:opacity-60"
                    >
                      Buscar sugerencias
                    </button>
                  </div>

                  {videoError && (
                    <div className="bg-amberGlow/10 border border-amberGlow/40 rounded-md p-3 text-amberGlow text-xs">
                      {videoError}
                    </div>
                  )}

                  {videoLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader size={14} className="animate-spin" />
                      <span>Buscando videos...</span>
                    </div>
                  )}

                  {videoSuggestions.length > 0 && (
                    <div className="space-y-2">
                      {videoSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.slug}
                          type="button"
                          onClick={() => handlePickSuggestion(suggestion)}
                          className="w-full px-3 py-2 rounded-xl bg-slateDeep hover:bg-charcoal text-left transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Play size={14} className="text-mint" />
                            <span className="text-sm text-white">{suggestion.displayName}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {Math.min(100, Math.round(suggestion.score * 100))}%
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedVideo && (
                    <div className="space-y-2">
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                        <video
                          className="h-full w-full"
                          src={selectedVideo.url}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <a
                          href={selectedVideo.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-mint hover:text-mintDeep"
                        >
                          Abrir en MuscleWiki
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedVideo(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          Quitar video
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Series</label>
                    <input
                      type="number"
                      value={customExercise.sets}
                      onChange={(e) => setCustomExercise({ ...customExercise, sets: parseInt(e.target.value) || 1 })}
                      className="input input-sm text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Reps</label>
                    <input
                      type="number"
                      value={customExercise.reps}
                      onChange={(e) => setCustomExercise({ ...customExercise, reps: parseInt(e.target.value) || 1 })}
                      className="input input-sm text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      value={customExercise.restTime}
                      onChange={(e) => setCustomExercise({ ...customExercise, restTime: parseInt(e.target.value) || 30 })}
                      className="input input-sm text-sm"
                      min="30"
                      step="30"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowCustomForm(false);
                      setError('');
                      setSuccessMessage('');
                      setCustomExercise({
                        name: '',
                        category: '',
                        sets: 3,
                        reps: 10,
                        restTime: 90,
                        description: ''
                      });
                      setVideoSuggestions([]);
                      setSelectedVideo(null);
                      setVideoError('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleCustomExercise}
                    disabled={!customExercise.name.trim() || creatingExercise}
                    className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {creatingExercise ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Crear y Añadir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
