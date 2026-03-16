import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';import {
  getDateStringInAppTimeZone,
  formatDateInAppTimeZone,
  getCurrentDateString,
  formatDateString,
  getCurrentDayOfWeek,
  formatDateForDisplay,
  getStartOfWeek,
  isToday,
  isSameDay,
  addDays,
  getWeekDates
} from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDateStringInAppTimeZone', () => {
    it('returns date string in YYYY-MM-DD format', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = getDateStringInAppTimeZone(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles different dates correctly', () => {
      vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      const date = new Date('2026-03-15T12:00:00Z');
      const result = getDateStringInAppTimeZone(date);
      expect(result).toMatch(/2026-03-1[45]/);
    });
  });

  describe('formatDateInAppTimeZone', () => {
    it('formats date with default locale', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = formatDateInAppTimeZone(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats date with custom locale', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = formatDateInAppTimeZone(date, 'en-US');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentDateString', () => {
    it('returns current date in app timezone', () => {
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
      const result = getCurrentDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateString', () => {
    it('formats date string with weekday and month', () => {
      const result = formatDateString('2026-01-15');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe(result[0].toUpperCase());
    });

    it('capitalizes first letter', () => {
      const result = formatDateString('2026-06-15');
      expect(result[0]).toBe(result[0].toUpperCase());
    });
  });

  describe('getCurrentDayOfWeek', () => {
    it('returns lowercase day name', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = getCurrentDayOfWeek();
      expect(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).toContain(result);
    });
  });

  describe('formatDateForDisplay', () => {
    it('returns "Hoy" for today', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = formatDateForDisplay(getCurrentDateString());
      expect(result).toBe('Hoy');
    });

    it('returns "Ayer" for yesterday', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const yesterday = addDays(getCurrentDateString(), -1);
      const result = formatDateForDisplay(yesterday);
      expect(result).toBe('Ayer');
    });

    it('returns formatted date for older dates', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = formatDateForDisplay('2026-01-01');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Hoy');
      expect(result).not.toBe('Ayer');
    });
  });

  describe('getStartOfWeek', () => {
    it('returns a date string in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = getStartOfWeek();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns monday when current day is wednesday', () => {
      vi.setSystemTime(new Date('2026-01-14T12:00:00Z'));
      const result = getStartOfWeek();
      expect(result).toBe('2026-01-12');
    });

    it('returns same day when current day is monday', () => {
      vi.setSystemTime(new Date('2026-01-12T12:00:00Z'));
      const result = getStartOfWeek();
      expect(result).toBe('2026-01-12');
    });
  });

  describe('isToday', () => {
    it('returns true for today date string', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const today = getCurrentDateString();
      expect(isToday(today)).toBe(true);
    });

    it('returns false for non-today date string', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      expect(isToday('2026-01-14')).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same date strings', () => {
      expect(isSameDay('2026-01-15', '2026-01-15')).toBe(true);
    });

    it('returns false for different date strings', () => {
      expect(isSameDay('2026-01-15', '2026-01-14')).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds positive days correctly', () => {
      expect(addDays('2026-01-15', 3)).toBe('2026-01-18');
    });

    it('subtracts days with negative values', () => {
      expect(addDays('2026-01-15', -5)).toBe('2026-01-10');
    });

    it('handles month transitions', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('handles year transitions', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('handles zero days', () => {
      expect(addDays('2026-01-15', 0)).toBe('2026-01-15');
    });
  });

  describe('getWeekDates', () => {
    it('returns array of 7 date strings', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = getWeekDates();
      expect(result).toHaveLength(7);
      result.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('returns consecutive dates starting from monday', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const result = getWeekDates();
      expect(result[0]).toBe('2026-01-12');
      expect(result[6]).toBe('2026-01-18');
    });
  });
});