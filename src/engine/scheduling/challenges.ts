import type { SimulationRun } from '../types';
import { FCFS_ALGORITHM_ID, simulateFcfs } from './fcfs';
import { PRIORITY_ALGORITHM_ID, simulatePriority } from './priority';
import { PREEMPTION_PRESET, ROUND_ROBIN_PRESET } from './presets';
import { ROUND_ROBIN_ALGORITHM_ID, simulateRoundRobin } from './roundRobin';
import { SJF_ALGORITHM_ID, SRTF_ALGORITHM_ID, simulateSjf, simulateSrtf } from './sjf';
import type { GanttSegment, Process, ScheduleStepData } from './types';

/* -------------------------------------------------------------------------- */
/* Public shape                                                               */
/* -------------------------------------------------------------------------- */

export type SchedulingChallengeKind =
  | 'first-dispatch'
  | 'next-segment'
  | 'completion-time'
  | 'waiting-time'
  | 'turnaround-time'
  | 'preempted-process'
  | 'after-preemption'
  | 'first-completion'
  | 'context-switches'
  | 'cpu-utilization';

export interface SchedulingChallenge {
  readonly id: string;
  readonly kind: SchedulingChallengeKind;
  readonly title: string;
  readonly prompt: string;
  readonly algorithmId: string;
  readonly algorithmName: string;
  readonly processes: readonly Process[];
  readonly quantum: number;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  /** Clock the question is anchored to, when the question is about a moment. */
  readonly atClock?: number;
  /** Partial schedule shown as context. Empty when the question needs none. */
  readonly previewTimeline: readonly GanttSegment[];
  /** Time span used to scale the preview chart. */
  readonly previewSpan: number;
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

type Spec = {
  readonly id: string;
  readonly kind: SchedulingChallengeKind;
  readonly title: string;
  readonly algorithmId: string;
  readonly algorithmName: string;
  readonly processes: readonly Process[];
  readonly quantum: number;
  readonly targetProcessId?: string;
  /** For `next-segment`: the segment after which the question is asked. */
  readonly targetSegmentIndex?: number;
};

/** Small hand-built workloads so every challenge is deterministic. */
const WORKLOAD_A: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 1 },
];

const WORKLOAD_B: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 3, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 2, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 4, priority: 1 },
];

const WORKLOAD_C: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 2 },
];

/** A deliberate idle gap so CPU utilisation is not a trivial 100%. */
const WORKLOAD_D: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 3, priority: 2 },
  { id: 'p2', name: 'P2', arrivalTime: 10, burstTime: 2, priority: 2 },
];

const SPECS: readonly Spec[] = [
  {
    id: 'challenge-completion-time',
    kind: 'completion-time',
    title: 'Completion time',
    algorithmId: FCFS_ALGORITHM_ID,
    algorithmName: 'First Come, First Served',
    processes: WORKLOAD_A,
    quantum: 0,
    targetProcessId: 'p2',
  },
  {
    id: 'challenge-waiting-time',
    kind: 'waiting-time',
    title: 'Waiting time',
    algorithmId: FCFS_ALGORITHM_ID,
    algorithmName: 'First Come, First Served',
    processes: WORKLOAD_A,
    quantum: 0,
    targetProcessId: 'p3',
  },
  {
    id: 'challenge-turnaround-sjf',
    kind: 'turnaround-time',
    title: 'Turnaround under SJF',
    algorithmId: SJF_ALGORITHM_ID,
    algorithmName: 'Shortest Job First',
    processes: WORKLOAD_B,
    quantum: 0,
    targetProcessId: 'p2',
  },
  {
    id: 'challenge-next-segment-sjf',
    kind: 'next-segment',
    title: 'Next Gantt segment',
    algorithmId: SJF_ALGORITHM_ID,
    algorithmName: 'Shortest Job First',
    processes: WORKLOAD_B,
    quantum: 0,
    targetSegmentIndex: 0,
  },
  {
    id: 'challenge-preempted',
    kind: 'preempted-process',
    title: 'Who loses the CPU?',
    algorithmId: SRTF_ALGORITHM_ID,
    algorithmName: 'Shortest Remaining Time First',
    processes: PREEMPTION_PRESET,
    quantum: 0,
  },
  {
    id: 'challenge-after-preemption',
    kind: 'after-preemption',
    title: 'After the preemption',
    algorithmId: SRTF_ALGORITHM_ID,
    algorithmName: 'Shortest Remaining Time First',
    processes: PREEMPTION_PRESET,
    quantum: 0,
  },
  {
    id: 'challenge-first-completion',
    kind: 'first-completion',
    title: 'First to finish',
    algorithmId: PRIORITY_ALGORITHM_ID,
    algorithmName: 'Priority Scheduling (non-preemptive)',
    processes: WORKLOAD_C,
    quantum: 0,
  },
  {
    id: 'challenge-next-segment-rr',
    kind: 'next-segment',
    title: 'Round Robin rotation',
    algorithmId: ROUND_ROBIN_ALGORITHM_ID,
    algorithmName: 'Round Robin',
    processes: ROUND_ROBIN_PRESET,
    quantum: 2,
    targetSegmentIndex: 0,
  },
  {
    id: 'challenge-context-switches',
    kind: 'context-switches',
    title: 'Context switches',
    algorithmId: FCFS_ALGORITHM_ID,
    algorithmName: 'First Come, First Served',
    processes: WORKLOAD_A,
    quantum: 0,
  },
  {
    id: 'challenge-utilization',
    kind: 'cpu-utilization',
    title: 'CPU utilisation',
    algorithmId: FCFS_ALGORITHM_ID,
    algorithmName: 'First Come, First Served',
    processes: WORKLOAD_D,
    quantum: 0,
  },
];

export const SCHEDULING_CHALLENGE_COUNT = SPECS.length;

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function runSpec(spec: Spec): SimulationRun<ScheduleStepData> {
  switch (spec.algorithmId) {
    case SJF_ALGORITHM_ID:
      return simulateSjf({ processes: spec.processes });
    case SRTF_ALGORITHM_ID:
      return simulateSrtf({ processes: spec.processes });
    case ROUND_ROBIN_ALGORITHM_ID:
      return simulateRoundRobin({ processes: spec.processes, quantum: spec.quantum });
    case PRIORITY_ALGORITHM_ID:
      return simulatePriority({ processes: spec.processes });
    default:
      return simulateFcfs({ processes: spec.processes });
  }
}

function finalData(run: SimulationRun<ScheduleStepData>): ScheduleStepData {
  const step = run.steps[run.steps.length - 1];
  if (!step) throw new Error('scheduling run produced no steps');
  return step.data;
}

/** Deterministic name choices: the correct name plus every other process name. */
function nameChoices(
  names: readonly string[],
  correct: string,
  includeIdle = false,
): { options: string[]; correctIndex: number } {
  const pool = new Set<string>([correct, ...names]);
  if (includeIdle) pool.add('idle');
  const options = [...pool].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * Deterministic numeric choices.
 *
 * The correct value is always included; the distractors are drawn from the
 * engine's own numbers (other processes' times, the process count, …) and, if
 * that is not enough to fill the row, padded with the nearest integers. Values
 * are sorted so the correct answer is not always in the same position.
 */
function numberChoices(
  candidates: readonly number[],
  correct: number,
  format: (value: number) => string = String,
  max = Number.POSITIVE_INFINITY,
  count = 4,
): { options: string[]; correctIndex: number } {
  const pool = new Set<number>([correct]);
  for (const value of candidates) {
    if (Number.isInteger(value) && value >= 0 && value <= max) pool.add(value);
  }
  let pad = 1;
  while (pool.size < count) {
    if (correct + pad <= max) pool.add(correct + pad);
    if (pool.size < count && correct - pad >= 0) pool.add(correct - pad);
    pad += 1;
  }
  let values = [...pool].sort((a, b) => a - b);
  if (values.length > count) {
    const others = values
      .filter((value) => value !== correct)
      .sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct) || a - b);
    values = [correct, ...others.slice(0, count - 1)].sort((a, b) => a - b);
  }
  return { options: values.map(format), correctIndex: values.indexOf(correct) };
}

function segmentsBefore(timeline: readonly GanttSegment[], boundary: number): GanttSegment[] {
  return timeline.filter((segment) => segment.start < boundary);
}

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Turn one spec into a concrete, answerable question.
 *
 * Every answer — a process name, a time, a count — is read out of the schedule
 * the engine just produced, so a question can never disagree with the
 * simulation the learner can run for themselves.
 */
export function buildChallenge(spec: Spec): SchedulingChallenge {
  const run = runSpec(spec);
  const data = finalData(run);
  const timeline = data.timeline;
  const results = data.results;
  const names = spec.processes.map((process) => process.name);
  const span = Math.max(
    1,
    ...timeline.map((segment) => segment.end),
    ...spec.processes.map((process) => process.arrivalTime + process.burstTime),
  );

  const base = {
    id: spec.id,
    kind: spec.kind,
    title: spec.title,
    algorithmId: spec.algorithmId,
    algorithmName: spec.algorithmName,
    processes: spec.processes,
    quantum: spec.quantum,
  };

  switch (spec.kind) {
    case 'first-dispatch': {
      const first = timeline.find((segment) => segment.processId !== null);
      const correct = first?.label ?? names[0] ?? '';
      const choices = nameChoices(names, correct);
      return {
        ...base,
        prompt: 'The workload is scheduled with FCFS. Which process is dispatched first?',
        ...choices,
        explanation: `${correct} is the earliest arrival, and FCFS always dispatches the head of the ready queue, so it runs first from t = ${first?.start ?? 0}.`,
        ...(first ? { atClock: first.start } : {}),
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'next-segment': {
      const index = spec.targetSegmentIndex ?? 0;
      const boundarySegment = timeline[index];
      const next = timeline[index + 1];
      const boundary = boundarySegment?.end ?? 0;
      const correct = next?.label ?? 'idle';
      const choices = nameChoices(names, correct, true);
      return {
        ...base,
        prompt: `The chart so far ends at t = ${boundary}. Which process runs next?`,
        ...choices,
        explanation: `${spec.algorithmName} chooses ${correct} at t = ${boundary}, so the next Gantt segment is ${correct} starting at ${next?.start ?? boundary}.`,
        atClock: boundary,
        previewTimeline: segmentsBefore(timeline, boundary),
        previewSpan: span,
      };
    }

    case 'completion-time': {
      const target = spec.targetProcessId ?? '';
      const result = results.find((item) => item.processId === target);
      const correct = result?.completionTime ?? 0;
      const choices = numberChoices(
        results.flatMap((item) => [item.completionTime, item.startTime]),
        correct,
      );
      const name = result?.processName ?? target.toUpperCase();
      return {
        ...base,
        prompt: `Under FCFS, when does ${name} complete?`,
        ...choices,
        explanation: `${name} finishes at t = ${correct}: it starts at ${result?.startTime ?? 0} and runs for its burst of ${result?.burstTime ?? 0}, giving a completion time of ${result?.startTime ?? 0} + ${result?.burstTime ?? 0} = ${correct}.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'waiting-time': {
      const target = spec.targetProcessId ?? '';
      const result = results.find((item) => item.processId === target);
      const correct = result?.waitingTime ?? 0;
      const choices = numberChoices(
        results.flatMap((item) => [item.waitingTime, item.turnaroundTime]),
        correct,
      );
      const name = result?.processName ?? target.toUpperCase();
      return {
        ...base,
        prompt: `Under FCFS, what is ${name}'s waiting time?`,
        ...choices,
        explanation: `Waiting time = turnaround − burst = ${result?.turnaroundTime ?? 0} − ${result?.burstTime ?? 0} = ${correct}. ${name} arrived at t = ${result?.arrivalTime ?? 0} but did not start until t = ${result?.startTime ?? 0}.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'turnaround-time': {
      const target = spec.targetProcessId ?? '';
      const result = results.find((item) => item.processId === target);
      const correct = result?.turnaroundTime ?? 0;
      const choices = numberChoices(
        results.flatMap((item) => [item.turnaroundTime, item.waitingTime]),
        correct,
      );
      const name = result?.processName ?? target.toUpperCase();
      return {
        ...base,
        prompt: `Under SJF, what is ${name}'s turnaround time?`,
        ...choices,
        explanation: `Turnaround = completion − arrival = ${result?.completionTime ?? 0} − ${result?.arrivalTime ?? 0} = ${correct}.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'preempted-process': {
      const step = run.steps.find((item) => item.label.endsWith('preempted'));
      const outgoingId = step?.data.runningProcessId ?? null;
      const correct = spec.processes.find((process) => process.id === outgoingId)?.name ?? '';
      const choices = nameChoices(names, correct);
      const boundary = step?.clock ?? 0;
      return {
        ...base,
        prompt: `SRTF is running. At t = ${boundary}, which process is preempted?`,
        ...choices,
        explanation: `${correct} is preempted at t = ${boundary}: a newly arrived process needs less remaining time, so SRTF takes the CPU away and ${correct} returns to the ready queue.`,
        atClock: boundary,
        previewTimeline: segmentsBefore(timeline, boundary),
        previewSpan: span,
      };
    }

    case 'after-preemption': {
      const step = run.steps.find((item) => item.label.endsWith('preempted'));
      const boundary = step?.clock ?? 0;
      const next = timeline.find((segment) => segment.start >= boundary);
      const correct = next?.label ?? 'idle';
      const choices = nameChoices(names, correct, true);
      return {
        ...base,
        prompt: `After the preemption at t = ${boundary}, which process holds the CPU next?`,
        ...choices,
        explanation: `At t = ${boundary} the newcomer has less remaining work, so SRTF dispatches ${correct} immediately — no idle time is inserted between the two segments.`,
        atClock: boundary,
        previewTimeline: segmentsBefore(timeline, boundary),
        previewSpan: span,
      };
    }

    case 'first-completion': {
      const first = [...results].sort((a, b) => a.completionTime - b.completionTime)[0];
      const correct = first?.processName ?? names[0] ?? '';
      const choices = nameChoices(names, correct);
      return {
        ...base,
        prompt: 'This workload runs under non-preemptive priority scheduling. Which process completes first?',
        ...choices,
        explanation: `${correct} completes first at t = ${first?.completionTime ?? 0}. It was already running when the more urgent processes arrived, and the non-preemptive variant never interrupts a burst.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'context-switches': {
      const correct = run.summary.contextSwitches ?? 0;
      const processCount = spec.processes.length;
      const choices = numberChoices(
        [processCount, processCount - 1, processCount + 1, Math.max(0, processCount - 2)],
        correct,
      );
      return {
        ...base,
        prompt: 'How many context switches does this FCFS schedule involve?',
        ...choices,
        explanation: `FCFS never preempts, so it switches once between each pair of consecutive processes: ${processCount} processes produce ${correct} switches. The very first dispatch is not a switch.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    case 'cpu-utilization': {
      const correct = Math.round((run.summary.cpuUtilization ?? 0) * 100);
      const choices = numberChoices([100, 50, Math.max(0, correct - 25), correct + 25], correct, (value) => `${value}%`, 100);
      const idle = run.summary.idleTime ?? 0;
      return {
        ...base,
        prompt: 'Between t = 0 and the last completion, what percentage of the time is the CPU busy?',
        ...choices,
        explanation: `The CPU is idle for ${idle} time unit${idle === 1 ? '' : 's'} while it waits for P2 to arrive, so utilisation is busy ÷ makespan = ${correct}%.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }

    default: {
      const correct = names[0] ?? '';
      const choices = nameChoices(names, correct);
      return {
        ...base,
        prompt: 'Which process runs first?',
        ...choices,
        explanation: `${correct} runs first.`,
        previewTimeline: [],
        previewSpan: span,
      };
    }
  }
}

/** Build the full, deterministic challenge set. */
export function buildSchedulingChallenges(): SchedulingChallenge[] {
  return SPECS.map((spec) => buildChallenge(spec));
}
