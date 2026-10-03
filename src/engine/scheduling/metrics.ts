import { mean, round, sum } from '@/utils';
import type { GanttSegment, ProcessResult, ScheduleMetrics } from './types';

/** CPU time actually spent executing processes. */
export function busyTime(timeline: readonly GanttSegment[]): number {
  return sum(
    timeline
      .filter((segment) => segment.processId !== null)
      .map((segment) => segment.end - segment.start),
  );
}

export function idleTime(timeline: readonly GanttSegment[]): number {
  return sum(
    timeline
      .filter((segment) => segment.processId === null)
      .map((segment) => segment.end - segment.start),
  );
}

/** Time from the earliest start to the latest end on the chart. */
export function makespan(timeline: readonly GanttSegment[]): number {
  if (timeline.length === 0) return 0;
  const start = Math.min(...timeline.map((segment) => segment.start));
  const end = Math.max(...timeline.map((segment) => segment.end));
  return Math.max(0, end - start);
}

export interface MetricOptions {
  readonly timeline: readonly GanttSegment[];
  readonly results: readonly ProcessResult[];
}

/** Derive every headline statistic from the completed schedule. */
export function computeMetrics({ timeline, results }: MetricOptions): ScheduleMetrics {
  const turnaroundTimes = results.map((result) => result.turnaroundTime);
  const waitingTimes = results.map((result) => result.waitingTime);
  const completionTimes = results.map((result) => result.completionTime);
  const responseTimes = results.map((result) => result.responseTime);

  const span = makespan(timeline);
  const idle = idleTime(timeline);
  const busy = busyTime(timeline);
  const processCount = results.length;

  return {
    processCount,
    makespan: round(span, 2),
    idleTime: round(idle, 2),
    cpuUtilization: round(span === 0 ? 0 : busy / span, 4),
    throughput: round(span === 0 ? 0 : processCount / span, 4),
    totalTurnaroundTime: round(sum(turnaroundTimes), 2),
    totalWaitingTime: round(sum(waitingTimes), 2),
    averageTurnaroundTime: round(mean(turnaroundTimes), 2),
    averageWaitingTime: round(mean(waitingTimes), 2),
    averageCompletionTime: round(mean(completionTimes), 2),
    averageResponseTime: round(mean(responseTimes), 2),
  };
}
