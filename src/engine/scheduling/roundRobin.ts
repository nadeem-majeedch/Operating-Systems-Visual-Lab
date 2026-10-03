import type { SimulationConfig, ValidationResult } from '@/types';
import { round, sum } from '@/utils';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import { orderByArrival, scheduleStepMetrics } from './fcfs';
import { computeMetrics } from './metrics';
import type {
  GanttSegment,
  Process,
  ProcessResult,
  ScheduleStepData,
} from './types';
import { collectProcessIssues } from './validate';

export const ROUND_ROBIN_ALGORITHM_ID = 'round-robin';
export const ROUND_ROBIN_LAB_ID = 'lab-round-robin';
export const ROUND_ROBIN_ENGINE_ID = 'round-robin-engine';

export const DEFAULT_QUANTUM = 4;
export const MIN_QUANTUM = 1;
export const MAX_QUANTUM = 20;

export interface RoundRobinInput {
  readonly processes: readonly Process[];
  /** CPU time granted per turn, in whole time units. */
  readonly quantum: number;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export function validateRoundRobinInput(input: RoundRobinInput): ValidationResult {
  const collector = new ValidationCollector();
  collectProcessIssues(collector, input.processes);
  collector
    .addIf(
      !Number.isInteger(input.quantum) || input.quantum < MIN_QUANTUM,
      'quantum',
      `time quantum must be an integer of at least ${MIN_QUANTUM}`,
    )
    .addIf(
      Number.isFinite(input.quantum) && input.quantum > MAX_QUANTUM,
      'quantum',
      `time quantum must not exceed ${MAX_QUANTUM}`,
    );
  return collector.toResult();
}

/* -------------------------------------------------------------------------- */
/* Simulation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Round Robin with a fixed time quantum.
 *
 * Queue discipline, stated explicitly because textbooks differ:
 *
 * 1. Processes that arrive during a slice enter the ready queue **ahead of**
 *    the process that just ran out of quantum, in arrival order.
 * 2. The preempted process is appended to the tail of the queue.
 * 3. If the queue empties while work remains, the clock jumps to the next
 *    arrival and an idle segment is recorded.
 */
export function simulateRoundRobin(
  input: RoundRobinInput,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  assertValid(validateRoundRobinInput(input), 'Round Robin');

  const quantum = input.quantum;
  const queue = orderByArrival(input.processes);
  const byId = new Map(queue.map((process) => [process.id, process]));
  const remaining = new Map<string, number>(queue.map((process) => [process.id, process.burstTime]));
  const firstStart = new Map<string, number>();

  const ready: string[] = [];
  const arrived = new Set<string>();
  const timeline: GanttSegment[] = [];
  const results: ProcessResult[] = [];
  const drafts: StepDraft<ScheduleStepData>[] = [];

  let clock = queue[0]?.arrivalTime ?? 0;
  let sliceCount = 0;
  let idleCount = 0;

  const snapshot = (runningProcessId: string | null) => {
    const metrics = computeMetrics({ timeline, results });
    return {
      timeline: timeline.map((segment) => ({ ...segment })),
      results: results.map((result) => ({ ...result })),
      readyQueue: ready.map((id) => byId.get(id)?.name ?? id),
      runningProcessId,
      clock,
      metrics,
    } satisfies ScheduleStepData;
  };

  /** Queue every process that has arrived by `upTo` and still needs CPU time. */
  const admitArrivals = (upTo: number): void => {
    for (const process of queue) {
      if (arrived.has(process.id)) continue;
      if (process.arrivalTime > upTo) continue;
      if ((remaining.get(process.id) ?? 0) <= 0) continue;
      arrived.add(process.id);
      ready.push(process.id);
    }
  };

  /** Earliest arrival time among processes that still need CPU time. */
  const nextArrival = (): number | undefined => {
    let earliest: number | undefined;
    for (const process of queue) {
      if ((remaining.get(process.id) ?? 0) <= 0) continue;
      if (earliest === undefined || process.arrivalTime < earliest) earliest = process.arrivalTime;
    }
    return earliest;
  };

  admitArrivals(clock);
  drafts.push({
    label: 'Ready queue initialised',
    description: `${ready.length} process${ready.length === 1 ? '' : 'es'} ready at t = ${clock}, quantum ${quantum}.`,
    explanation:
      'Round Robin is preemptive and designed for time-sharing. Every process gets at most one quantum before returning to the tail of the queue, so no process can hold the CPU for longer than its slice.',
    clock,
    data: snapshot(null),
    metrics: scheduleStepMetrics(computeMetrics({ timeline, results }), { quantum, slices: 0 }),
  });

  let guard = 0;
  while (guard < 5000) {
    guard += 1;

    if (ready.length === 0) {
      const next = nextArrival();
      if (next === undefined) break; // every process has finished
      if (next > clock) {
        timeline.push({
          id: `idle-${idleCount}`,
          processId: null,
          label: 'idle',
          start: clock,
          end: next,
        });
        idleCount += 1;
        clock = next;
      }
      admitArrivals(clock);
      if (ready.length === 0) break;
    }

    const processId = ready.shift();
    if (processId === undefined) break;
    const process = byId.get(processId);
    const remainingBefore = remaining.get(processId);
    if (!process || remainingBefore === undefined) break;

    const slice = Math.min(quantum, remainingBefore);
    const start = clock;
    const end = start + slice;
    const remainingAfter = remainingBefore - slice;

    clock = end;
    remaining.set(processId, remainingAfter);
    if (!firstStart.has(processId)) firstStart.set(processId, start);

    timeline.push({
      id: `slice-${sliceCount}`,
      processId,
      label: process.name,
      start,
      end,
    });
    sliceCount += 1;

    if (remainingAfter > 0) {
      // Newly arrived processes queue ahead of the process that used its quantum.
      admitArrivals(clock);
      ready.push(processId);
    } else {
      admitArrivals(clock);
      const completionTime = clock;
      const startTime = firstStart.get(processId) ?? start;
      results.push({
        processId,
        processName: process.name,
        arrivalTime: process.arrivalTime,
        burstTime: process.burstTime,
        startTime,
        completionTime,
        turnaroundTime: completionTime - process.arrivalTime,
        waitingTime: completionTime - process.arrivalTime - process.burstTime,
        responseTime: startTime - process.arrivalTime,
      });
    }

    const metrics = computeMetrics({ timeline, results });
    const preempted = remainingAfter > 0;

    drafts.push({
      label: preempted ? `${process.name} preempted` : `${process.name} completes`,
      description: preempted
        ? `${process.name} used its full quantum from t=${start} to t=${end} and has ${remainingAfter} unit${remainingAfter === 1 ? '' : 's'} left.`
        : `${process.name} finished during its slice from t=${start} to t=${end}.`,
      explanation: preempted
        ? `${process.name} goes to the tail of the ready queue${ready.length > 1 ? ', behind the processes that are already waiting' : ''}. This is what bounds the time any single process can hold the CPU.`
        : `A burst shorter than the quantum means the process finishes early, and the CPU is handed straight to the next process in the queue instead of idling until the quantum expires.`,
      clock,
      data: snapshot(processId),
      highlights: [process.name],
      metrics: scheduleStepMetrics(metrics, {
        quantum,
        slices: sliceCount,
        contextSwitches: Math.max(0, sliceCount - 1),
      }),
    });
  }

  const metrics = computeMetrics({ timeline, results });
  const steps = createSteps(drafts);
  const totalBurstTime = sum(queue.map((process) => process.burstTime));

  return {
    algorithmId: ROUND_ROBIN_ALGORITHM_ID,
    labId: ROUND_ROBIN_LAB_ID,
    input: {
      processCount: queue.length,
      quantum,
      totalBurstTime,
      timeSlices: sliceCount,
      lastCompletion: clock,
    },
    steps,
    state: createSimulationState<ScheduleStepData>({
      labId: ROUND_ROBIN_LAB_ID,
      algorithmId: ROUND_ROBIN_ALGORITHM_ID,
      steps,
      parameters: { quantum },
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
      averageResponseTime: metrics.averageResponseTime,
      timeSlices: sliceCount,
      contextSwitches: Math.max(0, sliceCount - 1),
      quantum,
    },
  };
}

/** Engine object consumed by the registry and by generic lab tooling. */
export const roundRobinEngine: SimulationEngine<RoundRobinInput, ScheduleStepData> = {
  id: ROUND_ROBIN_ENGINE_ID,
  algorithmId: ROUND_ROBIN_ALGORITHM_ID,
  labId: ROUND_ROBIN_LAB_ID,
  name: 'Round Robin',
  description:
    'Gives every ready process a fixed time slice in turn. Response time is bounded at the cost of context switches.',
  validate: validateRoundRobinInput,
  run: simulateRoundRobin,
};
