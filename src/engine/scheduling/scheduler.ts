import type { SimulationConfig } from '@/types';
import { round, sum } from '@/utils';
import { assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationRun } from '../types';
import { orderByArrival, scheduleStepMetrics, validateProcessInput } from './fcfs';
import { computeMetrics } from './metrics';
import type {
  GanttSegment,
  ProcessInput,
  ProcessResult,
  ScheduleStepData,
} from './types';
import { priorityOf } from './types';

/**
 * A ready process paired with the state the comparator needs.
 *
 * Comparators never look at the raw `Process` because the policy cares about
 * *remaining* work (SRTF) and about a declared priority default (priority
 * policies), and both must be resolved consistently in one place.
 */
export interface ScheduleCandidate {
  readonly id: string;
  readonly name: string;
  readonly arrivalTime: number;
  readonly burstTime: number;
  readonly priority: number;
  readonly remaining: number;
  /** Arrival order, used as the final deterministic tie-break. */
  readonly arrivalIndex: number;
}

/**
 * The whole description of a scheduling policy that the generic core needs.
 *
 * Everything policy-specific lives here — the ordering, the wording of the
 * explanations, and whether the CPU can be taken away mid-burst. The core owns
 * the clock, the queue, the bookkeeping and the metrics, so a new policy is a
 * comparator plus prose rather than another simulation loop.
 */
export interface SchedulerPolicy {
  readonly algorithmId: string;
  readonly labId: string;
  readonly engineId: string;
  readonly name: string;
  readonly description: string;
  /** `true` when a newly arrived process may take the CPU mid-burst. */
  readonly preemptive: boolean;
  /** Negative when `a` should run before `b`. Must be a total order. */
  readonly comparator: (a: ScheduleCandidate, b: ScheduleCandidate) => number;
  /** Why the chosen process was picked from the ready set. */
  readonly chooseWhy: (chosen: ScheduleCandidate, ready: readonly ScheduleCandidate[]) => string;
  /** Why the running process lost the CPU to a challenger. */
  readonly preemptWhy: (running: ScheduleCandidate, challenger: ScheduleCandidate) => string;
  /** Teaching note attached to the initialisation step. */
  readonly initialExplanation: string;
}

function byArrivalThenName(a: ScheduleCandidate, b: ScheduleCandidate): number {
  if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
  return a.arrivalIndex - b.arrivalIndex;
}

/** Comparator used by every policy as its deterministic final tie-break. */
export const tieBreak = byArrivalThenName;

function pickBest(
  candidates: readonly ScheduleCandidate[],
  comparator: SchedulerPolicy['comparator'],
): ScheduleCandidate {
  let best = candidates[0]!;
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    if (comparator(candidate, best) < 0) best = candidate;
  }
  return best;
}

/**
 * Run any non-time-sliced policy (non-preemptive, or preempted only by arrivals).
 *
 * The loop is a discrete-event simulation: it admits every arrival due by the
 * current clock, picks the best ready process, and runs it until the earliest
 * of (a) its burst finishing, (b) the next arrival when the policy is
 * preemptive. Every decision is recorded as a step with the reason it was made.
 *
 * Metrics are never written by hand — they are derived from the recorded
 * timeline and results by {@link computeMetrics}, so the numbers shown in the UI
 * are exactly the numbers the schedule produced.
 */
export function runScheduler(
  input: ProcessInput,
  policy: SchedulerPolicy,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  assertValid(validateProcessInput(input), policy.name);

  const processes = orderByArrival(input.processes);
  const indexOf = new Map(processes.map((process, index) => [process.id, index]));
  const byId = new Map(processes.map((process) => [process.id, process]));
  const remaining = new Map(processes.map((process) => [process.id, process.burstTime]));
  const firstStart = new Map<string, number>();

  const ready: string[] = [];
  const arrived = new Set<string>();
  const timeline: GanttSegment[] = [];
  const results: ProcessResult[] = [];
  const drafts: StepDraft<ScheduleStepData>[] = [];

  let clock = processes[0]?.arrivalTime ?? 0;
  let contextSwitches = 0;
  let lastDispatched: string | null = null;
  let idleCount = 0;
  let segmentCount = 0;

  const candidate = (id: string): ScheduleCandidate => {
    const process = byId.get(id)!;
    return {
      id,
      name: process.name,
      arrivalTime: process.arrivalTime,
      burstTime: process.burstTime,
      priority: priorityOf(process),
      remaining: remaining.get(id) ?? 0,
      arrivalIndex: indexOf.get(id) ?? 0,
    };
  };

  const snapshot = (runningProcessId: string | null): ScheduleStepData => ({
    timeline: timeline.map((segment) => ({ ...segment })),
    results: results.map((result) => ({ ...result })),
    readyQueue: [...ready]
      .map((id) => candidate(id))
      .sort(policy.comparator)
      .map((item) => item.name),
    runningProcessId,
    clock,
    metrics: computeMetrics({ timeline, results }),
  });

  const stepMetrics = (runningProcessId: string | null): Record<string, number> =>
    scheduleStepMetrics(snapshot(runningProcessId).metrics, {
      contextSwitches,
      readyCount: ready.length,
    });

  /** Admit every process that has arrived by `upTo` and still needs CPU time. */
  const admit = (upTo: number): void => {
    for (const process of processes) {
      if (arrived.has(process.id)) continue;
      if (process.arrivalTime > upTo) continue;
      if ((remaining.get(process.id) ?? 0) <= 0) continue;
      arrived.add(process.id);
      ready.push(process.id);
    }
  };

  /** Earliest arrival strictly after `after`, among work still outstanding. */
  const nextArrivalAfter = (after: number): number | undefined => {
    let earliest: number | undefined;
    for (const process of processes) {
      if (arrived.has(process.id)) continue;
      if ((remaining.get(process.id) ?? 0) <= 0) continue;
      if (process.arrivalTime <= after) continue;
      if (earliest === undefined || process.arrivalTime < earliest) earliest = process.arrivalTime;
    }
    return earliest;
  };

  /** Append a run to the Gantt chart, merging an uninterrupted continuation. */
  const appendRun = (processId: string, start: number, end: number): void => {
    const last = timeline[timeline.length - 1];
    if (last && last.processId === processId && last.end === start) {
      timeline[timeline.length - 1] = { ...last, end };
      return;
    }
    const process = byId.get(processId);
    timeline.push({
      id: `run-${segmentCount}`,
      processId,
      label: process?.name ?? processId,
      start,
      end,
    });
    segmentCount += 1;
  };

  admit(clock);
  drafts.push({
    label: 'Ready queue initialised',
    description: `${ready.length} process${ready.length === 1 ? '' : 'es'} ready at t = ${clock}.`,
    explanation: policy.initialExplanation,
    clock,
    data: snapshot(null),
    metrics: stepMetrics(null),
  });

  /** The process whose run is currently on the CPU, and where it started. */
  let current: { id: string; start: number; why: string } | null = null;
  let guard = 0;

  while (guard < 5000) {
    guard += 1;
    admit(clock);

    if (ready.length === 0) {
      const next = nextArrivalAfter(clock);
      if (next === undefined) break; // every process has finished
      timeline.push({
        id: `idle-${idleCount}`,
        processId: null,
        label: 'idle',
        start: clock,
        end: next,
      });
      idleCount += 1;
      clock = next;
      continue;
    }

    const candidates = ready.map(candidate);
    let chosen = pickBest(candidates, policy.comparator);

    // A preemptive policy keeps the running process unless a rival strictly beats it.
    if (policy.preemptive && current) {
      const running = candidate(current.id);
      const best = chosen;
      if (policy.comparator(best, running) >= 0) chosen = running;
    }

    const declared = candidate(chosen.id);
    const remainingBefore = remaining.get(chosen.id) ?? 0;

    // A run ends when the burst finishes; preemptive policies also stop at the
    // next arrival so the newcomer can be compared against the running process.
    const nextArrival = policy.preemptive ? nextArrivalAfter(clock) : undefined;
    const limit = Math.min(
      clock + remainingBefore,
      nextArrival === undefined ? Number.POSITIVE_INFINITY : nextArrival,
    );
    const end = Math.max(clock, limit);

    // Finalise the previous run if the CPU is changing hands.
    if (current && current.id !== chosen.id) {
      const outgoing = candidate(current.id);
      drafts.push({
        label: `${outgoing.name} preempted`,
        description: `${outgoing.name} is interrupted at t=${clock} with ${outgoing.remaining} unit${
          outgoing.remaining === 1 ? '' : 's'
        } of work left.`,
        explanation: policy.preemptWhy(outgoing, declared),
        clock,
        data: snapshot(outgoing.id),
        highlights: [outgoing.name, declared.name],
        metrics: stepMetrics(outgoing.id),
      });
      current = null;
    }

    if (!current) {
      const isSwitch = lastDispatched !== null && lastDispatched !== chosen.id;
      if (isSwitch) contextSwitches += 1;
      lastDispatched = chosen.id;
      if (!firstStart.has(chosen.id)) firstStart.set(chosen.id, clock);
      current = { id: chosen.id, start: clock, why: policy.chooseWhy(declared, candidates) };
    }

    appendRun(chosen.id, clock, end);
    remaining.set(chosen.id, remainingBefore - (end - clock));
    clock = end;

    if ((remaining.get(chosen.id) ?? 0) <= 0) {
      const finishedAt = clock;
      const startTime = firstStart.get(chosen.id) ?? current.start;
      const process = byId.get(chosen.id)!;
      results.push({
        processId: chosen.id,
        processName: process.name,
        arrivalTime: process.arrivalTime,
        burstTime: process.burstTime,
        startTime,
        completionTime: finishedAt,
        turnaroundTime: finishedAt - process.arrivalTime,
        waitingTime: finishedAt - process.arrivalTime - process.burstTime,
        responseTime: startTime - process.arrivalTime,
      });
      ready.splice(ready.indexOf(chosen.id), 1);
      const why = current.why;
      const remainingReady = ready.length;
      drafts.push({
        label: `${process.name} completes`,
        description: `${process.name} finishes at t=${finishedAt} after ${process.burstTime} unit${
          process.burstTime === 1 ? '' : 's'
        } of CPU time.`,
        explanation:
          remainingReady === 0
            ? `${why} It was the last process waiting, so the schedule ends at t=${finishedAt}.`
            : `${why} The CPU is now free, so the scheduler re-examines the ${remainingReady} remaining process${
                remainingReady === 1 ? '' : 'es'
              }.`,
        clock: finishedAt,
        data: snapshot(null),
        highlights: [process.name],
        metrics: stepMetrics(null),
      });
      current = null;
    }
  }

  const metrics = computeMetrics({ timeline, results });
  const steps = createSteps(drafts);
  const totalBurstTime = sum(processes.map((process) => process.burstTime));

  return {
    algorithmId: policy.algorithmId,
    labId: policy.labId,
    input: {
      processCount: processes.length,
      totalBurstTime,
      contextSwitches,
      lastCompletion: clock,
    },
    steps,
    state: createSimulationState<ScheduleStepData>({
      labId: policy.labId,
      algorithmId: policy.algorithmId,
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
      averageResponseTime: metrics.averageResponseTime,
      contextSwitches,
    },
  };
}

/** Comparator factory for cheapest-first policies (SJF / SRTF). */
export function byRemainingThenArrival(
  a: ScheduleCandidate,
  b: ScheduleCandidate,
): number {
  if (a.remaining !== b.remaining) return a.remaining - b.remaining;
  return byArrivalThenName(a, b);
}

/** Comparator factory for priority policies; lower number wins. */
export function byPriorityThenArrival(
  a: ScheduleCandidate,
  b: ScheduleCandidate,
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return byArrivalThenName(a, b);
}
