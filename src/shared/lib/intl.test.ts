import { describe, expect, it } from 'vitest';
import { APP_LOCALE, formatNumber, formatDateValue, formatCountLabel } from './intl';

describe('intl', () => {
  describe('APP_LOCALE', () => {
    it('is set to es-CO', () => {
      expect(APP_LOCALE).toBe('es-CO');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with default locale', () => {
      const result = formatNumber(1234.56);
      expect(typeof result).toBe('string');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('formats integers correctly', () => {
      const result = formatNumber(1000);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/1[\s.,]?000/);
    });

    it('formats with custom options', () => {
      const result = formatNumber(0.123, { style: 'percent' });
      expect(typeof result).toBe('string');
    });

    it('formats with custom locale', () => {
      const result = formatNumber(1234, undefined, 'en-US');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateValue', () => {
    it('formats date with default locale', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = formatDateValue(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats date with custom options', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = formatDateValue(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats date with custom locale', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      const result = formatDateValue(date, undefined, 'en-US');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatCountLabel', () => {
    it('formats singular form for count of 1', () => {
      const result = formatCountLabel(1, 'ejercicio', 'ejercicios');
      expect(result).toBe('1 ejercicio');
    });

    it('formats plural form for count greater than 1', () => {
      const result = formatCountLabel(5, 'ejercicio', 'ejercicios');
      expect(result).toBe('5 ejercicios');
    });

    it('formats plural form for count of 0', () => {
      const result = formatCountLabel(0, 'ejercicio', 'ejercicios');
      expect(result).toBe('0 ejercicios');
    });

    it('handles large numbers', () => {
      const result = formatCountLabel(1000, 'vez', 'veces');
      expect(result).toMatch(/1[\s.,]?000/);
      expect(result).toContain('veces');
    });

    it('uses custom locale', () => {
      const result = formatCountLabel(1, 'item', 'items', 'en-US');
      expect(result).toBe('1 item');
    });

    it('formats with no decimals', () => {
      const result = formatCountLabel(1.5, 'item', 'items');
      expect(result).not.toContain('.');
    });
  });
});