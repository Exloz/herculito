import { describe, expect, it } from 'vitest';
import type { Routine } from '../../../shared/types';
import { filterRoutines } from './filterRoutines';

const routines: Routine[] = [{
  id: 'push', name: 'Pecho y tríceps', description: 'Entrenamiento con mancuernas',
  exercises: [{ id: 'press', name: 'Press inclinado', sets: 3, reps: 10 }],
  createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1', isPublic: false
}, {
  id: 'legs', name: 'Piernas', exercises: [],
  createdAt: new Date(), updatedAt: new Date(), createdBy: 'coach', isPublic: true
}];

describe('filterRoutines', () => {
  it('matches names, descriptions and exercises without accents or case sensitivity', () => {
    expect(filterRoutines(routines, 'TRICEPS').map((routine) => routine.id)).toEqual(['push']);
    expect(filterRoutines(routines, 'mancuernas inclinado').map((routine) => routine.id)).toEqual(['push']);
  });

  it('requires all terms and preserves the original list for an empty search', () => {
    expect(filterRoutines(routines, 'piernas press')).toEqual([]);
    expect(filterRoutines(routines, '  ')).toBe(routines);
    expect(routines).toHaveLength(2);
  });
});
