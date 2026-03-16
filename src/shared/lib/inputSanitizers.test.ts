import { describe, expect, it } from 'vitest';
import { normalizeSingleLine, normalizeMultiline, clampInteger } from './inputSanitizers';

describe('inputSanitizers', () => {
  describe('normalizeSingleLine', () => {
    it('trims whitespace', () => {
      expect(normalizeSingleLine('  hello world  ', 100)).toBe('hello world');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeSingleLine('hello    world', 100)).toBe('hello world');
    });

    it('collapses tabs and spaces', () => {
      expect(normalizeSingleLine('hello \t  world', 100)).toBe('hello world');
    });

    it('truncates to max length', () => {
      expect(normalizeSingleLine('hello world', 5)).toBe('hello');
    });

    it('handles empty string', () => {
      expect(normalizeSingleLine('', 100)).toBe('');
    });

    it('handles whitespace only', () => {
      expect(normalizeSingleLine('   ', 100)).toBe('');
    });

    it('preserves single spaces', () => {
      expect(normalizeSingleLine('hello world', 100)).toBe('hello world');
    });
  });

  describe('normalizeMultiline', () => {
    it('trims whitespace', () => {
      expect(normalizeMultiline('  hello\nworld  ', 100)).toBe('hello\nworld');
    });

    it('converts CRLF to LF', () => {
      expect(normalizeMultiline('hello\r\nworld', 100)).toBe('hello\nworld');
    });

    it('removes trailing spaces before newlines', () => {
      expect(normalizeMultiline('hello  \nworld', 100)).toBe('hello\nworld');
    });

    it('collapses multiple newlines to max 2', () => {
      expect(normalizeMultiline('hello\n\n\n\nworld', 100)).toBe('hello\n\nworld');
    });

    it('truncates to max length', () => {
      expect(normalizeMultiline('hello world', 5)).toBe('hello');
    });

    it('preserves exactly 2 newlines', () => {
      expect(normalizeMultiline('hello\n\nworld', 100)).toBe('hello\n\nworld');
    });

    it('handles empty string', () => {
      expect(normalizeMultiline('', 100)).toBe('');
    });

    it('handles whitespace only', () => {
      expect(normalizeMultiline('   \n   ', 100)).toBe('');
    });
  });

  describe('clampInteger', () => {
    it('returns value when within range', () => {
      expect(clampInteger(5, 0, 10)).toBe(5);
    });

    it('returns min when value is below range', () => {
      expect(clampInteger(-5, 0, 10)).toBe(0);
    });

    it('returns max when value is above range', () => {
      expect(clampInteger(15, 0, 10)).toBe(10);
    });

    it('handles exact boundaries', () => {
      expect(clampInteger(0, 0, 10)).toBe(0);
      expect(clampInteger(10, 0, 10)).toBe(10);
    });

    it('works with negative range', () => {
      expect(clampInteger(-5, -10, -1)).toBe(-5);
      expect(clampInteger(-15, -10, -1)).toBe(-10);
    });

    it('works with same min and max', () => {
      expect(clampInteger(100, 5, 5)).toBe(5);
    });
  });
});