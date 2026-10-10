import type { Routine } from '../../../shared/types';

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .trim();

export const filterRoutines = (routines: Routine[], query: string): Routine[] => {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return routines;
  return routines.filter((routine) => {
    const searchableText = normalizeSearch([
      routine.name,
      routine.description ?? '',
      ...routine.exercises.map((exercise) => exercise.name)
    ].join(' '));
    return terms.every((term) => searchableText.includes(term));
  });
};
