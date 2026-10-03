import { describe, expect, it } from 'vitest';
import {
  CONVOY_PRESET,
  FCFS_ALGORITHM_ID,
  FCFS_LAB_ID,
  FCFS_PRESET,
  computeMetrics,
  createProcess,
  fcfsEngine,
  makespan,
  orderByArrival,
  randomProcessSet,
  simulateFcfs,
  validateProcessInput,
  type Process,
} from '@/engine';

const textbook: readonly Process[] = FCFS_PRESET;

describe('validateProcessInput', () => {
  it('accepts a well-formed workload', () => {
    expect(validateProcessInput({ processes: textbook })).toEqual({ valid: true });
  });

  it('rejects an empty workload', () => {
    const result = validateProcessInput({ processes: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]?.path).toBe('processes');
    }
  });

  it('rejects duplicate ids', () => {
    const result = validateProcessInput({
      processes: [
        { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 1 },
        { id: 'p1', name: 'P2', arrivalTime: 0, burstTime: 1 },
      ],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.message.includes('duplicate'))).toBe(true);
    }
  });

  it('rejects negative arrivals and non-positive bursts', () => {
    const result = validateProcessInput({
      processes: [{ id: 'p1', name: 'P1', arrivalTime: -1, burstTime: 0 }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const paths = result.issues.map((issue) => issue.path);
      expect(paths).toContain('processes[0].arrivalTime');
      expect(paths).toContain('processes[0].burstTime');
    }
  });

  it('rejects fractional times', () => {
    const result = validateProcessInput({
      processes: [{ id: 'p1', name: 'P1', arrivalTime: 1.5, burstTime: 2.5 }],
    });
    expect(result.valid).toBe(false);
  });
});

describe('orderByArrival', () => {
  it('sorts by arrival then by name', () => {
    const ordered = orderByArrival([
      { id: 'b', name: 'P10', arrivalTime: 5, burstTime: 1 },
      { id: 'a', name: 'P2', arrivalTime: 5, burstTime: 1 },
      { id: 'c', name: 'P1', arrivalTime: 1, burstTime: 1 },
    ]);
    expect(ordered.map((process) => process.name)).toEqual(['P1', 'P2', 'P10']);
  });

  it('does not mutate the input', () => {
    const input = [...textbook];
    orderByArrival(input);
    expect(input.map((process) => process.id)).toEqual(textbook.map((process) => process.id));
  });
});

describe('simulateFcfs', () => {
  const run = simulateFcfs({ processes: textbook });

  it('reports the algorithm and lab it belongs to', () => {
    expect(run.algorithmId).toBe(FCFS_ALGORITHM_ID);
    expect(run.labId).toBe(FCFS_LAB_ID);
  });

  it('emits one initialisation step plus one step per process', () => {
    expect(run.steps).toHaveLength(textbook.length + 1);
    expect(run.steps[0]?.label).toBe('Ready queue initialised');
    expect(run.steps[1]?.label).toBe('P1 completes');
  });

  it('numbers steps sequentially with stable ids', () => {
    run.steps.forEach((step, index) => {
      expect(step.index).toBe(index);
      expect(step.id).toBe(`${step.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`);
    });
  });

  it('produces the textbook schedule', () => {
    expect(run.state.steps.map((step) => step.clock)).toEqual([0, 7, 11, 12, 16]);
    expect(run.summary.makespan).toBe(16);
    expect(run.summary.idleTime).toBe(0);
    expect(run.summary.averageTurnaroundTime).toBe(8.75);
    expect(run.summary.averageWaitingTime).toBe(4.75);
    expect(run.summary.cpuUtilization).toBe(1);
  });

  it('computes per-process timings correctly', () => {
    const last = run.steps[run.steps.length - 1];
    const results = last?.data.results ?? [];
    expect(results).toHaveLength(4);

    const [first, second, third, fourth] = results;
    expect(first).toMatchObject({ startTime: 0, completionTime: 7, turnaroundTime: 7, waitingTime: 0 });
    expect(second).toMatchObject({
      startTime: 7,
      completionTime: 11,
      turnaroundTime: 9,
      waitingTime: 5,
    });
    expect(third).toMatchObject({
      startTime: 11,
      completionTime: 12,
      turnaroundTime: 8,
      waitingTime: 7,
    });
    expect(fourth).toMatchObject({
      startTime: 12,
      completionTime: 16,
      turnaroundTime: 11,
      waitingTime: 7,
    });
  });

  it('records the ready queue shrinking as processes complete', () => {
    expect(run.steps[0]?.data.readyQueue).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(run.steps[1]?.data.readyQueue).toEqual(['P2', 'P3', 'P4']);
    expect(run.steps[4]?.data.readyQueue).toEqual([]);
  });

  it('keeps step snapshots immutable copies', () => {
    const firstTimeline = run.steps[1]?.data.timeline;
    const lastTimeline = run.steps[4]?.data.timeline;
    expect(firstTimeline).toHaveLength(1);
    expect(lastTimeline).toHaveLength(4);
    expect(firstTimeline).not.toBe(lastTimeline);
  });

  it('is deterministic', () => {
    const again = simulateFcfs({ processes: textbook });
    expect(again.steps.map((step) => step.id)).toEqual(run.steps.map((step) => step.id));
    expect(again.summary).toEqual(run.summary);
  });

  it('throws on invalid input rather than returning nonsense', () => {
    expect(() => simulateFcfs({ processes: [] })).toThrow(/invalid input/i);
  });
});

describe('idle gaps', () => {
  it('inserts an idle segment when the CPU waits for the next arrival', () => {
    const run = simulateFcfs({
      processes: [
        { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 2 },
        { id: 'p2', name: 'P2', arrivalTime: 5, burstTime: 3 },
      ],
    });

    const timeline = run.steps[run.steps.length - 1]?.data.timeline ?? [];
    expect(timeline.map((segment) => [segment.start, segment.end])).toEqual([
      [0, 2],
      [2, 5],
      [5, 8],
    ]);
    expect(timeline[1]?.processId).toBeNull();
    expect(run.summary.idleTime).toBe(3);
    expect(run.summary.makespan).toBe(8);
    expect(run.summary.cpuUtilization).toBeCloseTo(5 / 8, 4);
  });
});

describe('convoy effect', () => {
  it('quantifies the cost of one long job blocking short ones', () => {
    const run = simulateFcfs({ processes: CONVOY_PRESET });
    expect(run.summary.averageWaitingTime).toBe(9);
    expect(run.summary.makespan).toBe(18);
  });
});

describe('computeMetrics', () => {
  it('handles an empty schedule without dividing by zero', () => {
    const metrics = computeMetrics({ timeline: [], results: [] });
    expect(metrics.makespan).toBe(0);
    expect(metrics.cpuUtilization).toBe(0);
    expect(metrics.throughput).toBe(0);
    expect(metrics.averageWaitingTime).toBe(0);
  });

  it('derives makespan from the timeline', () => {
    expect(
      makespan([
        { id: 's1', processId: 'p1', label: 'P1', start: 2, end: 6 },
        { id: 's2', processId: 'p2', label: 'P2', start: 6, end: 9 },
      ]),
    ).toBe(7);
  });
});

describe('helpers', () => {
  it('creates conventionally named processes', () => {
    expect(createProcess(0, 0, 5)).toEqual({ id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 5 });
  });

  it('generates reproducible random workloads', () => {
    const first = randomProcessSet(12345, 4);
    const second = randomProcessSet(12345, 4);
    expect(first).toHaveLength(4);
    expect(first).toEqual(second);
    expect(validateProcessInput({ processes: first })).toEqual({ valid: true });
  });
});

describe('fcfsEngine', () => {
  it('exposes metadata and delegates to the simulation', () => {
    expect(fcfsEngine.id).toBe('fcfs-engine');
    expect(fcfsEngine.algorithmId).toBe(FCFS_ALGORITHM_ID);
    expect(fcfsEngine.validate({ processes: textbook })).toEqual({ valid: true });
    const run = fcfsEngine.run({ processes: textbook });
    expect(run.steps.length).toBe(textbook.length + 1);
  });
});
