import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { vibrateLight, vibrateSuccess } from './mobileFeedback';

describe('mobileFeedback', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
  });

  describe('vibrateLight', () => {
    it('does nothing when vibration is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(() => vibrateLight()).not.toThrow();
    });

    it('calls navigator.vibrate with 10ms when available', () => {
      const vibrate = vi.fn();
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate },
        writable: true,
        configurable: true
      });

      vibrateLight();
      expect(vibrate).toHaveBeenCalledWith(10);
    });

    it('handles undefined navigator gracefully', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(() => vibrateLight()).not.toThrow();
    });

    it('handles navigator.vibrate not being a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: 'not a function' },
        writable: true,
        configurable: true
      });

      expect(() => vibrateLight()).not.toThrow();
    });
  });

  describe('vibrateSuccess', () => {
    it('does nothing when vibration is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(() => vibrateSuccess()).not.toThrow();
    });

    it('calls navigator.vibrate with success pattern when available', () => {
      const vibrate = vi.fn();
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate },
        writable: true,
        configurable: true
      });

      vibrateSuccess();
      expect(vibrate).toHaveBeenCalledWith([12, 30, 18]);
    });

    it('handles undefined navigator gracefully', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(() => vibrateSuccess()).not.toThrow();
    });
  });
});