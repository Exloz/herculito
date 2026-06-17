import { useId } from 'react';

export interface PresetNumericInputProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  presets: readonly number[];
  min?: number;
  max?: number;
  unit?: string;
  id?: string;
  inputClassName?: string;
}

const clamp = (n: number, min: number, max: number): number => {
  if (!Number.isFinite(n)) return min;
  const rounded = Math.round(n);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
};

export const PresetNumericInput: React.FC<PresetNumericInputProps> = ({
  label,
  value,
  onChange,
  presets,
  min = 1,
  max = 999,
  unit,
  id,
  inputClassName = 'input'
}) => {
  const generatedId = useId();
  const listId = id ?? `preset-list-${generatedId}`;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value;
    if (raw === '') return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed, min, max));
  };

  return (
    <div>
      <label
        htmlFor={listId}
        className="text-xs text-slate-400 block mb-2"
      >
        {label}
      </label>
      <input
        id={listId}
        type="number"
        list={`${listId}-options`}
        min={min}
        max={max}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={handleInputChange}
        className={inputClassName}
      />
      <datalist id={`${listId}-options`}>
        {presets.map((preset) => (
          <option key={preset} value={preset} />
        ))}
      </datalist>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {presets.map((preset) => {
            const isActive = value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                aria-pressed={isActive}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-mint text-ink'
                    : 'bg-slateDeep text-slate-300 hover:bg-slateDeep/80'
                }`}
              >
                {preset}
                {unit ? <span className="ml-0.5 opacity-70">{unit}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
