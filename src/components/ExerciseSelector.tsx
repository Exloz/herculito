import React, { useState } from 'react';
import { Plus, Search, ChevronDown, X, Loader } from 'lucide-react';
import { useExerciseTemplates, ExerciseTemplate } from '../hooks/useExerciseTemplates';
import { useAuth } from '../hooks/useAuth';
import { Exercise } from '../types';

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

  const handleSelectTemplate = async (template: ExerciseTemplate) => {
    const exercise: Exercise = {
      id: `${template.id}_${Date.now()}`, // ID único para la rutina
      name: template.name,
      sets: template.sets,
      reps: template.reps,
      restTime: template.restTime
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
        false // No público por defecto
      );

      // Crear el ejercicio para la rutina
      const exercise: Exercise = {
        id: `${templateId}_${Date.now()}`,
        name: customExercise.name,
        sets: customExercise.sets,
        reps: customExercise.reps,
        restTime: customExercise.restTime
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

      onSelectExercise(exercise);
      
    } catch (error) {
      console.error('Error en handleCustomExercise:', error);
      setError('Error al crear el ejercicio. Por favor, intenta de nuevo.');
    } finally {
      setCreatingExercise(false);
    }
  };

  if (!user?.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-400" size={32} />
          <p className="text-white">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-400" size={32} />
          <p className="text-white">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Añadir Ejercicio</h3>
            <button
              type="button"
              onClick={() => {
                onCancel();
              }}
              className="text-gray-400 hover:text-white transition-colors"
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
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                !showCustomForm 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                showCustomForm 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar ejercicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>

                {/* Selector de categoría */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none cursor-pointer"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Lista de ejercicios */}
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => handleSelectTemplate(exercise)}
                    className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-md text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-medium">{exercise.name}</h4>
                        <div className="flex items-center text-xs text-gray-400 space-x-2">
                          <span>{exercise.category}</span>
                          {exercise.timesUsed > 0 && (
                            <>
                              <span>•</span>
                              <span>Usado {exercise.timesUsed} veces</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {exercise.sets} x {exercise.reps}
                      </div>
                    </div>
                  </button>
                ))}

                {filteredExercises.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-400">
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
                  <label className="block text-sm text-gray-300 mb-1">Nombre del ejercicio *</label>
                  <input
                    type="text"
                    value={customExercise.name}
                    onChange={(e) => {
                      setCustomExercise({...customExercise, name: e.target.value});
                      if (error) setError(''); // Limpiar error cuando el usuario empieza a escribir
                      if (successMessage) setSuccessMessage(''); // Limpiar mensaje de éxito
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                  <div className="bg-green-900/50 border border-green-500 rounded-md p-3 text-green-200 text-sm">
                    {successMessage}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={customExercise.category}
                    onChange={(e) => setCustomExercise({...customExercise, category: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                  <label className="block text-sm text-gray-300 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={customExercise.description}
                    onChange={(e) => setCustomExercise({...customExercise, description: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Describe cómo hacer el ejercicio..."
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Series</label>
                    <input
                      type="number"
                      value={customExercise.sets}
                      onChange={(e) => setCustomExercise({...customExercise, sets: parseInt(e.target.value) || 1})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Reps</label>
                    <input
                      type="number"
                      value={customExercise.reps}
                      onChange={(e) => setCustomExercise({...customExercise, reps: parseInt(e.target.value) || 1})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      value={customExercise.restTime}
                      onChange={(e) => setCustomExercise({...customExercise, restTime: parseInt(e.target.value) || 30})}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                    }}
                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleCustomExercise}
                    disabled={!customExercise.name.trim() || creatingExercise}
                    className="flex-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center justify-center space-x-2"
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