import { BarChart3, CalendarDays, Dumbbell, House, Ruler, Shield, Target } from 'lucide-react';
import type { AppPage } from '../hooks/usePageNavigation';

export const DESTINATIONS = [
  { page: 'dashboard', label: 'Inicio', ariaLabel: 'Ir a Inicio', description: 'Tu entrenamiento de hoy', icon: House, group: 'Entrenamiento' },
  { page: 'routines', label: 'Rutinas', ariaLabel: 'Ir a Rutinas', description: 'Tu biblioteca de ejercicios', icon: Dumbbell, group: 'Entrenamiento' },
  { page: 'sports', label: 'Deportes', ariaLabel: 'Ir a Deportes', description: 'Tiro con arco e HIIT', icon: Target, group: 'Entrenamiento' },
  { page: 'progress', label: 'Progreso', ariaLabel: 'Ir a Progreso', description: 'Pesos, series y evolución', icon: BarChart3, group: 'Seguimiento' },
  { page: 'calendar', label: 'Calendario', ariaLabel: 'Ir a Calendario', description: 'Tu historial de actividad', icon: CalendarDays, group: 'Seguimiento' },
  { page: 'profile', label: 'Medidas', ariaLabel: 'Ir a Mis medidas', description: 'Tus medidas corporales', icon: Ruler, group: 'Seguimiento' },
  { page: 'admin', label: 'Admin', ariaLabel: 'Ir a Admin', description: 'Administración de Herculito', icon: Shield, group: 'Administración' }
] satisfies Array<{ page: AppPage; label: string; ariaLabel: string; description: string; icon: typeof House; group: string }>;

export function normalizeCommandSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}
