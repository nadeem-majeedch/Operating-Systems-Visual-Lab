import type { SimulationStep } from '@/types';
import type { MetricItem, EventLogEntry, TimelineEntry } from '@/components';
import type {
  GanttSegment,
  Process,
  ProcessInput,
  ScheduleMetrics,
  ScheduleStepData,
} from '@/engine';
import { colorForIndex } from '@/engine';
import { formatNumber, formatPercent } from '@/utils';

/** Neutral colour used for idle CPU blocks and unknown processes. */
export const IDLE_COLOR = '#475569';

/** Extra readouts a specific algorithm contributes beyond the shared metrics. */
export interface ScheduleExtras {
  readonly timeSlices?: number;
  readonly contextSwitches?: number;
  readonly quantum?: number;
}

export function cloneProcesses(processes: readonly Process[]): Process[] {
  return processes.map((process) => ({ ...process }));
}

/**
 * Stable process id → colour map.
 *
 * An explicit `process.color` always wins; otherwise the palette is indexed by
 * arrival order so colours stay put while the workload is edited.
 */
export function buildColourMap(processes: readonly Process[]): Map<string, string> {
  return new Map(
    processes.map((process, index) => [process.id, process.color ?? colorForIndex(index)]),
  );
}

export function makeColourLookup(
  colours: ReadonlyMap<string, string>,
): (processId: string | null) => string {
  return (processId) =>
    processId === null ? IDLE_COLOR : (colours.get(processId) ?? IDLE_COLOR);
}

/** Chart scale: the finished makespan, so the axis never rescales mid-run. */
export function scheduleSpan(makespan: number, processes: readonly Process[]): number {
  return Math.max(makespan, ...processes.map((p) => p.arrivalTime + p.burstTime), 1);
}

export function timelineEntries(steps: readonly SimulationStep<ScheduleStepData>[]): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

/** A step distilled to the decision it records and the reason behind it. */
export interface DecisionEntry {
  readonly id: string;
  readonly index: number;
  readonly clock: number;
  readonly label: string;
  readonly reason: string;
}

/**
 * The scheduling decisions in order, each paired with its rationale.
 *
 * Unlike the event log (which lists every step's one-line description), this
 * surfaces the engine's `explanation` — the *why* — so a learner can read the
 * whole decision trail rather than one step at a time.
 */
export function decisionEntries(
  steps: readonly SimulationStep<ScheduleStepData>[],
): DecisionEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    clock: step.clock,
    label: step.label,
    reason: step.explanation ?? step.description,
  }));
}

export function logEntries(steps: readonly SimulationStep<ScheduleStepData>[]): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

/** Rows for the per-process results table, in arrival order. */
export function processRows(processes: readonly Process[]): { id: string; name: string }[] {
  return processes.map((process) => ({ id: process.id, name: process.name }));
}

export function processName(processes: readonly Process[], processId: string | null): string {
  if (processId === null) return 'idle';
  return processes.find((process) => process.id === processId)?.name ?? processId;
}

/** Turn engine metrics into the tiles shown by `MetricsPanel`. */
export function scheduleMetricItems(
  metrics: ScheduleMetrics,
  extras: ScheduleExtras = {},
): MetricItem[] {
  const items: MetricItem[] = [
    {
      id: 'averageWaitingTime',
      label: 'Average waiting',
      value: formatNumber(metrics.averageWaitingTime, 2),
      hint: 'turnaround − burst',
    },
    {
      id: 'averageTurnaroundTime',
      label: 'Average turnaround',
      value: formatNumber(metrics.averageTurnaroundTime, 2),
      hint: 'completion − arrival',
    },
    {
      id: 'averageResponseTime',
      label: 'Average response',
      value: formatNumber(metrics.averageResponseTime, 2),
      hint: 'first dispatch − arrival',
    },
    {
      id: 'cpuUtilization',
      label: 'CPU utilisation',
      value: formatPercent(metrics.cpuUtilization, 0),
      hint: metrics.idleTime > 0 ? `${formatNumber(metrics.idleTime, 2)} idle units` : 'no idle time',
      tone: metrics.idleTime > 0 ? 'warning' : 'positive',
    },
    {
      id: 'makespan',
      label: 'Makespan',
      value: formatNumber(metrics.makespan, 2),
      hint: `${metrics.processCount} processes`,
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: formatNumber(metrics.throughput, 3),
      hint: 'processes per unit',
    },
  ];

  if (extras.timeSlices !== undefined) {
    items.push({
      id: 'timeSlices',
      label: 'Time slices',
      value: extras.timeSlices,
      hint: 'dispatches issued',
    });
  }

  if (extras.contextSwitches !== undefined) {
    items.push({
      id: 'contextSwitches',
      label: 'Context switches',
      value: extras.contextSwitches,
      hint: 'dispatches after the first',
    });
  }

  if (extras.quantum !== undefined) {
    items.push({
      id: 'quantum',
      label: 'Quantum',
      value: extras.quantum,
      hint: 'time units per turn',
    });
  }

  return items;
}

/** Narrow an example's payload to a process table without asserting blind trust. */
export function isProcessInput(value: unknown): value is ProcessInput {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { processes?: unknown };
  if (!Array.isArray(candidate.processes)) return false;
  return candidate.processes.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const process = entry as Partial<Process>;
    return (
      typeof process.id === 'string' &&
      typeof process.name === 'string' &&
      typeof process.arrivalTime === 'number' &&
      typeof process.burstTime === 'number'
    );
  });
}

/** Longest contiguous busy stretch, useful as a fairness sanity check. */
export function longestBurst(timeline: readonly GanttSegment[]): number {
  return timeline
    .filter((segment) => segment.processId !== null)
    .reduce((longest, segment) => Math.max(longest, segment.end - segment.start), 0);
}
