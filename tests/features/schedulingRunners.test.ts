import { describe, expect, it } from 'vitest';
import {
  PRIORITY_ALGORITHM_ID,
  PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  ROUND_ROBIN_ALGORITHM_ID,
  SJF_ALGORITHM_ID,
  SRTF_ALGORITHM_ID,
  simulateFcfs,
  type Process,
} from '@/engine';
import {
  SCHEDULING_ALGORITHM_IDS,
  isSchedulingAlgorithm,
  runSchedulingAlgorithm,
  validateSchedulingInput,
} from '@/features/scheduling/algorithmRunners';

const workload: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 7, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 4, priority: 1 },
  { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1, priority: 2 },
  { id: 'p4', name: 'P4', arrivalTime: 5, burstTime: 4, priority: 4 },
];

describe('scheduling algorithm dispatcher', () => {
  it('lists all six policies in curriculum order', () => {
    expect(SCHEDULING_ALGORITHM_IDS).toEqual([
      'fcfs',
      SJF_ALGORITHM_ID,
      SRTF_ALGORITHM_ID,
      ROUND_ROBIN_ALGORITHM_ID,
      PRIORITY_ALGORITHM_ID,
      PRIORITY_PREEMPTIVE_ALGORITHM_ID,
    ]);
  });

  it('reports which ids it can run', () => {
    for (const id of SCHEDULING_ALGORITHM_IDS) {
      expect(isSchedulingAlgorithm(id), id).toBe(true);
    }
    expect(isSchedulingAlgorithm('fork-exec')).toBe(false);
    expect(isSchedulingAlgorithm('')).toBe(false);
  });

  it('runs every policy on the same workload and tags the run with its algorithm', () => {
    for (const id of SCHEDULING_ALGORITHM_IDS) {
      const run = runSchedulingAlgorithm(id, { processes: workload, quantum: 2 });
      expect(run, `${id} should run`).not.toBeNull();
      expect(run!.algorithmId).toBe(id);
      expect(run!.steps.length).toBeGreaterThan(1);
      expect(run!.summary.makespan).toBe(16);
    }
  });

  it('produces exactly the same result as calling the engine directly', () => {
    const direct = simulateFcfs({ processes: workload });
    const dispatched = runSchedulingAlgorithm('fcfs', { processes: workload, quantum: 2 });
    expect(dispatched?.summary).toEqual(direct.summary);
    expect(dispatched?.steps.map((step) => step.id)).toEqual(direct.steps.map((step) => step.id));
  });

  it('routes the quantum to Round Robin and ignores it elsewhere', () => {
    const coarse = runSchedulingAlgorithm(ROUND_ROBIN_ALGORITHM_ID, { processes: workload, quantum: 4 });
    const fine = runSchedulingAlgorithm(ROUND_ROBIN_ALGORITHM_ID, { processes: workload, quantum: 1 });
    expect(coarse!.summary.timeSlices ?? 0).toBeLessThan(fine!.summary.timeSlices ?? 0);

    const quantumTakenSeriously = runSchedulingAlgorithm(SJF_ALGORITHM_ID, {
      processes: workload,
      quantum: 1,
    });
    const bigQuantum = runSchedulingAlgorithm(SJF_ALGORITHM_ID, { processes: workload, quantum: 20 });
    expect(quantumTakenSeriously!.summary).toEqual(bigQuantum!.summary);
  });

  it('returns null for an unknown algorithm instead of inventing a schedule', () => {
    expect(runSchedulingAlgorithm('does-not-exist', { processes: workload, quantum: 2 })).toBeNull();
  });

  it('returns null for a workload the policy rejects', () => {
    const empty = { processes: [] as readonly Process[], quantum: 2 };
    for (const id of SCHEDULING_ALGORITHM_IDS) {
      expect(runSchedulingAlgorithm(id, empty), id).toBeNull();
    }
  });

  it('validates the quantum only for Round Robin', () => {
    const invalidQuantum = { processes: workload, quantum: 0 };
    expect(validateSchedulingInput(ROUND_ROBIN_ALGORITHM_ID, invalidQuantum).valid).toBe(false);
    for (const id of SCHEDULING_ALGORITHM_IDS.filter((item) => item !== ROUND_ROBIN_ALGORITHM_ID)) {
      expect(validateSchedulingInput(id, invalidQuantum).valid, id).toBe(true);
    }
  });

  it('rejects an invalid process table for every policy', () => {
    const badBurst = { processes: [{ id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 0 }], quantum: 2 };
    for (const id of SCHEDULING_ALGORITHM_IDS) {
      expect(validateSchedulingInput(id, badBurst).valid, id).toBe(false);
      expect(runSchedulingAlgorithm(id, badBurst), id).toBeNull();
    }
  });
});
