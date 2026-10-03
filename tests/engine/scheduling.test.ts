import { describe, expect, it } from 'vitest';
import {
  PRIORITY_ALGORITHM_ID,
  PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  PROCESS_PRESETS,
  SJF_ALGORITHM_ID,
  SJF_ENGINE_ID,
  SRTF_ALGORITHM_ID,
  SRTF_ENGINE_ID,
  STARVATION_PRESET,
  priorityEngine,
  priorityPreemptiveEngine,
  simulateFcfs,
  simulatePriority,
  simulatePriorityPreemptive,
  simulateSjf,
  simulateSrtf,
  sjfEngine,
  srtfEngine,
  type Process,
  type ScheduleStepData,
} from '@/engine';
import type { SimulationRun } from '@/engine';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const p = (id: string, arrivalTime: number, burstTime: number, priority?: number): Process => ({
  id,
  name: id.toUpperCase(),
  arrivalTime,
  burstTime,
  ...(priority === undefined ? {} : { priority }),
});

/** Read a summary field, which the engine exposes as a widened numeric record. */
function summaryNumber(run: SimulationRun<ScheduleStepData>, key: string): number {
  return run.summary[key] ?? 0;
}

function lastData(run: SimulationRun<ScheduleStepData>): ScheduleStepData {
  const step = run.steps[run.steps.length - 1];
  if (!step) throw new Error('run produced no steps');
  return step.data;
}

function completionOrder(run: SimulationRun<ScheduleStepData>): [string, number][] {
  return lastData(run).results.map((result) => [result.processId, result.completionTime]);
}

function timelineOf(run: SimulationRun<ScheduleStepData>): [string | null, number, number][] {
  return lastData(run).timeline.map((segment) => [segment.processId, segment.start, segment.end]);
}

/** Every invariant a schedule must satisfy, whatever the policy. */
function expectWellFormed(run: SimulationRun<ScheduleStepData>, processes: readonly Process[]): void {
  const data = lastData(run);

  // 1. Every process completes exactly once.
  expect(data.results).toHaveLength(processes.length);
  expect(new Set(data.results.map((r) => r.processId)).size).toBe(processes.length);
  for (const process of processes) {
    expect(data.results.some((r) => r.processId === process.id)).toBe(true);
  }

  // 2. CPU time recorded equals the requested burst, and no process overlaps itself.
  for (const process of processes) {
    const busy = data.timeline
      .filter((segment) => segment.processId === process.id)
      .reduce((total, segment) => total + (segment.end - segment.start), 0);
    expect(busy, `${process.name} ran exactly its burst`).toBe(process.burstTime);
  }

  // 3. The chart is a contiguous, ordered timeline and never overlaps.
  const segments = data.timeline;
  for (let index = 1; index < segments.length; index += 1) {
    expect(segments[index]!.start).toBeGreaterThanOrEqual(segments[index - 1]!.end);
    expect(segments[index]!.end).toBeGreaterThan(segments[index]!.start);
  }

  // 4. Metrics are derived from the results, never invented.
  for (const result of data.results) {
    expect(result.turnaroundTime).toBe(result.completionTime - result.arrivalTime);
    expect(result.waitingTime).toBe(result.turnaroundTime - result.burstTime);
    expect(result.responseTime).toBeLessThanOrEqual(result.turnaroundTime);
    expect(result.waitingTime).toBeGreaterThanOrEqual(0);
  }

  const totalWaiting = data.results.reduce((total, r) => total + r.waitingTime, 0);
  expect(data.metrics.totalWaitingTime).toBeCloseTo(totalWaiting, 2);
  expect(run.summary.averageWaitingTime).toBeCloseTo(totalWaiting / processes.length, 2);
}

/* -------------------------------------------------------------------------- */
/* SJF (non-preemptive)                                                       */
/* -------------------------------------------------------------------------- */

describe('SJF non-preemptive', () => {
  it('orders simultaneous arrivals by shortest burst', () => {
    const workload = [p('p1', 0, 6), p('p2', 0, 8), p('p3', 0, 7), p('p4', 0, 3)];
    const run = simulateSjf({ processes: workload });

    expect(run.algorithmId).toBe(SJF_ALGORITHM_ID);
    expect(completionOrder(run)).toEqual([
      ['p4', 3],
      ['p1', 9],
      ['p3', 16],
      ['p2', 24],
    ]);
    expect(run.summary.averageWaitingTime).toBe(7);
    expect(run.summary.averageTurnaroundTime).toBe(13);
    expect(run.summary.makespan).toBe(24);
    expect(run.summary.idleTime).toBe(0);
    expect(run.summary.cpuUtilization).toBe(1);
    expect(run.summary.contextSwitches).toBe(3);
    expectWellFormed(run, workload);
  });

  it('beats FCFS on average waiting time for the classic example', () => {
    const workload = [p('p1', 0, 6), p('p2', 0, 8), p('p3', 0, 7), p('p4', 0, 3)];
    const sjf = simulateSjf({ processes: workload });
    const fcfs = simulateFcfs({ processes: workload });
    expect(fcfs.summary.averageWaitingTime).toBe(10.25);
    expect(summaryNumber(sjf, 'averageWaitingTime')).toBeLessThan(
      summaryNumber(fcfs, 'averageWaitingTime'),
    );
  });

  it('never preempts a running job when a shorter one arrives', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    const run = simulateSjf({ processes: workload });
    // P1 runs to completion from 0 to 7 even though shorter jobs arrive meanwhile.
    expect(timelineOf(run)).toEqual([
      ['p1', 0, 7],
      ['p3', 7, 8],
      ['p2', 8, 12],
      ['p4', 12, 16],
    ]);
    expect(run.summary.contextSwitches).toBe(3);
    expectWellFormed(run, workload);
  });

  it('breaks equal bursts by arrival order for determinism', () => {
    const workload = [p('p3', 5, 4), p('p2', 1, 4), p('p1', 0, 4)];
    const run = simulateSjf({ processes: workload });
    expect(completionOrder(run).map(([id]) => id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('records an idle gap when the CPU waits for the next arrival', () => {
    const workload = [p('p1', 3, 2), p('p2', 6, 1)];
    const run = simulateSjf({ processes: workload });
    // P1 runs 3→5; P2 has not arrived yet, so 5→6 is idle, then P2 runs 6→7.
    expect(timelineOf(run)).toEqual([
      ['p1', 3, 5],
      [null, 5, 6],
      ['p2', 6, 7],
    ]);
    expect(run.summary.idleTime).toBe(1);
    expect(run.summary.makespan).toBe(4);
    expect(run.summary.cpuUtilization).toBeCloseTo(3 / 4, 4);
    expectWellFormed(run, workload);
  });

  it('records the decision reason in every step', () => {
    const run = simulateSjf({ processes: [p('p1', 0, 5), p('p2', 0, 2)] });
    for (const step of run.steps) {
      expect(step.explanation?.length ?? 0).toBeGreaterThan(20);
      expect(step.description.length).toBeGreaterThan(10);
    }
    expect(run.steps[0]?.label).toBe('Ready queue initialised');
    expect(run.steps[1]?.label).toBe('P2 completes');
  });
});

/* -------------------------------------------------------------------------- */
/* SRTF (preemptive)                                                          */
/* -------------------------------------------------------------------------- */

describe('SRTF preemptive', () => {
  it('preempts a running job the moment a shorter one arrives', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    const run = simulateSrtf({ processes: workload });

    expect(run.algorithmId).toBe(SRTF_ALGORITHM_ID);
    expect(timelineOf(run)).toEqual([
      ['p1', 0, 2],
      ['p2', 2, 4],
      ['p3', 4, 5],
      ['p2', 5, 7],
      ['p4', 7, 11],
      ['p1', 11, 16],
    ]);
    expect(completionOrder(run)).toEqual([
      ['p3', 5],
      ['p2', 7],
      ['p4', 11],
      ['p1', 16],
    ]);
    expect(run.summary.averageWaitingTime).toBe(3);
    expect(run.summary.averageTurnaroundTime).toBe(7);
    // P1, P2 and P3 are dispatched the moment they arrive; only P4 waits (2 units).
    expect(run.summary.averageResponseTime).toBe(0.5);
    expect(run.summary.contextSwitches).toBe(5);
    expectWellFormed(run, workload);
  });

  it('labels preemptions and completions in order', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    const run = simulateSrtf({ processes: workload });
    expect(run.steps.map((step) => step.label)).toEqual([
      'Ready queue initialised',
      'P1 preempted',
      'P2 preempted',
      'P3 completes',
      'P2 completes',
      'P4 completes',
      'P1 completes',
    ]);
  });

  it('does not preempt on equal remaining time', () => {
    // P1 and P2 both need 4; P2 arrives while P1 still has 4 left.
    const workload = [p('p1', 0, 8), p('p2', 4, 4)];
    const run = simulateSrtf({ processes: workload });
    expect(timelineOf(run)).toEqual([
      ['p1', 0, 8],
      ['p2', 8, 12],
    ]);
    expect(run.summary.contextSwitches).toBe(1);
  });

  it('improves on SJF for staggered arrivals', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    const srtf = simulateSrtf({ processes: workload });
    const sjf = simulateSjf({ processes: workload });
    expect(summaryNumber(srtf, 'averageWaitingTime')).toBeLessThanOrEqual(
      summaryNumber(sjf, 'averageWaitingTime'),
    );
  });

  it('repeatedly preempts a long job behind a stream of short ones', () => {
    const run = simulateSrtf({ processes: STARVATION_PRESET });
    expect(completionOrder(run)).toEqual([
      ['p2', 4],
      ['p3', 7],
      ['p4', 10],
      ['p1', 22],
    ]);
    // P1 is preempted three times and only then allowed to finish.
    expect(run.summary.contextSwitches).toBe(6);
    const p1 = lastData(run).results.find((result) => result.processId === 'p1');
    expect(p1?.turnaroundTime).toBe(22);
    expectWellFormed(run, STARVATION_PRESET);
  });
});

/* -------------------------------------------------------------------------- */
/* Priority scheduling                                                        */
/* -------------------------------------------------------------------------- */

describe('priority scheduling (non-preemptive)', () => {
  const workload = [p('p1', 0, 4, 3), p('p2', 1, 3, 1), p('p3', 2, 2, 2)];

  it('runs the highest-priority ready process to completion', () => {
    const run = simulatePriority({ processes: workload });
    expect(run.algorithmId).toBe(PRIORITY_ALGORITHM_ID);
    expect(completionOrder(run)).toEqual([
      ['p1', 4],
      ['p2', 7],
      ['p3', 9],
    ]);
    expect(run.summary.makespan).toBe(9);
    expect(run.summary.contextSwitches).toBe(2);
    expectWellFormed(run, workload);
  });

  it('does not preempt when a higher-priority process arrives', () => {
    const run = simulatePriority({ processes: workload });
    // P1 keeps the CPU from 0 to 4 even though P2 (priority 1) arrives at t=1.
    expect(timelineOf(run)[0]).toEqual(['p1', 0, 4]);
  });

  it('breaks identical priorities by arrival order', () => {
    const same = [p('p1', 0, 3, 5), p('p2', 1, 3, 5), p('p3', 2, 3, 5)];
    const run = simulatePriority({ processes: same });
    expect(completionOrder(run).map(([id]) => id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('priority scheduling (preemptive)', () => {
  const workload = [p('p1', 0, 4, 3), p('p2', 1, 3, 1), p('p3', 2, 2, 2)];

  it('preempts the running process for a higher-priority arrival', () => {
    const run = simulatePriorityPreemptive({ processes: workload });
    expect(run.algorithmId).toBe(PRIORITY_PREEMPTIVE_ALGORITHM_ID);
    expect(timelineOf(run)).toEqual([
      ['p1', 0, 1],
      ['p2', 1, 4],
      ['p3', 4, 6],
      ['p1', 6, 9],
    ]);
    expect(completionOrder(run)).toEqual([
      ['p2', 4],
      ['p3', 6],
      ['p1', 9],
    ]);
    expect(run.summary.contextSwitches).toBe(3);
    expectWellFormed(run, workload);
  });

  it('does not preempt for an equal or lower priority', () => {
    const same = [p('p1', 0, 4, 2), p('p2', 1, 4, 5)];
    const run = simulatePriorityPreemptive({ processes: same });
    expect(timelineOf(run)).toEqual([
      ['p1', 0, 4],
      ['p2', 4, 8],
    ]);
  });

  it('starves a low-priority job behind a stream of high-priority ones', () => {
    const run = simulatePriorityPreemptive({ processes: STARVATION_PRESET });
    // P1 (priority 9) finishes last despite arriving first.
    expect(completionOrder(run).map(([id]) => id)).toEqual(['p2', 'p3', 'p4', 'p1']);
  });

  it('responds faster than the non-preemptive variant for urgent work', () => {
    const preemptive = simulatePriorityPreemptive({ processes: workload });
    const nonPreemptive = simulatePriority({ processes: workload });
    expect(summaryNumber(preemptive, 'averageResponseTime')).toBeLessThan(
      summaryNumber(nonPreemptive, 'averageResponseTime'),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Engine objects                                                             */
/* -------------------------------------------------------------------------- */

describe('engine objects', () => {
  const workload = [p('p1', 0, 4, 3), p('p2', 1, 3, 1)];

  it('expose stable identifiers and delegate to the simulation', () => {
    expect(sjfEngine.id).toBe(SJF_ENGINE_ID);
    expect(sjfEngine.algorithmId).toBe(SJF_ALGORITHM_ID);
    expect(srtfEngine.id).toBe(SRTF_ENGINE_ID);
    expect(srtfEngine.algorithmId).toBe(SRTF_ALGORITHM_ID);
    expect(priorityEngine.algorithmId).toBe(PRIORITY_ALGORITHM_ID);
    expect(priorityPreemptiveEngine.algorithmId).toBe(PRIORITY_PREEMPTIVE_ALGORITHM_ID);

    expect(sjfEngine.validate({ processes: workload })).toEqual({ valid: true });
    for (const engine of [sjfEngine, srtfEngine, priorityEngine, priorityPreemptiveEngine]) {
      expect(engine.run({ processes: workload }).steps.length).toBeGreaterThan(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Edge cases                                                                 */
/* -------------------------------------------------------------------------- */

describe('edge cases', () => {
  it('handles a single process', () => {
    for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
      const run = simulate({ processes: [p('p1', 4, 3, 2)] });
      expect(run.steps).toHaveLength(2);
      expect(completionOrder(run)).toEqual([['p1', 7]]);
      expect(run.summary.contextSwitches).toBe(0);
      expect(run.summary.makespan).toBe(3);
      expect(run.summary.idleTime).toBe(0);
      expectWellFormed(run, [p('p1', 4, 3, 2)]);
    }
  });

  it('handles every process arriving at the same time', () => {
    const workload = [p('p1', 0, 5), p('p2', 0, 3, 1), p('p3', 0, 4, 9)];
    for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
      const run = simulate({ processes: workload });
      expect(run.steps.length).toBeGreaterThanOrEqual(workload.length);
      expectWellFormed(run, workload);
    }
  });

  it('rejects an empty workload instead of returning nonsense', () => {
    for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
      expect(() => simulate({ processes: [] })).toThrow(/invalid input/i);
    }
  });

  it('rejects a zero or negative burst time', () => {
    for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
      expect(() => simulate({ processes: [p('p1', 0, 0)] })).toThrow(/invalid input/i);
      expect(() => simulate({ processes: [p('p1', 0, -3)] })).toThrow(/invalid input/i);
    }
  });

  it('rejects a fractional burst or arrival', () => {
    expect(() => simulateSjf({ processes: [p('p1', 0, 2.5)] })).toThrow(/invalid input/i);
    expect(() => simulateSrtf({ processes: [{ id: 'p1', name: 'P1', arrivalTime: 1.5, burstTime: 2 }] })).toThrow(
      /invalid input/i,
    );
  });

  it('rejects an out-of-range priority but accepts identical priorities', () => {
    expect(() => simulatePriority({ processes: [p('p1', 0, 2, 99)] })).toThrow(/invalid input/i);
    const identical = [p('p1', 0, 2, 4), p('p2', 0, 2, 4)];
    expect(simulatePriority({ processes: identical }).steps.length).toBeGreaterThan(0);
    expect(simulatePriorityPreemptive({ processes: identical }).steps.length).toBeGreaterThan(0);
  });

  it('treats a missing priority as the default value', () => {
    const workload: Process[] = [
      { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 2 },
      { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 2, priority: 1 },
    ];
    const run = simulatePriority({ processes: workload });
    // P2 declares priority 1, which beats the default, so it finishes first.
    expect(completionOrder(run).map(([id]) => id)).toEqual(['p2', 'p1']);
  });

  it('is deterministic', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
      const first = simulate({ processes: workload });
      const second = simulate({ processes: workload });
      expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
      expect(second.summary).toEqual(first.summary);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Comparison across every algorithm                                          */
/* -------------------------------------------------------------------------- */

describe('algorithm comparison', () => {
  const algorithms: readonly [string, (input: { processes: readonly Process[] }) => SimulationRun<ScheduleStepData>][] = [
    ['fcfs', simulateFcfs],
    ['sjf', simulateSjf],
    ['srtf', simulateSrtf],
    ['priority', simulatePriority],
    ['priority-preemptive', simulatePriorityPreemptive],
  ];

  it('schedules the same workload correctly under every non-quantum policy', () => {
    const workload = [p('p1', 0, 7), p('p2', 2, 4), p('p3', 4, 1), p('p4', 5, 4)];
    for (const [name, simulate] of algorithms) {
      const run = simulate({ processes: workload });
      expect(run.steps.length, `${name} produced steps`).toBeGreaterThan(1);
      expect(run.summary.makespan, `${name} makespan`).toBe(16);
      expectWellFormed(run, workload);
    }
  });

  it('produces different average waiting times, proving the policy matters', () => {
    const workload = [p('p1', 0, 6), p('p2', 0, 8), p('p3', 0, 7), p('p4', 0, 3)];
    const fcfs = summaryNumber(simulateFcfs({ processes: workload }), 'averageWaitingTime');
    const sjf = summaryNumber(simulateSjf({ processes: workload }), 'averageWaitingTime');
    const srtf = summaryNumber(simulateSrtf({ processes: workload }), 'averageWaitingTime');
    expect(sjf).toBeLessThan(fcfs);
    expect(srtf).toBeLessThanOrEqual(sjf);
  });

  it('reports every required metric from the engine', () => {
    const run = simulateSjf({ processes: [p('p1', 0, 4), p('p2', 1, 3)] });
    expect(run.summary).toMatchObject({
      makespan: expect.any(Number),
      idleTime: expect.any(Number),
      cpuUtilization: expect.any(Number),
      throughput: expect.any(Number),
      averageTurnaroundTime: expect.any(Number),
      averageWaitingTime: expect.any(Number),
      averageResponseTime: expect.any(Number),
      contextSwitches: expect.any(Number),
    });
    // Context switches are also exposed per step for the metrics panel.
    const withMetrics = run.steps.find((step) => step.metrics?.contextSwitches !== undefined);
    expect(withMetrics).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/* Predefined workloads                                                       */
/* -------------------------------------------------------------------------- */

describe('predefined workloads', () => {
  it('ships the required five categories plus the textbook cases', () => {
    const ids = PROCESS_PRESETS.map((preset) => preset.id);
    for (const required of ['simple', 'preemption', 'starvation', 'round-robin', 'mixed']) {
      expect(ids, `missing preset "${required}"`).toContain(required);
    }
    expect(PROCESS_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('runs every preset under every non-quantum policy without error', () => {
    for (const preset of PROCESS_PRESETS) {
      for (const simulate of [simulateSjf, simulateSrtf, simulatePriority, simulatePriorityPreemptive]) {
        const run = simulate({ processes: preset.processes });
        expectWellFormed(run, preset.processes);
      }
    }
  });
});
