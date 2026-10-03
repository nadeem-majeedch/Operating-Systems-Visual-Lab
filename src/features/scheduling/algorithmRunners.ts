import type { ValidationResult } from '@/types';
import type { Process, ScheduleStepData, SimulationRun } from '@/engine';
import {
  FCFS_ALGORITHM_ID,
  PRIORITY_ALGORITHM_ID,
  PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  ROUND_ROBIN_ALGORITHM_ID,
  SJF_ALGORITHM_ID,
  SRTF_ALGORITHM_ID,
  simulateFcfs,
  simulatePriority,
  simulatePriorityPreemptive,
  simulateRoundRobin,
  simulateSjf,
  simulateSrtf,
  validateProcessInput,
  validateRoundRobinInput,
} from '@/engine';

/** Everything a scheduling engine needs to run: the workload plus the quantum. */
export interface SchedulingInputs {
  readonly processes: readonly Process[];
  /** Only Round Robin reads this; every other policy ignores it. */
  readonly quantum: number;
}

/**
 * The scheduling policies this lab can run, in teaching order.
 *
 * Order matters: it is the order shown in the comparison view and the order the
 * algorithm selector presents, so it follows the curriculum rather than the
 * engine's internal enumeration.
 */
export const SCHEDULING_ALGORITHM_IDS: readonly string[] = [
  FCFS_ALGORITHM_ID,
  SJF_ALGORITHM_ID,
  SRTF_ALGORITHM_ID,
  ROUND_ROBIN_ALGORITHM_ID,
  PRIORITY_ALGORITHM_ID,
  PRIORITY_PREEMPTIVE_ALGORITHM_ID,
];

type Runner = (inputs: SchedulingInputs) => SimulationRun<ScheduleStepData>;

const RUNNERS: Readonly<Record<string, Runner>> = {
  [FCFS_ALGORITHM_ID]: ({ processes }) => simulateFcfs({ processes }),
  [SJF_ALGORITHM_ID]: ({ processes }) => simulateSjf({ processes }),
  [SRTF_ALGORITHM_ID]: ({ processes }) => simulateSrtf({ processes }),
  [ROUND_ROBIN_ALGORITHM_ID]: ({ processes, quantum }) => simulateRoundRobin({ processes, quantum }),
  [PRIORITY_ALGORITHM_ID]: ({ processes }) => simulatePriority({ processes }),
  [PRIORITY_PREEMPTIVE_ALGORITHM_ID]: ({ processes }) => simulatePriorityPreemptive({ processes }),
};

/** `true` when this lab has an engine for the algorithm. */
export function isSchedulingAlgorithm(algorithmId: string): boolean {
  return algorithmId in RUNNERS;
}

/**
 * Validate a workload for a given policy.
 *
 * Every policy needs a well-formed process table; Round Robin additionally
 * bounds the quantum, so the shared validator is composed here instead of
 * letting each caller guess which engine's validator to reach for.
 */
export function validateSchedulingInput(
  algorithmId: string,
  inputs: SchedulingInputs,
): ValidationResult {
  if (algorithmId === ROUND_ROBIN_ALGORITHM_ID) {
    return validateRoundRobinInput({ processes: inputs.processes, quantum: inputs.quantum });
  }
  return validateProcessInput({ processes: inputs.processes });
}

/**
 * Run one policy over a workload.
 *
 * Returns `null` for an algorithm with no engine or an invalid workload, so the
 * caller renders the honest "not runnable" state rather than a fabricated
 * schedule. The engine itself is always the source of the metrics.
 */
export function runSchedulingAlgorithm(
  algorithmId: string,
  inputs: SchedulingInputs,
): SimulationRun<ScheduleStepData> | null {
  const runner = RUNNERS[algorithmId];
  if (!runner) return null;
  if (!validateSchedulingInput(algorithmId, inputs).valid) return null;
  return runner(inputs);
}
