import { describe, expect, it } from 'vitest';
import {
  scheduleRunToJson,
  serializeScheduleRun,
  simulateFcfs,
  simulateRoundRobin,
  type Process,
} from '@/engine';

const workload: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 1 },
];

const run = simulateFcfs({ processes: workload });
const AT = '2026-01-01T00:00:00.000Z';

describe('serializeScheduleRun', () => {
  it('projects the engine output faithfully', () => {
    const exported = serializeScheduleRun(run, { processes: workload }, {
      algorithmName: 'First Come, First Served',
      generatedAt: AT,
    });

    expect(exported.schemaVersion).toBe(1);
    expect(exported.generatedAt).toBe(AT);
    expect(exported.algorithm).toEqual({ id: 'fcfs', name: 'First Come, First Served' });
    expect(exported.labId).toBe('lab-fcfs');
    expect(exported.workload.processes).toHaveLength(3);
    expect(exported.workload.processes[0]).toMatchObject({ id: 'p1', arrivalTime: 0, burstTime: 4 });
    expect(exported.summary).toEqual(run.summary);

    const lastData = run.steps[run.steps.length - 1]?.data;
    expect(exported.results).toEqual(lastData?.results);
    expect(exported.timeline).toEqual(lastData?.timeline);
    expect(exported.steps).toHaveLength(run.steps.length);
  });

  it('copies, never aliases, the engine arrays', () => {
    const exported = serializeScheduleRun(run, { processes: workload }, { generatedAt: AT });
    const lastData = run.steps[run.steps.length - 1]?.data;
    expect(exported.results).not.toBe(lastData?.results);
    expect(exported.timeline).not.toBe(lastData?.timeline);
    expect(exported.summary).not.toBe(run.summary);
  });

  it('can omit the per-step explanations', () => {
    const exported = serializeScheduleRun(run, { processes: workload }, {
      generatedAt: AT,
      includeSteps: false,
    });
    expect(exported.steps).toEqual([]);
  });

  it('carries the quantum for time-sliced policies', () => {
    const rr = simulateRoundRobin({ processes: workload, quantum: 2 });
    const exported = serializeScheduleRun(rr, { processes: workload, quantum: 2 }, { generatedAt: AT });
    expect(exported.workload.quantum).toBe(2);
    expect(exported.algorithm.id).toBe('round-robin');
  });
});

describe('scheduleRunToJson', () => {
  it('produces JSON that round-trips back to the same object', () => {
    const json = scheduleRunToJson(run, { processes: workload }, {
      algorithmName: 'FCFS',
      generatedAt: AT,
    });
    const parsed: unknown = JSON.parse(json);
    expect(parsed).toEqual(
      serializeScheduleRun(run, { processes: workload }, {
        algorithmName: 'FCFS',
        generatedAt: AT,
      }),
    );
  });

  it('is deterministic for a fixed timestamp', () => {
    const first = scheduleRunToJson(run, { processes: workload }, { generatedAt: AT });
    const second = scheduleRunToJson(run, { processes: workload }, { generatedAt: AT });
    expect(first).toBe(second);
  });
});
