import { describe, expect, it, vi } from 'vitest';
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

    it('reuses number formatters with equivalent options', () => {
      const OriginalNumberFormat = Intl.NumberFormat;
      const constructorSpy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(
        function NumberFormat(locales, options) {
          return new OriginalNumberFormat(locales, options);
        }
      );

      try {
        formatNumber(1, { minimumFractionDigits: 3 }, 'fr-CA');
        formatNumber(2, { minimumFractionDigits: 3 }, 'fr-CA');

        expect(constructorSpy).toHaveBeenCalledTimes(1);
      } finally {
        constructorSpy.mockRestore();
      }
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

    it('reuses date formatters with equivalent options', () => {
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      const constructorSpy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
        function DateTimeFormat(locales, options) {
          return new OriginalDateTimeFormat(locales, options);
        }
      );

      try {
        formatDateValue(new Date('2026-01-15T12:00:00Z'), { year: '2-digit' }, 'en-GB');
        formatDateValue(new Date('2026-01-16T12:00:00Z'), { year: '2-digit' }, 'en-GB');

        expect(constructorSpy).toHaveBeenCalledTimes(1);
      } finally {
        constructorSpy.mockRestore();
      }
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

    it('reuses plural rules for the same locale', () => {
      const OriginalPluralRules = Intl.PluralRules;
      const constructorSpy = vi.spyOn(Intl, 'PluralRules').mockImplementation(
        function PluralRules(locales, options) {
          return new OriginalPluralRules(locales, options);
        }
      );

      try {
        formatCountLabel(1, 'élément', 'éléments', 'fr-FR');
        formatCountLabel(2, 'élément', 'éléments', 'fr-FR');

        expect(constructorSpy).toHaveBeenCalledTimes(1);
      } finally {
        constructorSpy.mockRestore();
      }
    });
  });
});
