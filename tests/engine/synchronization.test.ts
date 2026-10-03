import { describe, expect, it } from 'vitest';
import {
  PHILOSOPHERS_PRESETS,
  PRODUCER_CONSUMER_PRESETS,
  RACE_PRESETS,
  READERS_WRITERS_PRESETS,
  philosophersEngine,
  producerConsumerEngine,
  raceEngine,
  readersWritersEngine,
  runPhilosophers,
  runProducerConsumer,
  runRace,
  runReadersWriters,
  validatePhilosophersInput,
  validateProducerConsumerInput,
  validateRaceInput,
  validateReadersWritersInput,
  type RaceStepData,
  type SyncStepData,
} from '@/engine';
import type { SimulationRun } from '@/engine';

function stepIds(run: SimulationRun<SyncStepData>): string[] {
  return run.steps.map((step) => step.id);
}

/* -------------------------------------------------------------------------- */
/* Race conditions                                                            */
/* -------------------------------------------------------------------------- */

describe('race conditions', () => {
  it('loses updates without protection', () => {
    const run = runRace({ mode: 'unsafe', iterations: 2, processCount: 2 });
    expect(run.summary.expected).toBe(4);
    expect(run.summary.finalCounter).toBe(2);
    expect(run.summary.lostUpdates).toBeGreaterThan(0);
    expect(run.summary.correct).toBe(0);
    const last = run.steps[run.steps.length - 1]?.data as RaceStepData;
    expect(last.correct).toBe(false);
    expect(last.counter).toBe(2);
    expect(last.expected).toBe(4);
  });

  it('keeps every increment with a mutex', () => {
    const run = runRace({ mode: 'mutex', iterations: 2, processCount: 2 });
    expect(run.summary.finalCounter).toBe(4);
    expect(run.summary.lostUpdates).toBe(0);
    expect(run.summary.correct).toBe(1);
  });

  it('keeps every increment with a semaphore', () => {
    const run = runRace({ mode: 'semaphore', iterations: 2, processCount: 2 });
    expect(run.summary.finalCounter).toBe(4);
    expect(run.summary.lostUpdates).toBe(0);
  });

  it('never lets two processes into the critical section at once', () => {
    for (const mode of ['mutex', 'semaphore'] as const) {
      const run = runRace({ mode, iterations: 2, processCount: 3 });
      for (const step of run.steps) {
        const data = step.data as RaceStepData;
        const active = data.actors.filter((actor) => actor.state === 'running');
        // At most the lock holder may be running inside the critical section.
        if (data.criticalSectionOwner !== null) {
          expect(active.length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('loses more updates with a third process', () => {
    const two = runRace({ mode: 'unsafe', iterations: 2, processCount: 2 });
    const three = runRace({ mode: 'unsafe', iterations: 2, processCount: 3 });
    expect(Number(three.summary.lostUpdates)).toBeGreaterThan(Number(two.summary.lostUpdates));
  });

  it('records a lock resource only in protected modes', () => {
    const unsafe = runRace({ mode: 'unsafe', iterations: 1, processCount: 2 });
    const mutex = runRace({ mode: 'mutex', iterations: 1, processCount: 2 });
    const unsafeResources = (unsafe.steps[0]?.data as RaceStepData).resources.map((r) => r.name);
    const mutexResources = (mutex.steps[0]?.data as RaceStepData).resources.map((r) => r.name);
    expect(unsafeResources).not.toContain('mutex');
    expect(mutexResources).toContain('mutex');
  });

  it('is deterministic', () => {
    const first = runRace({ mode: 'unsafe', iterations: 2, processCount: 2 });
    const second = runRace({ mode: 'unsafe', iterations: 2, processCount: 2 });
    expect(stepIds(second)).toEqual(stepIds(first));
    expect(second.summary).toEqual(first.summary);
  });

  it('validates its input', () => {
    expect(validateRaceInput({ mode: 'unsafe', iterations: 2, processCount: 2 })).toEqual({ valid: true });
    expect(validateRaceInput({ mode: 'unsafe', iterations: 0, processCount: 2 }).valid).toBe(false);
    expect(validateRaceInput({ mode: 'unsafe', iterations: 2, processCount: 1 }).valid).toBe(false);
    expect(
      validateRaceInput({ mode: 'wat' as never, iterations: 2, processCount: 2 }).valid,
    ).toBe(false);
    expect(() => runRace({ mode: 'unsafe', iterations: 9, processCount: 2 })).toThrow(/invalid input/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Producer / consumer                                                        */
/* -------------------------------------------------------------------------- */

describe('producer / consumer', () => {
  const buffers = PRODUCER_CONSUMER_PRESETS.map((preset) => runProducerConsumer(preset.input));

  it('never exceeds the buffer capacity and accounts for every item', () => {
    for (const run of buffers) {
      for (const step of run.steps) {
        const data = step.data;
        if (data.kind !== 'producer-consumer') continue;
        const count = data.buffer.filter((item) => item !== null).length;
        expect(data.buffer).toHaveLength(data.capacity);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(data.capacity);
        expect(data.produced - data.consumed).toBe(count);
      }
    }
  });

  it('finishes with the steady pair draining everything it produced', () => {
    const run = runProducerConsumer(PRODUCER_CONSUMER_PRESETS[0]!.input);
    expect(run.summary.produced).toBe(4);
    expect(run.summary.consumed).toBe(4);
    expect(run.summary.buffered).toBe(0);
  });

  it('throttles a producer when the buffer fills', () => {
    const run = runProducerConsumer({
      capacity: 1,
      producers: 2,
      consumers: 1,
      itemsPerProducer: 4,
      itemsPerConsumer: 4,
    });
    const blockedOnEmpty = run.steps.some(
      (step) => step.label.includes('blocks on empty') || step.label.includes('blocks on full'),
    );
    expect(blockedOnEmpty).toBe(true);
  });

  it('is deterministic', () => {
    const first = runProducerConsumer(PRODUCER_CONSUMER_PRESETS[1]!.input);
    const second = runProducerConsumer(PRODUCER_CONSUMER_PRESETS[1]!.input);
    expect(stepIds(second)).toEqual(stepIds(first));
    expect(second.summary).toEqual(first.summary);
  });

  it('validates its input', () => {
    expect(
      validateProducerConsumerInput({
        capacity: 2,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 2,
        itemsPerConsumer: 2,
      }),
    ).toEqual({ valid: true });
    expect(
      validateProducerConsumerInput({
        capacity: 0,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 2,
        itemsPerConsumer: 2,
      }).valid,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Dining philosophers                                                        */
/* -------------------------------------------------------------------------- */

describe('dining philosophers', () => {
  it('deadlocks when everyone takes the left fork first', () => {
    const run = runPhilosophers({ philosophers: 5, meals: 2, strategy: 'naive' });
    expect(run.summary.deadlocked).toBe(1);
    const last = run.steps[run.steps.length - 1]?.data;
    expect(last?.kind === 'philosophers' && last.deadlocked).toBe(true);
  });

  it('makes progress with ordered forks', () => {
    const run = runPhilosophers({ philosophers: 5, meals: 2, strategy: 'ordered' });
    expect(run.summary.deadlocked).toBe(0);
    expect(run.summary.meals).toBe(10);
  });

  it('makes progress with a limited table', () => {
    const run = runPhilosophers({ philosophers: 5, meals: 2, strategy: 'limited' });
    expect(run.summary.deadlocked).toBe(0);
    expect(run.summary.meals).toBe(10);
  });

  it('keeps every fork single-owner and every philosopher holding at most two', () => {
    for (const preset of PHILOSOPHERS_PRESETS) {
      const run = runPhilosophers(preset.input);
      for (const step of run.steps) {
        const data = step.data;
        if (data.kind !== 'philosophers') continue;
        const forkIds = data.forks.map((fork) => fork.id);
        expect(new Set(forkIds).size).toBe(forkIds.length);
        for (const philosopher of data.philosophers) {
          expect(philosopher.holds.length).toBeLessThanOrEqual(2);
          expect(new Set(philosopher.holds).size).toBe(philosopher.holds.length);
          for (const fork of philosopher.holds) expect(forkIds).toContain(fork);
        }
      }
    }
  });

  it('is deterministic', () => {
    const first = runPhilosophers({ philosophers: 5, meals: 2, strategy: 'ordered' });
    const second = runPhilosophers({ philosophers: 5, meals: 2, strategy: 'ordered' });
    expect(stepIds(second)).toEqual(stepIds(first));
  });

  it('validates its input', () => {
    expect(validatePhilosophersInput({ philosophers: 5, meals: 2, strategy: 'naive' })).toEqual({
      valid: true,
    });
    expect(validatePhilosophersInput({ philosophers: 2, meals: 2, strategy: 'naive' }).valid).toBe(false);
    expect(
      validatePhilosophersInput({ philosophers: 5, meals: 2, strategy: 'nope' as never }).valid,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Readers / writers                                                          */
/* -------------------------------------------------------------------------- */

describe('readers / writers', () => {
  it('never lets a writer share the data', () => {
    for (const preset of READERS_WRITERS_PRESETS) {
      const run = runReadersWriters(preset.input);
      for (const step of run.steps) {
        const data = step.data;
        if (data.kind !== 'readers-writers') continue;
        if (data.writer !== null) {
          expect(data.readers).toBe(0);
          expect(data.readCount).toBe(0);
        }
      }
    }
  });

  it('lets readers overlap', () => {
    const run = runReadersWriters({ readers: 3, writers: 1, reads: 2, writes: 1 });
    const overlap = run.steps.some(
      (step) => step.data.kind === 'readers-writers' && step.data.readers > 1,
    );
    expect(overlap).toBe(true);
  });

  it('completes the requested operations', () => {
    const run = runReadersWriters({ readers: 2, writers: 1, reads: 2, writes: 1 });
    expect(run.summary.completedReads).toBe(4);
    expect(run.summary.completedWrites).toBe(1);
  });

  it('is deterministic', () => {
    const first = runReadersWriters(READERS_WRITERS_PRESETS[1]!.input);
    const second = runReadersWriters(READERS_WRITERS_PRESETS[1]!.input);
    expect(stepIds(second)).toEqual(stepIds(first));
    expect(second.summary).toEqual(first.summary);
  });

  it('validates its input', () => {
    expect(validateReadersWritersInput({ readers: 2, writers: 1, reads: 2, writes: 1 })).toEqual({
      valid: true,
    });
    expect(validateReadersWritersInput({ readers: 0, writers: 1, reads: 2, writes: 1 }).valid).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Presets and engines                                                        */
/* -------------------------------------------------------------------------- */

describe('synchronization presets and engines', () => {
  it('runs every preset without error', () => {
    for (const preset of RACE_PRESETS) expect(runRace(preset.input).steps.length).toBeGreaterThan(1);
    for (const preset of PRODUCER_CONSUMER_PRESETS) {
      expect(runProducerConsumer(preset.input).steps.length).toBeGreaterThan(1);
    }
    for (const preset of PHILOSOPHERS_PRESETS) {
      expect(runPhilosophers(preset.input).steps.length).toBeGreaterThan(1);
    }
    for (const preset of READERS_WRITERS_PRESETS) {
      expect(runReadersWriters(preset.input).steps.length).toBeGreaterThan(1);
    }
  });

  it('ships unique preset ids', () => {
    const ids = [
      ...RACE_PRESETS,
      ...PRODUCER_CONSUMER_PRESETS,
      ...PHILOSOPHERS_PRESETS,
      ...READERS_WRITERS_PRESETS,
    ].map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes engine objects that delegate to their simulations', () => {
    expect(raceEngine.algorithmId).toBe('mutex');
    expect(producerConsumerEngine.algorithmId).toBe('bounded-buffer');
    expect(philosophersEngine.algorithmId).toBe('dining-philosophers');
    expect(readersWritersEngine.algorithmId).toBe('readers-writers');
    expect(raceEngine.run(RACE_PRESETS[0]!.input).steps.length).toBeGreaterThan(1);
    expect(producerConsumerEngine.validate(PRODUCER_CONSUMER_PRESETS[0]!.input)).toEqual({ valid: true });
  });
});
