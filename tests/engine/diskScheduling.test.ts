import { describe, expect, it } from 'vitest';
import {
  DISK_ALGORITHMS,
  DISK_PRESETS,
  buildDiskChallenges,
  compareDiskScheduling,
  diskMoves,
  diskMovementByAlgorithm,
  diskServiceOrder,
  diskSchedulingEngine,
  diskTotalMovement,
  runDiskScheduling,
  validateDiskInput,
  type DiskAlgorithm,
  type DiskInput,
} from '@/engine';

const CLASSIC: readonly number[] = [98, 183, 37, 122, 14, 124, 65, 67];

function input(algorithm: DiskAlgorithm, overrides: Partial<DiskInput> = {}): DiskInput {
  return { algorithm, diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up', ...overrides };
}

function orderOf(value: DiskInput): number[] {
  return runDiskScheduling(value).steps
    .map((step) => step.data.servedCylinder)
    .filter((cylinder): cylinder is number => cylinder !== null);
}

/* -------------------------------------------------------------------------- */
/* Structure                                                                   */
/* -------------------------------------------------------------------------- */

describe('disk run structure', () => {
  it('emits an initial step plus one step per head movement', () => {
    const run = runDiskScheduling(input('fcfs'));
    expect(run.steps[0]?.data.event).toBe('init');
    expect(run.steps.length).toBe(diskMoves(input('fcfs')).length + 1);
    expect(run.steps.length).toBe(CLASSIC.length + 1);
  });

  it('reports the algorithm id that matches the policy', () => {
    expect(runDiskScheduling(input('fcfs')).algorithmId).toBe('fcfs-disk');
    expect(runDiskScheduling(input('sstf')).algorithmId).toBe('sstf');
    expect(runDiskScheduling(input('scan')).algorithmId).toBe('scan');
    expect(runDiskScheduling(input('c-scan')).algorithmId).toBe('c-scan');
    expect(runDiskScheduling(input('look')).algorithmId).toBe('look');
    expect(runDiskScheduling(input('c-look')).algorithmId).toBe('c-look');
    expect(runDiskScheduling(input('fcfs')).labId).toBe('lab-disk-scheduling');
  });

  it('records the distance of every movement and its running total', () => {
    const run = runDiskScheduling(input('scan'));
    let running = 0;
    for (const step of run.steps.slice(1)) {
      const movement = Math.abs(step.data.head - step.data.previousHead);
      running += movement;
      expect(step.data.movement).toBe(movement);
      expect(step.data.totalMovement).toBe(running);
    }
    expect(running).toBe(run.summary.totalMovement);
  });

  it('services every requested cylinder exactly once, as a permutation of the queue', () => {
    for (const algorithm of DISK_ALGORITHMS) {
      const order = orderOf(input(algorithm));
      expect([...order].sort((a, b) => a - b)).toEqual([...CLASSIC].sort((a, b) => a - b));
    }
  });

  it('is deterministic', () => {
    for (const algorithm of DISK_ALGORITHMS) {
      const first = runDiskScheduling(input(algorithm));
      const second = runDiskScheduling(input(algorithm));
      expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
      expect(second.summary).toEqual(first.summary);
    }
  });

  it('exposes the engine through the standard contract', () => {
    expect(diskSchedulingEngine.validate(input('fcfs'))).toEqual({ valid: true });
    expect(diskSchedulingEngine.run(input('fcfs')).steps.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* FCFS                                                                        */
/* -------------------------------------------------------------------------- */

describe('FCFS', () => {
  it('services the queue in arrival order', () => {
    expect(orderOf(input('fcfs'))).toEqual([...CLASSIC]);
  });

  it('totals 640 cylinders over the classic queue', () => {
    expect(diskTotalMovement(input('fcfs'))).toBe(640);
    expect(runDiskScheduling(input('fcfs')).summary.totalMovement).toBe(640);
  });

  it('ignores the sweep direction', () => {
    expect(diskTotalMovement(input('fcfs', { direction: 'down' }))).toBe(640);
  });
});

/* -------------------------------------------------------------------------- */
/* SSTF                                                                        */
/* -------------------------------------------------------------------------- */

describe('SSTF', () => {
  it('always serves the nearest request, breaking ties toward the lower cylinder', () => {
    expect(orderOf(input('sstf'))).toEqual([65, 67, 37, 14, 98, 122, 124, 183]);
  });

  it('totals 236 cylinders — the least of the six here', () => {
    expect(diskTotalMovement(input('sstf'))).toBe(236);
  });

  it('ignores the sweep direction', () => {
    expect(diskTotalMovement(input('sstf', { direction: 'down' }))).toBe(236);
  });

  it('starves a far request behind a cluster near the head', () => {
    const starvation: DiskInput = {
      algorithm: 'sstf',
      diskSize: 200,
      head: 50,
      requests: [10, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      direction: 'up',
    };
    const order = orderOf(starvation);
    expect(order[order.length - 1]).toBe(10);
    expect(order[0]).toBe(51);
  });
});

/* -------------------------------------------------------------------------- */
/* SCAN & LOOK                                                                 */
/* -------------------------------------------------------------------------- */

describe('SCAN and LOOK', () => {
  it('SCAN sweeps to the edge before reversing', () => {
    expect(orderOf(input('scan'))).toEqual([65, 67, 98, 122, 124, 183, 37, 14]);
    expect(diskTotalMovement(input('scan'))).toBe(331);
    const edgeStep = runDiskScheduling(input('scan')).steps.find((step) => step.data.event === 'turn');
    expect(edgeStep?.data.head).toBe(199);
    expect(edgeStep?.data.servedCylinder).toBeNull();
  });

  it('LOOK reverses at the last request and never visits the edge', () => {
    expect(orderOf(input('look'))).toEqual([65, 67, 98, 122, 124, 183, 37, 14]);
    expect(diskTotalMovement(input('look'))).toBe(299);
    expect(
      runDiskScheduling(input('look')).steps.some(
        (step) => step.data.event === 'turn' || step.data.event === 'wrap',
      ),
    ).toBe(false);
  });

  it('LOOK never moves further than SCAN on the same queue and direction', () => {
    for (const direction of ['up', 'down'] as const) {
      expect(diskTotalMovement(input('look', { direction }))).toBeLessThanOrEqual(
        diskTotalMovement(input('scan', { direction })),
      );
    }
  });

  it('honours the sweep direction', () => {
    expect(orderOf(input('scan', { direction: 'down' }))).toEqual([37, 14, 65, 67, 98, 122, 124, 183]);
    expect(diskTotalMovement(input('scan', { direction: 'down' }))).toBe(236);
    expect(orderOf(input('look', { direction: 'down' }))).toEqual([37, 14, 65, 67, 98, 122, 124, 183]);
    expect(diskTotalMovement(input('look', { direction: 'down' }))).toBe(208);
  });

  it('reverses immediately when nothing lies ahead under LOOK', () => {
    const value: DiskInput = {
      algorithm: 'look',
      diskSize: 200,
      head: 10,
      requests: [5, 3],
      direction: 'up',
    };
    expect(orderOf(value)).toEqual([5, 3]);
    expect(diskTotalMovement(value)).toBe(7);
    expect(
      runDiskScheduling(value).steps.some((step) => step.data.event === 'turn' || step.data.event === 'wrap'),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* C-SCAN & C-LOOK                                                             */
/* -------------------------------------------------------------------------- */

describe('C-SCAN and C-LOOK', () => {
  it('C-SCAN sweeps one way and returns without servicing', () => {
    expect(orderOf(input('c-scan'))).toEqual([65, 67, 98, 122, 124, 183, 14, 37]);
    expect(diskTotalMovement(input('c-scan'))).toBe(382);
    const wrap = runDiskScheduling(input('c-scan')).steps.find((step) => step.data.event === 'wrap');
    expect(wrap?.data.previousHead).toBe(199);
    expect(wrap?.data.head).toBe(0);
    expect(wrap?.data.servedCylinder).toBeNull();
  });

  it('C-LOOK jumps straight to the lowest pending request', () => {
    expect(orderOf(input('c-look'))).toEqual([65, 67, 98, 122, 124, 183, 14, 37]);
    expect(diskTotalMovement(input('c-look'))).toBe(322);
    const wrap = runDiskScheduling(input('c-look')).steps.find((step) => step.data.event === 'wrap');
    expect(wrap?.data.previousHead).toBe(183);
    expect(wrap?.data.head).toBe(14);
  });

  it('C-LOOK never moves further than C-SCAN', () => {
    for (const direction of ['up', 'down'] as const) {
      expect(diskTotalMovement(input('c-look', { direction }))).toBeLessThanOrEqual(
        diskTotalMovement(input('c-scan', { direction })),
      );
    }
  });

  it('sweeps strictly in one direction — no reversal event', () => {
    for (const algorithm of ['c-scan', 'c-look'] as const) {
      const steps = runDiskScheduling(input(algorithm)).steps;
      const directions = new Set(steps.map((step) => step.data.direction));
      expect(directions.size).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Edge cases                                                                  */
/* -------------------------------------------------------------------------- */

describe('edge cases', () => {
  it('handles a single request', () => {
    const value: DiskInput = { algorithm: 'scan', diskSize: 100, head: 50, requests: [80], direction: 'up' };
    expect(orderOf(value)).toEqual([80]);
    // The single request lies ahead, so SCAN serves it and stops — no edge trip.
    expect(diskTotalMovement(value)).toBe(30);
  });

  it('services a request at the current head for zero cost first', () => {
    const value: DiskInput = {
      algorithm: 'sstf',
      diskSize: 100,
      head: 50,
      requests: [50, 90],
      direction: 'up',
    };
    expect(orderOf(value)).toEqual([50, 90]);
    expect(diskTotalMovement(value)).toBe(40);
  });

  it('treats duplicate requests as separate services', () => {
    const value: DiskInput = {
      algorithm: 'fcfs',
      diskSize: 100,
      head: 0,
      requests: [10, 10, 20],
      direction: 'up',
    };
    expect(orderOf(value)).toEqual([10, 10, 20]);
    // 10, then a zero-length hop to the duplicate, then 10 more.
    expect(diskTotalMovement(value)).toBe(20);
  });

  it('handles an empty-sweep LOOK where every request lies behind the head', () => {
    const value: DiskInput = {
      algorithm: 'c-look',
      diskSize: 200,
      head: 150,
      requests: [10, 20],
      direction: 'up',
    };
    expect(orderOf(value)).toEqual([10, 20]);
  });

  it('is at its smallest disk size', () => {
    const value: DiskInput = {
      algorithm: 'scan',
      diskSize: 16,
      head: 8,
      requests: [1, 15],
      direction: 'up',
    };
    expect(orderOf(value)).toEqual([15, 1]);
    expect(runDiskScheduling(value).summary.serviced).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

describe('validation', () => {
  it('accepts a well-formed input', () => {
    expect(validateDiskInput(input('fcfs'))).toEqual({ valid: true });
  });

  it('rejects an unknown algorithm', () => {
    expect(validateDiskInput({ ...input('fcfs'), algorithm: 'nope' as never }).valid).toBe(false);
  });

  it('rejects an out-of-range disk size or head', () => {
    expect(validateDiskInput({ ...input('fcfs'), diskSize: 5 }).valid).toBe(false);
    expect(validateDiskInput({ ...input('fcfs'), head: 200 }).valid).toBe(false);
    expect(validateDiskInput({ ...input('fcfs'), head: -1 }).valid).toBe(false);
  });

  it('rejects an out-of-range direction, empty queue and out-of-range requests', () => {
    expect(validateDiskInput({ ...input('fcfs'), direction: 'sideways' as never }).valid).toBe(false);
    expect(validateDiskInput({ ...input('fcfs'), requests: [] }).valid).toBe(false);
    expect(validateDiskInput({ ...input('fcfs'), requests: [200] }).valid).toBe(false);
    expect(validateDiskInput({ ...input('fcfs'), requests: [-3] }).valid).toBe(false);
    expect(
      validateDiskInput({ ...input('fcfs'), requests: Array.from({ length: 25 }, () => 1) }).valid,
    ).toBe(false);
  });

  it('throws when run with invalid input', () => {
    expect(() => runDiskScheduling({ ...input('fcfs'), diskSize: 1 })).toThrow(/invalid input/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Comparison                                                                  */
/* -------------------------------------------------------------------------- */

describe('comparison', () => {
  it('runs every policy over the same scenario', () => {
    const outcomes = compareDiskScheduling({ diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' });
    expect(outcomes.map((outcome) => outcome.algorithm)).toEqual(DISK_ALGORITHMS);
    for (const outcome of outcomes) {
      expect(outcome.order).toHaveLength(CLASSIC.length);
      expect(outcome.averageSeek).toBeCloseTo(outcome.totalMovement / CLASSIC.length, 6);
    }
  });

  it('agrees with the per-policy totals', () => {
    const scenario = { diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' as const };
    const byAlgorithm = diskMovementByAlgorithm(scenario);
    const expected: Record<DiskAlgorithm, number> = {
      fcfs: 640,
      sstf: 236,
      scan: 331,
      'c-scan': 382,
      look: 299,
      'c-look': 322,
    };
    expect(byAlgorithm).toEqual(expected);
  });

  it('ranks SSTF lowest on total movement for the classic queue sweeping up', () => {
    const outcomes = compareDiskScheduling({ diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' });
    const lowest = outcomes.reduce((best, outcome) =>
      outcome.totalMovement < best.totalMovement ? outcome : best,
    );
    expect(lowest.algorithm).toBe('sstf');
  });
});

/* -------------------------------------------------------------------------- */
/* Presets & challenges                                                        */
/* -------------------------------------------------------------------------- */

describe('presets and challenges', () => {
  it('runs every preset without error', () => {
    for (const preset of DISK_PRESETS) {
      expect(runDiskScheduling(preset.input).steps.length).toBeGreaterThan(0);
    }
  });

  it('produces well-formed, deterministic challenges', () => {
    const challenges = buildDiskChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(10);
    for (const challenge of challenges) {
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(new Set(challenge.options).size).toBe(challenge.options.length);
      expect(validateDiskInput(challenge.input)).toEqual({ valid: true });
    }
    expect(buildDiskChallenges().map((item) => item.correctIndex)).toEqual(
      challenges.map((item) => item.correctIndex),
    );
  });

  it('gets the numeric and policy answers right', () => {
    const byId = new Map(buildDiskChallenges().map((challenge) => [challenge.id, challenge]));
    const answer = (id: string): string | undefined => {
      const challenge = byId.get(id);
      return challenge ? challenge.options[challenge.correctIndex] : undefined;
    };
    expect(answer('disk-fcfs-total')).toBe('640');
    expect(answer('disk-sstf-total')).toBe('236');
    expect(answer('disk-min-movement')).toBe('SSTF');
    expect(answer('disk-sstf-first')).toBe('65');
    expect(answer('disk-starvation')).toBe('SSTF');
    expect(answer('disk-fcfs-average')).toBe('80');
    expect(answer('disk-cscan-return')).toMatch(/^It returns to the start/);
    expect(answer('disk-direction')).toMatch(/SCAN, C-SCAN, LOOK and C-LOOK/);
  });

  it('exposes a service order helper that matches the run', () => {
    expect(diskServiceOrder(input('fcfs'))).toEqual(orderOf(input('fcfs')));
  });
});
