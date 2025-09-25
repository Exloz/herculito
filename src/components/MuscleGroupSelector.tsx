import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { MuscleGroup } from '../types';
import { MUSCLE_GROUPS } from '../utils/muscleGroups';

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
      <div className="flex items-center space-x-2 text-gray-400">
        <span>{groupInfo.icon}</span>
        <span className="text-sm">{groupInfo.name}</span>
      </div>
    );
  }

  if (!isEditing) {
    const groupInfo = MUSCLE_GROUPS[currentGroup];
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <span className="text-sm">{groupInfo.icon}</span>
        <span className="text-xs sm:text-sm text-gray-300 truncate">{groupInfo.name}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-400 hover:text-blue-400 active:text-blue-300 transition-colors p-1 touch-manipulation"
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
        className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 min-w-0 flex-1"
      >
        {Object.entries(MUSCLE_GROUPS).map(([key, group]) => (
          <option key={key} value={key}>
            {group.icon} {group.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        className="text-green-400 hover:text-green-300 active:text-green-200 transition-colors p-1 touch-manipulation"
        title="Guardar cambios"
      >
        <Check size={12} />
      </button>
      <button
        onClick={handleCancel}
        className="text-red-400 hover:text-red-300 active:text-red-200 transition-colors p-1 touch-manipulation"
        title="Cancelar"
      >
        <X size={12} />
      </button>
    </div>
  );
};