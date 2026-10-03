import { describe, expect, it } from 'vitest';
import {
  ROUND_ROBIN_ALGORITHM_ID,
  ROUND_ROBIN_LAB_ID,
  roundRobinEngine,
  simulateFcfs,
  simulateRoundRobin,
  validateRoundRobinInput,
  type Process,
} from '@/engine';

/** P1(0,5) P2(1,4) P3(2,2) — the hand-computed reference case. */
const workload: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 5 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 4 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2 },
];

describe('validateRoundRobinInput', () => {
  it('accepts a valid workload and quantum', () => {
    expect(validateRoundRobinInput({ processes: workload, quantum: 2 })).toEqual({ valid: true });
  });

  it('rejects a non-positive or fractional quantum', () => {
    for (const quantum of [0, -1, 1.5]) {
      const result = validateRoundRobinInput({ processes: workload, quantum });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.issues.some((issue) => issue.path === 'quantum')).toBe(true);
      }
    }
  });

  it('rejects a quantum above the supported maximum', () => {
    const result = validateRoundRobinInput({ processes: workload, quantum: 99 });
    expect(result.valid).toBe(false);
  });

  it('reports process problems as well as quantum problems', () => {
    const result = validateRoundRobinInput({ processes: [], quantum: 2 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.path)).toContain('processes');
    }
  });
});

describe('simulateRoundRobin with quantum 2', () => {
  const run = simulateRoundRobin({ processes: workload, quantum: 2 });

  it('reports the algorithm and lab it belongs to', () => {
    expect(run.algorithmId).toBe(ROUND_ROBIN_ALGORITHM_ID);
    expect(run.labId).toBe(ROUND_ROBIN_LAB_ID);
    expect(run.input.quantum).toBe(2);
  });

  it('emits one initialisation step plus one step per time slice', () => {
    // Six slices: P1, P2, P3, P1, P2, P1.
    expect(run.steps).toHaveLength(7);
    expect(run.steps[0]?.label).toBe('Ready queue initialised');
    expect(run.steps.map((step) => step.label)).toEqual([
      'Ready queue initialised',
      'P1 preempted',
      'P2 preempted',
      'P3 completes',
      'P1 preempted',
      'P2 completes',
      'P1 completes',
    ]);
  });

  it('records the expected slices in order', () => {
    const last = run.steps[run.steps.length - 1];
    const timeline = last?.data.timeline ?? [];
    expect(timeline.map((segment) => [segment.label, segment.start, segment.end])).toEqual([
      ['P1', 0, 2],
      ['P2', 2, 4],
      ['P3', 4, 6],
      ['P1', 6, 8],
      ['P2', 8, 10],
      ['P1', 10, 11],
    ]);
  });

  it('computes turnaround, waiting and response time from the slices', () => {
    const last = run.steps[run.steps.length - 1];
    const results = last?.data.results ?? [];
    const find = (processId: string) => results.find((result) => result.processId === processId);

    // P1: first dispatched at 0, completes at 11
    expect(find('p1')).toMatchObject({
      startTime: 0,
      completionTime: 11,
      turnaroundTime: 11,
      waitingTime: 6,
      responseTime: 0,
    });
    // P2: first dispatched at 2, completes at 10
    expect(find('p2')).toMatchObject({
      startTime: 2,
      completionTime: 10,
      turnaroundTime: 9,
      waitingTime: 5,
      responseTime: 1,
    });
    // P3: fits inside one quantum, so it finishes in its first slice
    expect(find('p3')).toMatchObject({
      startTime: 4,
      completionTime: 6,
      turnaroundTime: 4,
      waitingTime: 2,
      responseTime: 2,
    });
  });

  it('orders results by completion time', () => {
    const results = run.steps[run.steps.length - 1]?.data.results ?? [];
    expect(results.map((result) => result.processId)).toEqual(['p3', 'p2', 'p1']);
  });

  it('summarises the run', () => {
    expect(run.summary.makespan).toBe(11);
    expect(run.summary.idleTime).toBe(0);
    expect(run.summary.cpuUtilization).toBe(1);
    expect(run.summary.averageTurnaroundTime).toBe(8);
    expect(run.summary.averageWaitingTime).toBe(4.33);
    expect(run.summary.averageResponseTime).toBe(1);
    expect(run.summary.timeSlices).toBe(6);
    expect(run.summary.contextSwitches).toBe(5);
  });

  it('tracks the ready queue through the run', () => {
    expect(run.steps[0]?.data.readyQueue).toEqual(['P1']);
    // P2 and P3 arrived during P1's slice, so they queue ahead of it.
    expect(run.steps[1]?.data.readyQueue).toEqual(['P2', 'P3', 'P1']);
    expect(run.steps[6]?.data.readyQueue).toEqual([]);
  });

  it('carries the quantum in the state parameters', () => {
    expect(run.state.parameters.quantum).toBe(2);
  });

  it('is deterministic', () => {
    const again = simulateRoundRobin({ processes: workload, quantum: 2 });
    expect(again.steps.map((step) => step.id)).toEqual(run.steps.map((step) => step.id));
    expect(again.summary).toEqual(run.summary);
  });
});

describe('quantum behaviour', () => {
  it('slices more finely with a quantum of 1', () => {
    const run = simulateRoundRobin({ processes: workload, quantum: 1 });
    expect(run.summary.timeSlices).toBe(11);
    expect(run.summary.contextSwitches).toBe(10);
    expect(run.summary.averageResponseTime).toBe(0.33);
  });

  it('degenerates to FCFS when the quantum exceeds every burst', () => {
    const rr = simulateRoundRobin({ processes: workload, quantum: 20 });
    const fcfs = simulateFcfs({ processes: workload });

    expect(rr.summary.timeSlices).toBe(3);
    expect(rr.summary.makespan).toBe(fcfs.summary.makespan);

    const rrLast = rr.steps[rr.steps.length - 1]?.data.results ?? [];
    const fcfsLast = fcfs.steps[fcfs.steps.length - 1]?.data.results ?? [];
    expect(rrLast.map((result) => [result.processId, result.completionTime])).toEqual(
      fcfsLast.map((result) => [result.processId, result.completionTime]),
    );
  });

  it('bounds response time by the number of processes ahead', () => {
    const run = simulateRoundRobin({ processes: workload, quantum: 2 });
    const results = run.steps[run.steps.length - 1]?.data.results ?? [];
    const worstCase = (workload.length - 1) * 2;

    for (const result of results) {
      expect(result.responseTime).toBeLessThanOrEqual(worstCase);
    }
    // The last process to arrive still gets its turn inside the bound.
    expect(results.find((result) => result.processId === 'p3')?.responseTime).toBe(2);
  });
});

describe('idle gaps', () => {
  it('jumps the clock to the next arrival and records the idle segment', () => {
    const run = simulateRoundRobin({
      processes: [
        { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 2 },
        { id: 'p2', name: 'P2', arrivalTime: 5, burstTime: 3 },
      ],
      quantum: 2,
    });

    const timeline = run.steps[run.steps.length - 1]?.data.timeline ?? [];
    expect(timeline.map((segment) => [segment.start, segment.end])).toEqual([
      [0, 2],
      [2, 5],
      [5, 7],
      [7, 8],
    ]);
    expect(timeline[1]?.processId).toBeNull();
    expect(run.summary.idleTime).toBe(3);
    expect(run.summary.makespan).toBe(8);
    expect(run.summary.cpuUtilization).toBeCloseTo(5 / 8, 4);
    expect(run.steps).toHaveLength(4);
  });
});

describe('edge cases', () => {
  it('handles a single process that fits in one quantum', () => {
    const run = simulateRoundRobin({
      processes: [{ id: 'p1', name: 'P1', arrivalTime: 3, burstTime: 2 }],
      quantum: 4,
    });
    expect(run.steps).toHaveLength(2);
    expect(run.summary.makespan).toBe(2);
    expect(run.summary.timeSlices).toBe(1);
    expect(run.summary.contextSwitches).toBe(0);
    expect(run.steps[0]?.clock).toBe(3);
  });

  it('finishes every process exactly once', () => {
    const run = simulateRoundRobin({
      processes: [
        { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 7 },
        { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 4 },
        { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1 },
        { id: 'p4', name: 'P4', arrivalTime: 5, burstTime: 4 },
      ],
      quantum: 3,
    });

    const results = run.steps[run.steps.length - 1]?.data.results ?? [];
    expect(results).toHaveLength(4);
    expect(new Set(results.map((result) => result.processId)).size).toBe(4);

    const scheduled = (run.steps[run.steps.length - 1]?.data.timeline ?? []).reduce(
      (total, segment) => total + (segment.end - segment.start),
      0,
    );
    expect(scheduled).toBe(16);
  });

  it('throws rather than returning nonsense for invalid input', () => {
    expect(() => simulateRoundRobin({ processes: [], quantum: 2 })).toThrow(/invalid input/i);
    expect(() => simulateRoundRobin({ processes: workload, quantum: 0 })).toThrow(/invalid input/i);
  });
});

describe('roundRobinEngine', () => {
  it('exposes metadata and delegates to the simulation', () => {
    expect(roundRobinEngine.id).toBe('round-robin-engine');
    expect(roundRobinEngine.algorithmId).toBe('round-robin');
    expect(roundRobinEngine.validate({ processes: workload, quantum: 4 })).toEqual({ valid: true });
    expect(roundRobinEngine.run({ processes: workload, quantum: 4 }).steps.length).toBeGreaterThan(1);
  });
});
