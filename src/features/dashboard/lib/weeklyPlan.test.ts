import { describe, expect, it } from 'vitest';
import { getPlanDay, parseWeeklyPlan, setDayAssignment } from './weeklyPlan';

describe('weekly planning', () => {
  it('uses the app timezone at the week boundary', () => {
    expect(getPlanDay(new Date('2026-10-12T03:00:00Z'))).toBe('sunday');
    expect(getPlanDay(new Date('2026-10-12T05:00:00Z'))).toBe('monday');
  });

  it('validates stored data and preserves explicit rest', () => {
    expect(parseWeeklyPlan('{"monday":"routine-1","tuesday":null,"wednesday":42,"thursday":"","unknown":"x"}'))
      .toEqual({ monday: 'routine-1', tuesday: null });
    for (const raw of [null, 'bad json', 'null', '[]', '5']) expect(parseWeeklyPlan(raw)).toEqual({});
  });

  it('allows repeating routines, rest, and unplanned days without mutating the plan', () => {
    const plan = { monday: 'routine-1' };
    const repeated = setDayAssignment(plan, 'friday', 'routine-1');
    expect(repeated).toEqual({ monday: 'routine-1', friday: 'routine-1' });
    const rest = setDayAssignment(repeated, 'friday', null);
    expect(rest.friday).toBeNull();
    expect(setDayAssignment(rest, 'friday', undefined)).toEqual(plan);
    expect(plan).toEqual({ monday: 'routine-1' });
  });
});
