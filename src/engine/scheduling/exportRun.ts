import type { SimulationRun } from '../types';
import type { Process, ProcessResult, GanttSegment, ScheduleStepData } from './types';

/** The workload an export describes, so a reader can reproduce the run. */
export interface ScheduleExportWorkload {
  readonly processes: readonly Process[];
  /** Present only for Round Robin. */
  readonly quantum?: number;
}

export interface ScheduleExportProcess {
  readonly id: string;
  readonly name: string;
  readonly arrivalTime: number;
  readonly burstTime: number;
  readonly priority?: number;
  readonly color?: string;
}

export interface ScheduleExportStep {
  readonly index: number;
  readonly label: string;
  readonly description: string;
  readonly explanation?: string;
  readonly clock: number;
  readonly metrics: Readonly<Record<string, number>>;
}

export interface ScheduleExport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly algorithm: { readonly id: string; readonly name: string };
  readonly labId: string;
  readonly workload: ScheduleExportWorkload;
  /** Headline numbers produced by the engine. */
  readonly summary: Readonly<Record<string, number>>;
  /** Run metadata (counts, makespan, quantum, …). */
  readonly run: Readonly<Record<string, number | string | boolean>>;
  readonly results: readonly ProcessResult[];
  readonly timeline: readonly GanttSegment[];
  readonly steps: readonly ScheduleExportStep[];
}

export interface ScheduleExportOptions {
  readonly algorithmName?: string;
  /** ISO timestamp; inject a fixed value for deterministic tests. */
  readonly generatedAt?: string;
  /** Include the per-step explanations (default `true`). */
  readonly includeSteps?: boolean;
}

function exportProcess(process: Process): ScheduleExportProcess {
  return {
    id: process.id,
    name: process.name,
    arrivalTime: process.arrivalTime,
    burstTime: process.burstTime,
    ...(process.priority === undefined ? {} : { priority: process.priority }),
    ...(process.color === undefined ? {} : { color: process.color }),
  };
}

function finalData(run: SimulationRun<ScheduleStepData>): ScheduleStepData | undefined {
  return run.steps[run.steps.length - 1]?.data;
}

/**
 * Describe a finished schedule as plain data.
 *
 * The export is a faithful projection of the engine's own output — results,
 * timeline and summary are copied, never recomputed — so an exported file
 * always agrees with what the learner saw on screen.
 */
export function serializeScheduleRun(
  run: SimulationRun<ScheduleStepData>,
  workload: ScheduleExportWorkload,
  options: ScheduleExportOptions = {},
): ScheduleExport {
  const data = finalData(run);
  const includeSteps = options.includeSteps ?? true;

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    algorithm: { id: run.algorithmId, name: options.algorithmName ?? run.algorithmId },
    labId: run.labId,
    workload: {
      processes: workload.processes.map(exportProcess),
      ...(workload.quantum === undefined ? {} : { quantum: workload.quantum }),
    },
    summary: { ...run.summary },
    run: { ...run.input },
    results: data ? [...data.results] : [],
    timeline: data ? [...data.timeline] : [],
    steps: includeSteps
      ? run.steps.map((step) => ({
          index: step.index,
          label: step.label,
          description: step.description,
          ...(step.explanation === undefined ? {} : { explanation: step.explanation }),
          clock: step.clock,
          metrics: { ...(step.metrics ?? {}) },
        }))
      : [],
  };
}

/** Pretty-printed JSON of {@link serializeScheduleRun}, ready to download. */
export function scheduleRunToJson(
  run: SimulationRun<ScheduleStepData>,
  workload: ScheduleExportWorkload,
  options: ScheduleExportOptions = {},
): string {
  return JSON.stringify(serializeScheduleRun(run, workload, options), null, 2);
}
