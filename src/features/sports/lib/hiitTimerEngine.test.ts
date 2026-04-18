import { describe, it, expect } from 'vitest';
import {
  createHiitEngine,
  startHiit,
  pauseHiit,
  resumeHiit,
  resetHiit,
  restartCurrentPhase,
  tickHiit,
  getEffectiveElapsed,
  getHiitProgress,
  getPhaseDuration,
  getPhaseLabel,
} from './hiitTimerEngine';
import type { HiitConfig, HiitPhase } from '../../../shared/types';

describe('hiitTimerEngine', () => {
  const defaultConfig: HiitConfig = {
    intervals: 3,
    workDuration: 5,
    restEnabled: true,
    restDuration: 3,
  };

  describe('createHiitEngine', () => {
    it('creates engine in idle state', () => {
      const engine = createHiitEngine(defaultConfig);
      expect(engine.state.phase).toBe('idle');
      expect(engine.state.currentInterval).toBe(0);
      expect(engine.state.secondsRemaining).toBe(0);
      expect(engine.isRunning).toBe(false);
      expect(engine.isPaused).toBe(false);
    });
  });

  describe('startHiit', () => {
    it('transitions from idle to prep', () => {
      const engine = createHiitEngine(defaultConfig);
      const started = startHiit(engine);
      expect(started.state.phase).toBe('prep');
      expect(started.state.secondsRemaining).toBe(5);
      expect(started.isRunning).toBe(true);
    });

    it('does not start if already running', () => {
      const engine = createHiitEngine(defaultConfig);
      const started = startHiit(engine);
      const restarted = startHiit(started);
      expect(restarted).toBe(started);
    });
  });

  describe('prep phase', () => {
    it('counts down from 5 with prep-tick alerts', () => {
      const engine = startHiit(createHiitEngine(defaultConfig));
      const ticks: string[] = [];
      let current = engine;

      // 5 ticks of prep (5→4, 4→3, 3→2, 2→1, 1→0)
      for (let i = 0; i < 5; i++) {
        const result = tickHiit(current);
        ticks.push(result.alert ?? 'none');
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // 5th tick triggers transition prep→work, so alert is phase-start not prep-tick
      expect(ticks).toEqual(['prep-tick', 'prep-tick', 'prep-tick', 'prep-tick', 'phase-start']);
      // After 5 ticks, should transition to work
      expect(current.state.phase).toBe('work');
      expect(current.state.currentInterval).toBe(1);
    });
  });

  describe('work phase', () => {
    it('transitions from prep to work with phase-start alert', () => {
      const engine = startHiit(createHiitEngine(defaultConfig));
      let current = engine;

      // Tick through prep
      for (let i = 0; i < 5; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Now in work — first tick should be work phase
      expect(current.state.phase).toBe('work');
      expect(current.state.currentInterval).toBe(1);
      expect(current.state.secondsRemaining).toBe(defaultConfig.workDuration);
    });

    it('emits countdown-tick for last 5 seconds of work', () => {
      const config: HiitConfig = { intervals: 1, workDuration: 7, restEnabled: false, restDuration: 0 };
      const engine = startHiit(createHiitEngine(config));
      let current = engine;

      // Skip prep
      for (let i = 0; i < 5; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Now in work (7s). Tick through, check alerts for last 5.
      const alerts: string[] = [];
      for (let i = 0; i < 7; i++) {
        const result = tickHiit(current);
        alerts.push(result.alert ?? 'none');
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Work 7→6, 6→5 (countdown starts), 5→4, 4→3, 3→2, 2→1, 1→0 (done)
      expect(alerts[0]).toBe('none');      // 7→6
      expect(alerts[1]).toBe('countdown-tick'); // 6→5
      expect(alerts[2]).toBe('countdown-tick'); // 5→4
      expect(alerts[3]).toBe('countdown-tick'); // 4→3
      expect(alerts[4]).toBe('countdown-tick'); // 3→2
      expect(alerts[5]).toBe('countdown-tick'); // 2→1
      expect(alerts[6]).toBe('done');        // 1→0 (last interval, no rest)
    });
  });

  describe('rest phase', () => {
    it('transitions from work to rest with phase-start alert', () => {
      const config: HiitConfig = { intervals: 2, workDuration: 2, restEnabled: true, restDuration: 2 };
      const engine = startHiit(createHiitEngine(config));
      let current = engine;

      // Skip prep (5 ticks)
      for (let i = 0; i < 5; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Work interval 1 (2s)
      const workResult1 = tickHiit(current);
      current = { ...current, state: workResult1.state, isRunning: workResult1.isRunning };
      expect(current.state.phase).toBe('work');

      const workResult2 = tickHiit(current);
      expect(workResult2.state.phase).toBe('rest');
      expect(workResult2.alert).toBe('phase-start');
      expect(workResult2.state.secondsRemaining).toBe(2);
    });

    it('emits countdown-tick for last 5 seconds of rest', () => {
      const config: HiitConfig = { intervals: 2, workDuration: 2, restEnabled: true, restDuration: 7 };
      const engine = startHiit(createHiitEngine(config));
      let current = engine;

      // Skip prep + work interval 1 (5 + 2 ticks)
      for (let i = 0; i < 7; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Now in rest (7s). Check alerts for last 5.
      const alerts: string[] = [];
      for (let i = 0; i < 7; i++) {
        const result = tickHiit(current);
        alerts.push(result.alert ?? 'none');
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Rest 7→6, 6→5, 5→4, 4→3, 3→2, 2→1, 1→0 → work
      expect(alerts[0]).toBe('none');
      expect(alerts[1]).toBe('countdown-tick');
      expect(alerts[6]).toBe('phase-start'); // → next work
    });
  });

  describe('full session', () => {
    it('completes a full session: 2 intervals with rest', () => {
      const config: HiitConfig = { intervals: 2, workDuration: 3, restEnabled: true, restDuration: 2 };
      const engine = startHiit(createHiitEngine(config));
      let current = engine;

      const phases: HiitPhase[] = [];

      // Run all ticks until done
      let maxTicks = 100; // safety
      while (current.state.phase !== 'done' && maxTicks > 0) {
        const result = tickHiit(current);
        phases.push(result.state.phase);
        current = { ...current, state: result.state, isRunning: result.isRunning };
        maxTicks--;
      }

      // Sequence: 5 prep + 3 work + 2 rest + 3 work = 13 total ticks
      expect(phases).toHaveLength(13);

      // Verify final state
      expect(current.state.phase).toBe('done');
      expect(current.isRunning).toBe(false);
      expect(current.state.totalElapsed).toBe(13);
    });

    it('completes a full session without rest', () => {
      const config: HiitConfig = { intervals: 2, workDuration: 3, restEnabled: false, restDuration: 0 };
      const engine = startHiit(createHiitEngine(config));
      let current = engine;

      const phases: HiitPhase[] = [];
      let maxTicks = 100;

      while (current.state.phase !== 'done' && maxTicks > 0) {
        const result = tickHiit(current);
        phases.push(result.state.phase);
        current = { ...current, state: result.state, isRunning: result.isRunning };
        maxTicks--;
      }

      // 5 prep + 3 work + 3 work = 11 total ticks
      expect(phases).toHaveLength(11);
      expect(current.state.phase).toBe('done');
    });
  });

  describe('pause and resume', () => {
    it('pauses and resumes correctly', () => {
      const engine = startHiit(createHiitEngine(defaultConfig));
      const paused = pauseHiit(engine);
      expect(paused.isPaused).toBe(true);

      // Tick while paused should not advance
      const result = tickHiit(paused);
      expect(result.state.secondsRemaining).toBe(5);
      expect(result.state.phase).toBe('prep');

      // Resume
      const resumed = resumeHiit(paused);
      expect(resumed.isPaused).toBe(false);
      expect(resumed.isRunning).toBe(true);
    });

    it('does not pause when idle', () => {
      const engine = createHiitEngine(defaultConfig);
      const paused = pauseHiit(engine);
      expect(paused).toBe(engine);
    });

    it('does not resume when not paused', () => {
      const engine = startHiit(createHiitEngine(defaultConfig));
      const resumed = resumeHiit(engine);
      expect(resumed).toBe(engine); // No change
    });
  });

  describe('reset', () => {
    it('resets to idle', () => {
      const engine = startHiit(createHiitEngine(defaultConfig));
      const reset = resetHiit(engine);
      expect(reset.state.phase).toBe('idle');
      expect(reset.isRunning).toBe(false);
      expect(reset.isPaused).toBe(false);
    });
  });

  describe('restartCurrentPhase', () => {
    it('restarts current work phase without changing interval', () => {
      const config: HiitConfig = { intervals: 1, workDuration: 10, restEnabled: false, restDuration: 0 };
      let current = startHiit(createHiitEngine(config));

      // Skip prep (5s)
      for (let i = 0; i < 5; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // Consume 3 seconds of work: 10 -> 7
      for (let i = 0; i < 3; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      const restarted = restartCurrentPhase(current);
      expect(restarted.state.phase).toBe('work');
      expect(restarted.state.currentInterval).toBe(1);
      expect(restarted.state.secondsRemaining).toBe(10);
      expect(restarted.state.totalElapsed).toBe(5); // only prep counted
    });

    it('restarts current rest phase without changing interval', () => {
      const config: HiitConfig = { intervals: 2, workDuration: 2, restEnabled: true, restDuration: 5 };
      let current = startHiit(createHiitEngine(config));

      // Skip prep + first work (5 + 2)
      for (let i = 0; i < 7; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      // In rest (5s), consume 2s: 5 -> 3
      for (let i = 0; i < 2; i++) {
        const result = tickHiit(current);
        current = { ...current, state: result.state, isRunning: result.isRunning };
      }

      const restarted = restartCurrentPhase(current);
      expect(restarted.state.phase).toBe('rest');
      expect(restarted.state.currentInterval).toBe(1);
      expect(restarted.state.secondsRemaining).toBe(5);
      expect(restarted.state.totalElapsed).toBe(7); // prep + first work
    });

    it('does nothing on idle and done', () => {
      const idle = createHiitEngine(defaultConfig);
      expect(restartCurrentPhase(idle)).toBe(idle);

      let doneEngine = startHiit(createHiitEngine({ intervals: 1, workDuration: 1, restEnabled: false, restDuration: 0 }));
      while (doneEngine.state.phase !== 'done') {
        const result = tickHiit(doneEngine);
        doneEngine = { ...doneEngine, state: result.state, isRunning: result.isRunning };
      }

      expect(restartCurrentPhase(doneEngine)).toBe(doneEngine);
    });
  });

  describe('getEffectiveElapsed', () => {
    it('returns 0 during prep', () => {
      const state = { phase: 'prep' as const, currentInterval: 0, secondsRemaining: 3, totalElapsed: 2 };
      expect(getEffectiveElapsed(state)).toBe(0);
    });

    it('excludes prep once work starts', () => {
      const state = { phase: 'work' as const, currentInterval: 1, secondsRemaining: 4, totalElapsed: 6 };
      expect(getEffectiveElapsed(state)).toBe(1);
    });

    it('returns full effective time when done', () => {
      const state = { phase: 'done' as const, currentInterval: 2, secondsRemaining: 0, totalElapsed: 13 };
      expect(getEffectiveElapsed(state)).toBe(8);
    });
  });

  describe('getHiitProgress', () => {
    it('returns 0 for idle', () => {
      const state = { phase: 'idle' as const, currentInterval: 0, secondsRemaining: 0, totalElapsed: 0 };
      expect(getHiitProgress(state, defaultConfig)).toBe(0);
    });

    it('returns 100 for done', () => {
      const state = { phase: 'done' as const, currentInterval: 3, secondsRemaining: 0, totalElapsed: 24 };
      expect(getHiitProgress(state, defaultConfig)).toBe(100);
    });

    it('returns 0 while still in prep', () => {
      const state = { phase: 'prep' as const, currentInterval: 0, secondsRemaining: 3, totalElapsed: 2 };
      const progress = getHiitProgress(state, defaultConfig);
      expect(progress).toBe(0);
    });

    it('returns progress percentage during effective session time', () => {
      // After prep (5s) + 1s in work = effective 1s
      const state = { phase: 'work' as const, currentInterval: 1, secondsRemaining: 4, totalElapsed: 6 };
      const progress = getHiitProgress(state, defaultConfig);
      // Effective total = 15 (3×5 work) + 6 (2×3 rest) = 21
      expect(progress).toBeCloseTo((1 / 21) * 100, 1);
    });
  });

  describe('getPhaseDuration', () => {
    it('returns correct durations', () => {
      expect(getPhaseDuration('prep', defaultConfig)).toBe(5);
      expect(getPhaseDuration('work', defaultConfig)).toBe(5);
      expect(getPhaseDuration('rest', defaultConfig)).toBe(3);
      expect(getPhaseDuration('idle', defaultConfig)).toBe(0);
      expect(getPhaseDuration('done', defaultConfig)).toBe(0);
    });
  });

  describe('getPhaseLabel', () => {
    it('returns Spanish labels', () => {
      expect(getPhaseLabel('idle')).toBe('Listo');
      expect(getPhaseLabel('prep')).toBe('Preparación');
      expect(getPhaseLabel('work')).toBe('Trabajo');
      expect(getPhaseLabel('rest')).toBe('Descanso');
      expect(getPhaseLabel('done')).toBe('Completado');
    });
  });
});
