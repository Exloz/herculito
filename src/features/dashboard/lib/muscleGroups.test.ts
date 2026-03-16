import { describe, expect, it, vi, afterEach } from 'vitest';
import { detectMuscleGroup, getRoutinePrimaryMuscleGroup, getRoutinesByMuscleGroup, getRecommendedMuscleGroup, MUSCLE_GROUPS } from './muscleGroups';
import type { WorkoutSession, Routine } from '../../../shared/types';

const makeSession = (id: string, completedAt: Date, primaryMuscleGroup: WorkoutSession['primaryMuscleGroup']): WorkoutSession => {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Test Routine',
    userId: 'user-1',
    startedAt: new Date(completedAt.getTime() - 45 * 60 * 1000),
    completedAt,
    exercises: [],
    primaryMuscleGroup
  };
};

const makeRoutine = (id: string, name: string, exercises: Routine['exercises'] = [], primaryMuscleGroup?: Routine['primaryMuscleGroup']): Routine => ({
  id,
  name,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  createdBy: 'user-1',
  isPublic: false,
  exercises,
  primaryMuscleGroup
});

describe('muscleGroups utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('MUSCLE_GROUPS', () => {
    it('contains all expected muscle groups', () => {
      expect(MUSCLE_GROUPS).toHaveProperty('pecho');
      expect(MUSCLE_GROUPS).toHaveProperty('espalda');
      expect(MUSCLE_GROUPS).toHaveProperty('piernas');
      expect(MUSCLE_GROUPS).toHaveProperty('hombros');
      expect(MUSCLE_GROUPS).toHaveProperty('brazos');
      expect(MUSCLE_GROUPS).toHaveProperty('core');
      expect(MUSCLE_GROUPS).toHaveProperty('fullbody');
    });

    it('has name and color for each group', () => {
      Object.entries(MUSCLE_GROUPS).forEach(([, info]) => {
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('color');
        expect(typeof info.name).toBe('string');
        expect(typeof info.color).toBe('string');
      });
    });
  });

  describe('detectMuscleGroup', () => {
    it('detects chest exercises', () => {
      expect(detectMuscleGroup('Press de banca inclinado')).toBe('pecho');
      expect(detectMuscleGroup('Press plano')).toBe('pecho');
      expect(detectMuscleGroup('aperturas con mancuernas')).toBe('pecho');
      expect(detectMuscleGroup('fondos en paralelas')).toBe('pecho');
    });

    it('detects back exercises', () => {
      expect(detectMuscleGroup('Dominadas')).toBe('espalda');
      expect(detectMuscleGroup('Pull ups estrictas')).toBe('espalda');
      expect(detectMuscleGroup('Remo con barra')).toBe('espalda');
      expect(detectMuscleGroup('Jalones al pecho')).toBe('espalda');
      expect(detectMuscleGroup('Peso muerto rumano')).toBe('espalda');
      expect(detectMuscleGroup('Deadlift convencional')).toBe('espalda');
    });

    it('detects leg exercises', () => {
      expect(detectMuscleGroup('Sentadillas con barra')).toBe('piernas');
      expect(detectMuscleGroup('Squat profundo')).toBe('piernas');
      expect(detectMuscleGroup('Prensa de piernas')).toBe('piernas');
      expect(detectMuscleGroup('Curl femoral')).toBe('piernas');
      expect(detectMuscleGroup('Extensión de cuádriceps')).toBe('piernas');
      expect(detectMuscleGroup('Gemelos parados')).toBe('piernas');
      expect(detectMuscleGroup('Calf raises')).toBe('piernas');
    });

    it('detects shoulder exercises', () => {
      expect(detectMuscleGroup('Elevaciones laterales')).toBe('hombros');
      expect(detectMuscleGroup('Vuelos posteriores')).toBe('hombros');
      expect(detectMuscleGroup('Elevaciones frontales')).toBe('hombros');
    });

    it('detects arm exercises', () => {
      expect(detectMuscleGroup('Tríceps en banco')).toBe('brazos');
      expect(detectMuscleGroup('Bíceps concentrado')).toBe('brazos');
    });

    it('returns fullbody for unknown exercises', () => {
      expect(detectMuscleGroup('Algo desconocido')).toBe('fullbody');
      expect(detectMuscleGroup('Ejercicio nuevo')).toBe('fullbody');
      expect(detectMuscleGroup('')).toBe('fullbody');
    });

    it('is case insensitive', () => {
      expect(detectMuscleGroup('PRESS DE BANCA')).toBe('pecho');
      expect(detectMuscleGroup('Dominadas')).toBe('espalda');
      expect(detectMuscleGroup('SENTADILLAS')).toBe('piernas');
    });
  });

  describe('getRoutinePrimaryMuscleGroup', () => {
    it('returns explicit primaryMuscleGroup when set', () => {
      const routine = makeRoutine('r1', 'Test', [], 'pecho');
      expect(getRoutinePrimaryMuscleGroup(routine)).toBe('pecho');
    });

    it('calculates primary group from exercises when not set', () => {
      const routine = makeRoutine('r1', 'Test', [
        { id: 'e1', name: 'Press de banca', sets: 3, reps: 10, muscleGroup: 'pecho' },
        { id: 'e2', name: 'Press inclinado', sets: 3, reps: 10, muscleGroup: 'pecho' },
        { id: 'e3', name: 'Sentadillas', sets: 3, reps: 10, muscleGroup: 'piernas' }
      ]);
      const result = getRoutinePrimaryMuscleGroup(routine);
      expect(result).toBe('pecho');
    });

    it('uses detectMuscleGroup when muscleGroup is not set', () => {
      const routine = makeRoutine('r1', 'Test', [
        { id: 'e1', name: 'Press de banca', sets: 3, reps: 10 },
        { id: 'e2', name: 'Remo con barra', sets: 3, reps: 10 },
        { id: 'e3', name: 'Press de banca inclinado', sets: 3, reps: 10 }
      ]);
      const result = getRoutinePrimaryMuscleGroup(routine);
      expect(result).toBe('pecho');
    });

    it('returns fullbody for empty routine', () => {
      const routine = makeRoutine('r1', 'Empty', []);
      expect(getRoutinePrimaryMuscleGroup(routine)).toBe('fullbody');
    });

    it('handles tied muscle groups correctly', () => {
      const routine = makeRoutine('r1', 'Tied', [
        { id: 'e1', name: 'Press de banca', sets: 3, reps: 10, muscleGroup: 'pecho' },
        { id: 'e2', name: 'Sentadillas', sets: 3, reps: 10, muscleGroup: 'piernas' }
      ]);
      const result = getRoutinePrimaryMuscleGroup(routine);expect(['pecho', 'piernas']).toContain(result);
    });
  });

  describe('getRoutinesByMuscleGroup', () => {
    it('filters routines by muscle group', () => {
      const routines = [
        makeRoutine('r1', 'Pecho', [], 'pecho'),
        makeRoutine('r2', 'Espalda', [], 'espalda'),
        makeRoutine('r3', 'Piernas', [], 'piernas')
      ];

      const result = getRoutinesByMuscleGroup(routines, 'pecho');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    it('returns empty array when no routines match', () => {
      const routines = [
        makeRoutine('r1', 'Pecho', [], 'pecho')
      ];

      const result = getRoutinesByMuscleGroup(routines, 'espalda');

      expect(result).toHaveLength(0);
    });

    it('returns all matching routines', () => {
      const routines = [
        makeRoutine('r1', 'Pecho 1', [], 'pecho'),
        makeRoutine('r2', 'Espalda', [], 'espalda'),
        makeRoutine('r3', 'Pecho 2', [], 'pecho')
      ];

      const result = getRoutinesByMuscleGroup(routines, 'pecho');

      expect(result).toHaveLength(2);
    });
  });

  describe('getRecommendedMuscleGroup', () => {
    it('returns null for empty sessions', () => {
      expect(getRecommendedMuscleGroup([])).toBeNull();
    });

    it('returns null for undefined sessions', () => {
      expect(getRecommendedMuscleGroup(undefined as unknown as WorkoutSession[])).toBeNull();
    });

    it('returns null when no recent workouts', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

      const oldDate = new Date('2026-02-20T15:00:00.000Z');
      const sessions: WorkoutSession[] = [
        makeSession('s1', oldDate, 'pecho')
      ];

      const result = getRecommendedMuscleGroup(sessions);
      expect(result).toBeNull();
    });

    it('returns deterministic recommendation for same input/day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

      const sessions: WorkoutSession[] = [
        makeSession('s1', new Date('2026-02-25T15:00:00.000Z'), 'pecho'),
        makeSession('s2', new Date('2026-02-24T15:00:00.000Z'), 'espalda')
      ];

      const recommendationA = getRecommendedMuscleGroup(sessions);
      const recommendationB = getRecommendedMuscleGroup(sessions);

      expect(recommendationA).toBe(recommendationB);
      expect(recommendationA).toBeTruthy();
      expect(['piernas', 'hombros', 'brazos']).toContain(recommendationA);
    });

    it('filters out sessions without completedAt', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

      const sessions: WorkoutSession[] = [
        { id: 's1', routineId: 'r1', routineName: 'Test', userId: 'u1', startedAt: new Date(), exercises: [], primaryMuscleGroup: 'pecho' }
      ];

      const result = getRecommendedMuscleGroup(sessions);
      expect(result).toBeNull();
    });

    it('filters out sessions without primaryMuscleGroup', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

      const sessions: WorkoutSession[] = [
        makeSession('s1', new Date('2026-02-25T15:00:00.000Z'), undefined)
      ];

      const result = getRecommendedMuscleGroup(sessions);
      expect(result).toBeNull();
    });

    it('recommends least trained group when all groups trained', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-26T12:00:00.000Z'));

      const sessions: WorkoutSession[] = [
        makeSession('s1', new Date('2026-02-25T15:00:00.000Z'), 'pecho'),
        makeSession('s2', new Date('2026-02-25T10:00:00.000Z'), 'pecho'),
        makeSession('s3', new Date('2026-02-24T15:00:00.000Z'), 'espalda'),
        makeSession('s4', new Date('2026-02-24T10:00:00.000Z'), 'piernas'),
        makeSession('s5', new Date('2026-02-23T15:00:00.000Z'), 'hombros'),
        makeSession('s6', new Date('2026-02-23T10:00:00.000Z'), 'brazos')
      ];

      const result = getRecommendedMuscleGroup(sessions);
      expect(result).toBeTruthy();
    });

    it('handles errors gracefully', () => {
      const result = getRecommendedMuscleGroup(null as unknown as WorkoutSession[]);
      expect(result).toBeNull();
    });
  });
});
