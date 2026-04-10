import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Edit3, Scale, Ruler, Activity, Save, X } from 'lucide-react';
import type { User, UserBodyMeasurement } from '../../../shared/types';
import { useProfileData } from '../hooks/useProfileData';
import { useUI } from '../../../app/providers/ui-context';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { formatDateValue } from '../../../shared/lib/intl';

interface ProfilePageProps {
  user: User;
  onBack: () => void;
}

type MeasurementFormData = {
  id?: string;
  measuredAt: string;
  weightKg: string;
  heightCm: string;
  bodyFatPercentage: string;
  waistCm: string;
  hipsCm: string;
  chestCm: string;
  armsCm: string;
  thighsCm: string;
  calvesCm: string;
  notes: string;
};

const emptyFormData: MeasurementFormData = {
  measuredAt: new Date().toISOString().slice(0, 10),
  weightKg: '',
  heightCm: '',
  bodyFatPercentage: '',
  waistCm: '',
  hipsCm: '',
  chestCm: '',
  armsCm: '',
  thighsCm: '',
  calvesCm: '',
  notes: ''
};

const toFormData = (measurement: UserBodyMeasurement): MeasurementFormData => ({
  id: measurement.id,
  measuredAt: measurement.measuredAt.toISOString().slice(0, 10),
  weightKg: measurement.weightKg?.toString() ?? '',
  heightCm: measurement.heightCm?.toString() ?? '',
  bodyFatPercentage: measurement.bodyFatPercentage?.toString() ?? '',
  waistCm: measurement.waistCm?.toString() ?? '',
  hipsCm: measurement.hipsCm?.toString() ?? '',
  chestCm: measurement.chestCm?.toString() ?? '',
  armsCm: measurement.armsCm?.toString() ?? '',
  thighsCm: measurement.thighsCm?.toString() ?? '',
  calvesCm: measurement.calvesCm?.toString() ?? '',
  notes: measurement.notes ?? ''
});

const parseNumberInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack }) => {
  const { measurements, loading, refreshing, saving, error, refresh, saveMeasurement, removeMeasurement } = useProfileData(user.id);
  const { showToast, confirm } = useUI();
  const [showForm, setShowForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<UserBodyMeasurement | null>(null);
  const [formData, setFormData] = useState<MeasurementFormData>(emptyFormData);

  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  const handleAddNew = useCallback(() => {
    setEditingMeasurement(null);
    setFormData(emptyFormData);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((measurement: UserBodyMeasurement) => {
    setEditingMeasurement(measurement);
    setFormData(toFormData(measurement));
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingMeasurement(null);
    setFormData(emptyFormData);
  }, []);

  const handleFormChange = useCallback((field: keyof MeasurementFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const measuredAtDate = new Date(formData.measuredAt);
    if (Number.isNaN(measuredAtDate.getTime())) {
      showToast('Fecha inválida', 'error');
      return;
    }

    const payload = {
      id: editingMeasurement?.id,
      measuredAt: measuredAtDate.getTime(),
      weightKg: parseNumberInput(formData.weightKg),
      heightCm: parseNumberInput(formData.heightCm),
      bodyFatPercentage: parseNumberInput(formData.bodyFatPercentage),
      waistCm: parseNumberInput(formData.waistCm),
      hipsCm: parseNumberInput(formData.hipsCm),
      chestCm: parseNumberInput(formData.chestCm),
      armsCm: parseNumberInput(formData.armsCm),
      thighsCm: parseNumberInput(formData.thighsCm),
      calvesCm: parseNumberInput(formData.calvesCm),
      notes: formData.notes.trim() || null
    };

    const success = await saveMeasurement(payload);
    if (success) {
      showToast(editingMeasurement ? 'Medición actualizada' : 'Medición guardada', 'success');
      setShowForm(false);
      setEditingMeasurement(null);
      setFormData(emptyFormData);
    }
  }, [formData, editingMeasurement, saveMeasurement, showToast]);

  const handleDelete = useCallback((measurement: UserBodyMeasurement) => {
    confirm({
      title: 'Eliminar medición',
      message: '¿Estás seguro de que quieres eliminar esta medición? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        const success = await removeMeasurement(measurement.id);
        if (success) {
          showToast('Medición eliminada', 'success');
        }
      }
    });
  }, [confirm, removeMeasurement, showToast]);

  const hasFormChanges = useMemo(() => {
    if (!editingMeasurement) {
      return Object.values(formData).some((v) => v !== '' && v !== emptyFormData.measuredAt);
    }
    const original = toFormData(editingMeasurement);
    return Object.keys(formData).some((key) => {
      const k = key as keyof MeasurementFormData;
      return formData[k] !== original[k];
    });
  }, [formData, editingMeasurement]);

  const latestMeasurement = useMemo(() => {
    return measurements.length > 0 ? measurements[0] : null;
  }, [measurements]);

  if (loading) {
    return <PageSkeleton page="profile" />;
  }

  return (
    <div className="app-shell pb-28">
      {/* Header */}
      <header className="app-header px-4 pb-4 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-5 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="btn-secondary flex h-11 w-11 items-center justify-center rounded-[1rem] px-0 touch-target"
              aria-label="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-mint/80">Perfil</div>
              <h1 className="font-display text-[1.75rem] leading-none text-white sm:text-[2rem]">Mis Medidas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {error && (
          <div className="motion-enter mb-4 rounded-[1.2rem] border border-crimson/45 bg-crimson/10 px-4 py-3 text-sm text-red-200">
            {error}
            <button
              onClick={() => void refresh()}
              disabled={refreshing}
              className="ml-2 text-mint underline disabled:opacity-60"
            >
              {refreshing ? 'Actualizando...' : 'Reintentar'}
            </button>
          </div>
        )}

        {/* Summary Card */}
        {latestMeasurement && !showForm && (
          <section className="motion-enter mb-6 overflow-hidden rounded-[1.45rem] border border-mint/20 bg-gradient-to-br from-mint/10 to-transparent px-4 py-4 shadow-lift sm:px-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">
              <Scale size={14} />
              <span>Última medición</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {latestMeasurement.weightKg && (
                <div className="rounded-[0.95rem] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Peso</div>
                  <div className="mt-1 text-lg font-semibold text-white">{latestMeasurement.weightKg} kg</div>
                </div>
              )}
              {latestMeasurement.heightCm && (
                <div className="rounded-[0.95rem] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Altura</div>
                  <div className="mt-1 text-lg font-semibold text-white">{latestMeasurement.heightCm} cm</div>
                </div>
              )}
              {latestMeasurement.bodyFatPercentage && (
                <div className="rounded-[0.95rem] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">% Grasa</div>
                  <div className="mt-1 text-lg font-semibold text-white">{latestMeasurement.bodyFatPercentage}%</div>
                </div>
              )}
              {latestMeasurement.waistCm && (
                <div className="rounded-[0.95rem] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Cintura</div>
                  <div className="mt-1 text-lg font-semibold text-white">{latestMeasurement.waistCm} cm</div>
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Medido el {formatDateValue(latestMeasurement.measuredAt, { dateStyle: 'medium' })}
            </div>
          </section>
        )}

        {/* Add New Button */}
        {!showForm && (
          <section className="motion-enter motion-enter-delay-1 mb-6">
            <button
              onClick={handleAddNew}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Plus size={18} />
              <span>Agregar medición</span>
            </button>
          </section>
        )}

        {/* Form */}
        {showForm && (
          <section className="motion-dialog-panel mb-6 rounded-[1.45rem] border border-mist/60 bg-charcoal p-4 shadow-lift sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-white">
                {editingMeasurement ? 'Editar medición' : 'Nueva medición'}
              </h2>
              <button
                onClick={handleCancelForm}
                className="btn-ghost h-9 w-9 rounded-xl p-0"
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Fecha de medición <span className="text-crimson">*</span>
                </label>
                <input
                  type="date"
                  value={formData.measuredAt}
                  onChange={(e) => handleFormChange('measuredAt', e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.weightKg}
                    onChange={(e) => handleFormChange('weightKg', e.target.value)}
                    className="input"
                    placeholder="Ej: 75.5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="300"
                    value={formData.heightCm}
                    onChange={(e) => handleFormChange('heightCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 175"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">% Grasa corporal</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.bodyFatPercentage}
                    onChange={(e) => handleFormChange('bodyFatPercentage', e.target.value)}
                    className="input"
                    placeholder="Ej: 15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.waistCm}
                    onChange={(e) => handleFormChange('waistCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 85"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Cadera (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.hipsCm}
                    onChange={(e) => handleFormChange('hipsCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 95"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Pecho (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.chestCm}
                    onChange={(e) => handleFormChange('chestCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Brazos (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.armsCm}
                    onChange={(e) => handleFormChange('armsCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 35"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Muslos (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.thighsCm}
                    onChange={(e) => handleFormChange('thighsCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 55"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Pantorrillas (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={formData.calvesCm}
                    onChange={(e) => handleFormChange('calvesCm', e.target.value)}
                    className="input"
                    placeholder="Ej: 38"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="input min-h-[80px] resize-none"
                  placeholder="Notas adicionales..."
                  maxLength={500}
                />
                <div className="mt-1 text-right text-[10px] text-slate-500">
                  {formData.notes.length}/500
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelForm}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="btn-primary flex flex-1 items-center justify-center gap-2"
                  disabled={saving || !hasFormChanges}
                >
                  {saving ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Measurements List */}
        {!showForm && measurements.length > 0 && (
          <section className="motion-enter motion-enter-delay-2">
            <h2 className="mb-4 font-display text-lg text-white">Historial de mediciones</h2>
            <div className="space-y-3">
              {measurements.map((measurement, index) => (
                <div
                  key={measurement.id}
                  className="motion-interactive app-card app-card-hover rounded-[1.2rem] p-4 sm:p-5"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-mint" />
                        <span className="text-sm font-semibold text-white">
                          {formatDateValue(measurement.measuredAt, { dateStyle: 'medium' })}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {measurement.weightKg && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Peso</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.weightKg} kg</div>
                          </div>
                        )}
                        {measurement.heightCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Altura</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.heightCm} cm</div>
                          </div>
                        )}
                        {measurement.bodyFatPercentage && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">% Grasa</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.bodyFatPercentage}%</div>
                          </div>
                        )}
                        {measurement.waistCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Cintura</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.waistCm} cm</div>
                          </div>
                        )}
                        {measurement.hipsCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Cadera</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.hipsCm} cm</div>
                          </div>
                        )}
                        {measurement.chestCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Pecho</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.chestCm} cm</div>
                          </div>
                        )}
                        {measurement.armsCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Brazos</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.armsCm} cm</div>
                          </div>
                        )}
                        {measurement.thighsCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Muslos</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.thighsCm} cm</div>
                          </div>
                        )}
                        {measurement.calvesCm && (
                          <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Pantorrillas</div>
                            <div className="text-sm font-medium text-slate-200">{measurement.calvesCm} cm</div>
                          </div>
                        )}
                      </div>

                      {measurement.notes && (
                        <p className="mt-3 text-xs text-slate-400">{measurement.notes}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleEdit(measurement)}
                        className="btn-ghost h-9 w-9 rounded-xl p-0"
                        disabled={saving}
                        aria-label="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(measurement)}
                        className="btn-ghost h-9 w-9 rounded-xl p-0 text-crimson hover:bg-crimson/10"
                        disabled={saving}
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!showForm && measurements.length === 0 && !loading && (
          <section className="motion-enter motion-enter-delay-2 flex flex-col items-center justify-center rounded-[1.45rem] border border-dashed border-mist/40 bg-graphite/50 px-6 py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/10">
              <Ruler size={28} className="text-mint" />
            </div>
            <h3 className="mb-2 font-display text-lg text-white">Sin mediciones</h3>
            <p className="mb-6 max-w-xs text-sm text-slate-400">
              Aún no has registrado ninguna medición. Comienza a llevar el control de tu progreso.
            </p>
            <button onClick={handleAddNew} className="btn-primary inline-flex items-center gap-2">
              <Plus size={18} />
              <span>Agregar primera medición</span>
            </button>
          </section>
        )}
      </main>
    </div>
  );
};
