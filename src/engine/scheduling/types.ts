/** Types shared by every CPU-scheduling engine. */

/** Lowest and highest priority a workload may declare. Lower number = higher priority. */
export const MIN_PRIORITY = 0;
export const MAX_PRIORITY = 10;
/** Priority assumed when a process does not declare one. */
export const DEFAULT_PRIORITY = 5;

export interface Process {
  /** Stable identifier; this is the process's PID inside the lab. */
  readonly id: string;
  /** Display name, e.g. `P1`. */
  readonly name: string;
  /** Time unit at which the process enters the ready queue. */
  readonly arrivalTime: number;
  /** Total CPU time the process needs. */
  readonly burstTime: number;
  /** Priority (lower = higher priority). Defaults to {@link DEFAULT_PRIORITY}. */
  readonly priority?: number;
  /**
   * Visual identity — the colour used to draw this process in every chart.
   * Omitted processes fall back to a palette indexed by arrival order.
   */
  readonly color?: string;
}

/** Priority with the lab's default applied, clamped to the supported range. */
export function priorityOf(process: Process): number {
  const value = process.priority;
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PRIORITY;
  return Math.min(MAX_PRIORITY, Math.max(MIN_PRIORITY, Math.trunc(value)));
}

export interface ProcessInput {
  readonly processes: readonly Process[];
}

/** One block of the Gantt chart. `processId: null` represents an idle CPU. */
export interface GanttSegment {
  readonly id: string;
  readonly processId: string | null;
  readonly label: string;
  readonly start: number;
  readonly end: number;
}

export interface ProcessResult {
  readonly processId: string;
  readonly processName: string;
  readonly arrivalTime: number;
  readonly burstTime: number;
  readonly startTime: number;
  readonly completionTime: number;
  readonly turnaroundTime: number;
  readonly waitingTime: number;
  readonly responseTime: number;
}

export interface ScheduleMetrics {
  readonly processCount: number;
  /** Time from the first arrival to the last completion. */
  readonly makespan: number;
  readonly idleTime: number;
  /** Busy time / makespan, in `[0, 1]`. */
  readonly cpuUtilization: number;
  /** Completed processes per time unit. */
  readonly throughput: number;
  readonly totalTurnaroundTime: number;
  readonly totalWaitingTime: number;
  readonly averageTurnaroundTime: number;
  readonly averageWaitingTime: number;
  readonly averageCompletionTime: number;
  readonly averageResponseTime: number;
}

/** Per-step snapshot rendered by the scheduling visualisation. */
export interface ScheduleStepData {
  readonly timeline: readonly GanttSegment[];
  readonly results: readonly ProcessResult[];
  /** Names of processes still waiting for the CPU, in queue order. */
  readonly readyQueue: readonly string[];
  readonly runningProcessId: string | null;
  readonly clock: number;
  readonly metrics: ScheduleMetrics;
}
