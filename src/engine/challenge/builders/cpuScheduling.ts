import type { Process, ProcessResult } from '../../scheduling';
import {
  BATCH_PRESET,
  CONVOY_PRESET,
  FCFS_PRESET,
  MIXED_PRESET,
  PREEMPTION_PRESET,
  ROUND_ROBIN_PRESET,
  STARVATION_PRESET,
  simulateFcfs,
  simulatePriority,
  simulatePriorityPreemptive,
  simulateRoundRobin,
  simulateSjf,
  simulateSrtf,
} from '../../scheduling';
import type { Challenge } from '../types';
import { choiceSet, makeAlternatives } from './helpers';

const TOPIC = 'cpu-scheduling';
const BANK = 'cpu-scheduling';
const LAB = 'lab-fcfs';

type Run = ReturnType<typeof simulateFcfs>;

function results(run: Run): readonly ProcessResult[] {
  const last = run.steps[run.steps.length - 1];
  return last ? last.data.results : [];
}

function completionOrder(run: Run): string[] {
  return [...results(run)]
    .sort((a, b) => a.completionTime - b.completionTime)
    .map((result) => result.processName);
}

function firstStarted(run: Run): string {
  const ordered = [...results(run)].sort((a, b) => a.startTime - b.startTime);
  return ordered[0]?.processName ?? 'P1';
}

function averageWait(run: Run): number {
  return run.summary.averageWaitingTime ?? 0;
}

function namesOf(workload: readonly Process[]): string[] {
  return workload.map((process) => process.name);
}

/**
 * Every answer here is produced by running the shipped scheduling engine, so a
 * question can never disagree with the simulator it points at.
 */
export function cpuSchedulingChallenges(): Challenge[] {
  const challenges: Challenge[] = [];

  // FCFS average waiting time.
  {
    const value = averageWait(simulateFcfs({ processes: FCFS_PRESET }));
    challenges.push({
      id: 'cpu-fcfs-average-wait',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'What is the average waiting time under FCFS?',
      scenario:
        'The textbook mix P1(0,7), P2(2,4), P3(4,1), P4(5,4) — arrival time, then burst — served first-come, first-served.',
      expectedAnswer: { kind: 'number', value, tolerance: 0.05 },
      unit: 'time units',
      explanation: `FCFS runs each process to completion in arrival order, so the average waiting time is ${value}. Waiting time is start − arrival, and later arrivals wait behind every burst already committed.`,
      relatedLab: LAB,
    });
  }

  // SJF average waiting time on the same workload.
  {
    const value = averageWait(simulateSjf({ processes: FCFS_PRESET }));
    challenges.push({
      id: 'cpu-sjf-average-wait',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'What is the average waiting time under non-preemptive SJF on the same workload?',
      scenario: 'P1(0,7), P2(2,4), P3(4,1), P4(5,4), scheduled shortest-job-first without preemption.',
      expectedAnswer: { kind: 'number', value, tolerance: 0.05 },
      unit: 'time units',
      explanation: `SJF reorders the ready queue by burst length, giving an average waiting time of ${value}. It can beat FCFS only because a later short job is allowed to jump ahead.`,
      relatedLab: LAB,
    });
  }

  // SRTF average waiting time.
  {
    const value = averageWait(simulateSrtf({ processes: PREEMPTION_PRESET }));
    challenges.push({
      id: 'cpu-srtf-average-wait',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'What is the average waiting time under SRTF?',
      scenario:
        'P1(0,8) is running when P2(2,2) arrives, then P3(4,1) arrives. SRTF always runs the least remaining work.',
      expectedAnswer: { kind: 'number', value, tolerance: 0.05 },
      unit: 'time units',
      explanation: `SRTF preempts P1 whenever a shorter job arrives; its average waiting time here is ${value}. The gain over SJF comes at the cost of frequent context switches.`,
      relatedLab: 'lab-sjf',
    });
  }

  // Round-robin context switches.
  {
    const run = simulateRoundRobin({ processes: ROUND_ROBIN_PRESET, quantum: 2 });
    const value = run.summary.contextSwitches ?? 0;
    challenges.push({
      id: 'cpu-rr-context-switches',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many context switches does Round Robin with a quantum of 2 cause?',
      scenario: 'Four equal processes P1–P4, each arriving at t = 0 needing 4 units, quantum 2.',
      expectedAnswer: { kind: 'number', value, tolerance: 0 },
      unit: 'context switches',
      explanation: `Each slice handed to a different process is a switch; the run performs ${value}. A smaller quantum raises this number — the overhead Round Robin trades for fairness.`,
      relatedLab: 'lab-round-robin',
    });
  }

  // Which process runs first under priority scheduling.
  {
    const names = namesOf(MIXED_PRESET);
    const correct = firstStarted(simulatePriority({ processes: MIXED_PRESET }));
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 2);
    challenges.push({
      id: 'cpu-priority-first',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'Which process is dispatched first under non-preemptive priority scheduling?',
      scenario:
        'P1(0,6,prio 5), P2(1,2,prio 2), P3(3,8,prio 8), P4(4,3,prio 1), P5(6,1,prio 6). Lower numbers mean higher priority.',
      options,
      expectedAnswer: { kind: 'choice', optionId: correctId },
      explanation: `At t = 0 only P1 has arrived, so it is the only ready process and ${correct} runs first — priority cannot promote a process that has not arrived yet.`,
      relatedLab: 'lab-priority-scheduling',
    });
  }

  // Which process finishes first under preemptive priority.
  {
    const names = namesOf(PREEMPTION_PRESET);
    const correct = completionOrder(simulatePriorityPreemptive({ processes: PREEMPTION_PRESET }))[0] ?? 'P2';
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 1);
    challenges.push({
      id: 'cpu-priority-preempt-first',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Which process completes first under preemptive priority scheduling?',
      scenario: 'P1(0,8,prio 4), P2(2,2,prio 1), P3(4,1,prio 2). Priority 1 is the most urgent.',
      options,
      expectedAnswer: { kind: 'choice', optionId: correctId },
      explanation: `${correct} is the highest-priority process in the system when it arrives, so it preempts whatever is running and finishes first.`,
      relatedLab: 'lab-priority-scheduling',
    });
  }

  // FCFS convoy: which process finishes last.
  {
    const names = namesOf(CONVOY_PRESET);
    const order = completionOrder(simulateFcfs({ processes: CONVOY_PRESET }));
    const correct = order[order.length - 1] ?? 'P4';
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 3);
    challenges.push({
      id: 'cpu-fcfs-convoy-last',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Which process completes last under FCFS?',
      scenario:
        'The convoy workload P1(0,12), P2(1,2), P3(2,2), P4(3,2): the three short jobs arrive while P1 is still running.',
      options,
      expectedAnswer: { kind: 'choice', optionId: correctId },
      explanation: `FCFS never preempts, so P1 runs its full 12 units and the three short jobs queue behind it. ${correct} finishes last even though it needs the least work — the convoy effect.`,
      relatedLab: LAB,
    });
  }

  // SJF vs FCFS on a simultaneous batch.
  {
    const sjf = averageWait(simulateSjf({ processes: BATCH_PRESET }));
    const fcfs = averageWait(simulateFcfs({ processes: BATCH_PRESET }));
    const correct = sjf <= fcfs ? 'Shortest Job First' : 'First Come, First Served';
    const { options, correctId } = choiceSet(
      correct,
      ['First Come, First Served', 'Round Robin', 'Priority'].filter((label) => label !== correct),
      0,
    );
    challenges.push({
      id: 'cpu-sjf-vs-fcfs-batch',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'Which policy gives the lower average waiting time when all three jobs are ready at t = 0?',
      scenario: 'A simultaneous batch P1(0,5), P2(0,3), P3(0,8).',
      options,
      expectedAnswer: { kind: 'decision', optionId: correctId },
      explanation: `With every job ready together, SJF averages ${sjf} against FCFS's ${fcfs}. Shortest-first is provably optimal for average waiting time precisely in this situation, where no future arrival can be hidden from the scheduler.`,
      relatedLab: 'lab-sjf',
    });
  }

  // Round-robin average response time.
  {
    const run = simulateRoundRobin({ processes: ROUND_ROBIN_PRESET, quantum: 3 });
    const value = run.summary.averageResponseTime ?? 0;
    challenges.push({
      id: 'cpu-rr-average-response',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'What is the average response time under Round Robin with a quantum of 3?',
      scenario: 'Four equal processes, each arriving at t = 0 needing 4 units, quantum 3.',
      expectedAnswer: { kind: 'number', value, tolerance: 0.05 },
      unit: 'time units',
      explanation: `Response time is measured to the first dispatch, not completion. With a quantum of 3 the first four dispatches happen at t = 0, 3, 6 and 9, giving an average of ${value}.`,
      relatedLab: 'lab-round-robin',
    });
  }

  // Sequence: SJF completion order on the batch.
  {
    const order = completionOrder(simulateSjf({ processes: BATCH_PRESET }));
    const options = makeAlternatives(namesOf(BATCH_PRESET));
    challenges.push({
      id: 'cpu-sjf-completion-order',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'sequence',
      question: 'Arrange the processes in the order they complete under non-preemptive SJF.',
      scenario: 'P1(0,5), P2(0,3), P3(0,8), all ready at t = 0.',
      options,
      expectedAnswer: {
        kind: 'sequence',
        order: order.map((name) => options.find((option) => option.label === name)?.id ?? options[0]!.id),
      },
      explanation: `SJF runs the 3-unit job, then the 5-unit job, then the 8-unit job: ${order.join(' → ')}. With simultaneous arrivals the completion order is simply ascending burst time.`,
      relatedLab: 'lab-sjf',
    });
  }

  // Starvation under SRTF.
  {
    const names = namesOf(STARVATION_PRESET);
    const order = completionOrder(simulateSrtf({ processes: STARVATION_PRESET }));
    const correct = order[order.length - 1] ?? 'P1';
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 0);
    challenges.push({
      id: 'cpu-srtf-starvation',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'Which process finishes last under SRTF?',
      scenario: 'P1(0,16) competes with a stream of short jobs: P2(2,2), P3(5,2), P4(8,2).',
      options,
      expectedAnswer: { kind: 'choice', optionId: correctId },
      explanation: `Every short arrival has less remaining work than ${correct}, so SRTF keeps deferring the long job — ${correct} finishes last. This is the textbook starvation pattern.`,
      relatedLab: 'lab-sjf',
    });
  }

  // Preemptive priority context-switch count.
  {
    const run = simulatePriorityPreemptive({ processes: STARVATION_PRESET });
    const value = run.summary.contextSwitches ?? 0;
    challenges.push({
      id: 'cpu-priority-preempt-switches',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'numerical',
      question:
        'How many context switches does preemptive priority scheduling perform on the starvation workload?',
      scenario: 'P1(0,16,prio 9) with urgent arrivals P2(2,2,prio 1), P3(5,2,prio 1), P4(8,2,prio 2).',
      expectedAnswer: { kind: 'number', value, tolerance: 0 },
      unit: 'context switches',
      explanation: `Each urgent arrival preempts the running job and each resumption switches back: ${value} switches in all. Preemption buys responsiveness and pays in switching overhead.`,
      relatedLab: 'lab-priority-scheduling',
    });
  }

  return challenges;
}
