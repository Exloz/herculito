import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { MuscleGroup } from '../types';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';
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
      <div className="flex items-center space-x-2 text-slate-400">
        <MuscleGroupIcon muscleGroup={currentGroup} size={14} />
        <span className="text-sm">{groupInfo.name}</span>
      </div>
    );
  }

  if (!isEditing) {
    const groupInfo = MUSCLE_GROUPS[currentGroup];
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <MuscleGroupIcon muscleGroup={currentGroup} size={14} />
        <span className="text-xs sm:text-sm text-slate-300 truncate">{groupInfo.name}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-slate-400 hover:text-mint active:text-mintDeep transition-colors p-1 touch-manipulation"
          title="Cambiar grupo muscular"
        >
          <Edit3 size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <select
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value as MuscleGroup)}
        className="input input-sm text-xs min-w-0 flex-1"
      >
        {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
          <option key={key} value={key}>
            {group.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        className="text-mint hover:text-mintDeep active:text-mintDeep transition-colors p-1 touch-manipulation"
        title="Guardar cambios"
      >
        <Check size={12} />
      </button>
      <button
        onClick={handleCancel}
        className="text-crimson hover:text-red-400 active:text-red-400 transition-colors p-1 touch-manipulation"
        title="Cancelar"
      >
        <X size={12} />
      </button>
    </div>
  );
};