import { getDateStringInAppTimeZone } from '../../../shared/lib/dateUtils';

export const WEEK_DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
] as const;

export type WeekDay = typeof WEEK_DAYS[number]['id'];
// Missing day = not planned; null = explicitly chosen rest day.
export type WeeklyPlan = Partial<Record<WeekDay, string | null>>;

export function getPlanDay(date: Date): WeekDay {
  const dateString = getDateStringInAppTimeZone(date);
  const day = new Date(`${dateString}T12:00:00Z`).getUTCDay();
  return WEEK_DAYS[(day + 6) % 7].id;
}

export function parseWeeklyPlan(raw: string | null): WeeklyPlan {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const plan: WeeklyPlan = {};
    for (const { id } of WEEK_DAYS) {
      const assignment: unknown = Object.getOwnPropertyDescriptor(value, id)?.value;
      if (assignment === null || (typeof assignment === 'string' && assignment.trim())) {
        plan[id] = assignment;
      }
    }
    return plan;
  } catch {
    return {};
  }
}

export function setDayAssignment(plan: WeeklyPlan, day: WeekDay, routineId: string | null | undefined): WeeklyPlan {
  const next = { ...plan };
  if (routineId === undefined) delete next[day];
  else next[day] = routineId;
  return next;
}
