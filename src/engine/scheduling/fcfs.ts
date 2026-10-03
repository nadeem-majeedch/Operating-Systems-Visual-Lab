import type { SimulationConfig, ValidationResult } from '@/types';
import { round, sum } from '@/utils';
import { assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import { computeMetrics } from './metrics';
import { validateProcesses } from './validate';
import type {
  GanttSegment,
  Process,
  ProcessInput,
  ProcessResult,
  ScheduleMetrics,
  ScheduleStepData,
} from './types';

export const FCFS_ALGORITHM_ID = 'fcfs';
export const FCFS_LAB_ID = 'lab-fcfs';
export const FCFS_ENGINE_ID = 'fcfs-engine';

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export function validateProcessInput(input: ProcessInput): ValidationResult {
  return validateProcesses(input.processes);
}

/* -------------------------------------------------------------------------- */
/* Simulation                                                                 */
/* -------------------------------------------------------------------------- */

/** First come, first served: order by arrival time, then by name for ties. */
export function orderByArrival(processes: readonly Process[]): Process[] {
  return [...processes].sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return a.name.localeCompare(b.name, 'en', { numeric: true });
  });
}

/** Shared numeric readout attached to every scheduling step. */
export function scheduleStepMetrics(
  metrics: ScheduleMetrics,
  extra: Readonly<Record<string, number>> = {},
): Record<string, number> {
  return {
    makespan: metrics.makespan,
    idleTime: metrics.idleTime,
    cpuUtilization: metrics.cpuUtilization,
    throughput: metrics.throughput,
    averageTurnaroundTime: metrics.averageTurnaroundTime,
    averageWaitingTime: metrics.averageWaitingTime,
    ...extra,
  };
}

function numericMetrics(
  metrics: ScheduleMetrics,
  contextSwitches: number,
): Record<string, number> {
  return {
    makespan: metrics.makespan,
    idleTime: metrics.idleTime,
    cpuUtilization: metrics.cpuUtilization,
    throughput: metrics.throughput,
    averageTurnaroundTime: metrics.averageTurnaroundTime,
    averageWaitingTime: metrics.averageWaitingTime,
    contextSwitches,
  };
}

export function simulateFcfs(input: ProcessInput, config: SimulationConfig = {}): SimulationRun<ScheduleStepData> {
  const validation = validateProcessInput(input);
  assertValid(validation, 'FCFS');

  const queue = orderByArrival(input.processes);
  const timeline: GanttSegment[] = [];
  const results: ProcessResult[] = [];
  const drafts: StepDraft<ScheduleStepData>[] = [];

  const firstArrival = queue[0]?.arrivalTime ?? 0;
  let clock = firstArrival;
  // FCFS never preempts, so a context switch is simply every hand-over after
  // the first dispatch.
  let contextSwitches = 0;

  const snapshot = (
    runningProcessId: string | null,
    readyQueue: readonly string[],
  ): ScheduleStepData => ({
    timeline: timeline.map((segment) => ({ ...segment })),
    results: results.map((result) => ({ ...result })),
    readyQueue: [...readyQueue],
    runningProcessId,
    clock,
    metrics: computeMetrics({ timeline, results }),
  });

  drafts.push({
    label: 'Ready queue initialised',
    description: `${queue.length} process${queue.length === 1 ? '' : 'es'} arrive at or after time ${firstArrival}.`,
    explanation:
      'FCFS is non-preemptive and offline-agnostic: whichever process reached the queue first is dispatched first. Ties are broken by process name.',
    clock: firstArrival,
    data: snapshot(null, queue.map((process) => process.name)),
    metrics: numericMetrics(computeMetrics({ timeline, results }), contextSwitches),
  });

  queue.forEach((process, index) => {
    if (index > 0) contextSwitches += 1;
    if (process.arrivalTime > clock) {
      timeline.push({
        id: `idle-${index}`,
        processId: null,
        label: 'idle',
        start: clock,
        end: process.arrivalTime,
      });
      clock = process.arrivalTime;
    }

    const startTime = clock;
    const completionTime = startTime + process.burstTime;
    clock = completionTime;

    timeline.push({
      id: `segment-${process.id}`,
      processId: process.id,
      label: process.name,
      start: startTime,
      end: completionTime,
    });

    const waitingTime = startTime - process.arrivalTime;
    results.push({
      processId: process.id,
      processName: process.name,
      arrivalTime: process.arrivalTime,
      burstTime: process.burstTime,
      startTime,
      completionTime,
      turnaroundTime: completionTime - process.arrivalTime,
      waitingTime,
      responseTime: waitingTime,
    });

    const remaining = queue.slice(index + 1).map((item) => item.name);
    const metrics = computeMetrics({ timeline, results });

    drafts.push({
      label: `${process.name} completes`,
      description: `${process.name} runs uninterrupted from t=${startTime} to t=${completionTime} (waiting ${waitingTime}).`,
      explanation:
        remaining.length === 0
          ? 'The ready queue is empty, so the CPU has nothing left to dispatch and the schedule ends.'
          : `Waiting time is start − arrival. ${process.name} waited ${waitingTime} time unit${waitingTime === 1 ? '' : 's'}, which is entirely caused by processes that arrived earlier.`,
      clock: completionTime,
      data: snapshot(process.id, remaining),
      highlights: [process.name],
      metrics: numericMetrics(metrics, contextSwitches),
    });
  });

  const metrics = computeMetrics({ timeline, results });
  const totalBurstTime = sum(queue.map((process) => process.burstTime));
  const steps = createSteps(drafts);

  return {
    algorithmId: FCFS_ALGORITHM_ID,
    labId: FCFS_LAB_ID,
    input: {
      processCount: queue.length,
      totalBurstTime,
      firstArrival,
      lastCompletion: clock,
    },
    steps,
    state: createSimulationState<ScheduleStepData>({
      labId: FCFS_LAB_ID,
      algorithmId: FCFS_ALGORITHM_ID,
      steps,
      speed: config.speed,
    }),
    summary: {
      makespan: metrics.makespan,
      idleTime: metrics.idleTime,
      cpuUtilization: metrics.cpuUtilization,
      throughput: metrics.throughput,
      utilizationPercent: round(metrics.cpuUtilization * 100, 2),
      averageTurnaroundTime: metrics.averageTurnaroundTime,
      averageWaitingTime: metrics.averageWaitingTime,
      contextSwitches,
    },
  };
}

/** The engine object consumed by the registry and by generic lab tooling. */
export const fcfsEngine: SimulationEngine<ProcessInput, ScheduleStepData> = {
  id: FCFS_ENGINE_ID,
  algorithmId: FCFS_ALGORITHM_ID,
  labId: FCFS_LAB_ID,
  name: 'First Come, First Served',
  description:
    'Dispatches processes strictly in arrival order. Simple, non-preemptive, and prone to the convoy effect.',
  validate: validateProcessInput,
  run: simulateFcfs,
};
