import React from 'react';
import {
  Zap,
  Shield,
  Footprints,
  Target,
  Dumbbell,
  Circle,
  Activity,
  LucideIcon
} from 'lucide-react';
import { MuscleGroup } from '../types';

// Mapeo de grupos musculares a iconos de Lucide
const MUSCLE_GROUP_ICONS: Record<MuscleGroup, LucideIcon> = {
  pecho: Zap,        // Pecho - fuerza/energía
  espalda: Shield,   // Espalda - protección/fuerza
  piernas: Footprints, // Piernas - pasos/movimiento
  hombros: Target,   // Hombros - precisión/objetivo  
  brazos: Dumbbell,  // Brazos - pesas/fuerza
  core: Circle,      // Core - centro/estabilidad
  fullbody: Activity // Full Body - actividad general
};

interface MuscleGroupIconProps {
  muscleGroup: MuscleGroup;
  size?: number;
  className?: string;
  color?: string;
}

export const MuscleGroupIcon: React.FC<MuscleGroupIconProps> = ({
  muscleGroup,
  size = 16,
  className = "",
  color
}) => {
  const IconComponent = MUSCLE_GROUP_ICONS[muscleGroup];

  return (
    <IconComponent
      size={size}
      className={className}
      style={color ? { color } : undefined}
    />
  );
};