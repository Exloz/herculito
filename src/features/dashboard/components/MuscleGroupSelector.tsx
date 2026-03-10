import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { MuscleGroup } from '../../../shared/types';
import { MUSCLE_GROUPS } from '../lib/muscleGroups';
import { MuscleGroupIcon } from './MuscleGroupIcon';

interface MuscleGroupSelectorProps {
  currentGroup: MuscleGroup;
  onGroupChange: (newGroup: MuscleGroup) => void;
  disabled?: boolean;
}

export const MuscleGroupSelector: React.FC<MuscleGroupSelectorProps> = ({
  currentGroup,
  onGroupChange,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>(currentGroup);

  const handleSave = () => {
    onGroupChange(selectedGroup);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedGroup(currentGroup);
    setIsEditing(false);
  };

  if (disabled) {
    const groupInfo = MUSCLE_GROUPS[currentGroup];
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.05] px-3 py-1.5 text-slate-300">
        <MuscleGroupIcon muscleGroup={currentGroup} size={14} />
        <span className="text-sm">{groupInfo.name}</span>
      </div>
    );
  }

  if (!isEditing) {
    const groupInfo = MUSCLE_GROUPS[currentGroup];
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.05] px-3 py-1.5">
        <MuscleGroupIcon muscleGroup={currentGroup} size={14} />
        <span className="text-xs sm:text-sm text-slate-200 truncate">{groupInfo.name}</span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-full border border-transparent p-1 text-slate-400 transition-colors hover:border-mint/20 hover:text-mint active:text-mintDeep touch-target-sm"
          title="Cambiar grupo muscular"
          aria-label="Cambiar grupo muscular"
        >
          <Edit3 size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value as MuscleGroup)}
        className="input input-sm min-w-0 flex-1 text-xs"
      >
        {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
          <option key={key} value={key}>
            {group.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        className="rounded-full border border-mint/20 bg-mint/10 p-1 text-mint transition-colors hover:bg-mint/15 hover:text-mintDeep active:text-mintDeep touch-target-sm"
        title="Guardar cambios"
        aria-label="Guardar grupo muscular"
      >
        <Check size={12} />
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="rounded-full border border-crimson/20 bg-crimson/10 p-1 text-crimson transition-colors hover:bg-crimson/15 hover:text-red-400 active:text-red-400 touch-target-sm"
        title="Cancelar"
        aria-label="Cancelar cambio de grupo muscular"
      >
        <X size={12} />
      </button>
    </div>
  );
};
