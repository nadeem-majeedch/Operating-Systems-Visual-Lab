import type { Algorithm } from '@/types';
import { deriveAlgorithmConcept } from '../lab/algorithmConcept';

export interface SchedulingConcept {
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

/**
 * Concept explanations shown at the top of the CPU scheduling lab.
 *
 * Only authored where a simulator exists or the idea is self-contained; every
 * other algorithm falls back to its own catalogue description plus its declared
 * properties, which are facts rather than filler.
 */
const AUTHORED: Readonly<Record<string, SchedulingConcept>> = {
  fcfs: {
    paragraphs: [
      'First Come, First Served keeps one ready queue and always dispatches the process at its head. A running process is never interrupted: it holds the CPU until its burst is finished, no matter who arrives meanwhile.',
      'That makes FCFS the simplest possible policy and the easiest to reason about, but it couples waiting time tightly to arrival order. One long CPU-bound job at the front of the queue delays every short job behind it — the convoy effect.',
      'FCFS cannot starve a process, because nothing ever overtakes it in the queue. The price is an average waiting time that swings wildly with the arrival pattern, and no way to prioritise interactive work.',
    ],
    keyPoints: [
      'Non-preemptive: a running process always finishes its burst.',
      'Waiting time = start − arrival, and it is entirely determined by earlier arrivals.',
      'Never starves, never preempts, and is optimal for nothing in particular.',
    ],
  },
  'round-robin': {
    paragraphs: [
      'Round Robin gives every process the same fixed slice of CPU time, called a time quantum, and then moves it to the tail of the ready queue. Processes that arrive during a slice are queued ahead of the process that just used its quantum, which is what keeps the policy fair to new arrivals.',
      'The quantum is the policy. A large quantum means fewer context switches but longer waits before a process first runs; a quantum no larger than the shortest burst degenerates to FCFS, while a tiny quantum maximises responsiveness and spends the CPU on switching instead of work.',
      'Round Robin bounds response time rather than minimising it: with n processes and quantum q, nothing waits longer than (n − 1) × q before its first turn. That guarantee, not average waiting time, is why time-sharing systems use it.',
    ],
    keyPoints: [
      'Preemptive: the quantum, not the process, decides when the CPU changes hands.',
      'Response time is bounded by (n − 1) × quantum, so interactivity is predictable.',
      'Smaller quantum → better responsiveness, more context switches and more overhead.',
      'Never starves, because every process returns to the queue after at most one slice.',
    ],
  },
  sjf: {
    paragraphs: [
      'Shortest Job First dispatches the ready process with the smallest burst time. When every process is ready at the same moment it provably minimises average waiting time, because moving a shorter job ahead of a longer one can only reduce the total waited by the rest of the queue.',
      'The catch is knowledge: a scheduler cannot know a burst time before the process runs. Real systems estimate it from recent history (exponential averaging of previous bursts), so SJF in practice is a prediction, not a fact.',
      'Because long jobs keep losing to short ones, SJF can starve a CPU-bound process indefinitely on a busy system — the classic argument for adding aging.',
    ],
    keyPoints: [
      'Non-preemptive variant: the running job is never interrupted.',
      'Optimal average waiting time, but only when arrivals are simultaneous.',
      'Needs burst-time estimates, so it is offline-optimal and online-approximate.',
      'Starvation is possible; aging is the usual remedy.',
    ],
  },
  srtf: {
    paragraphs: [
      'Shortest Remaining Time First is SJF with preemption: whenever a process arrives whose remaining time is less than the current process needs, the CPU switches immediately.',
      'Preempting more often reduces average waiting time further than SJF, at the cost of more context switches and continuous remaining-time bookkeeping. It can be shown to be optimal among preemptive policies given perfect knowledge of the future.',
      'Like SJF it can starve long jobs, and it is harder to implement because remaining time must be re-evaluated on every arrival.',
    ],
    keyPoints: [
      'Preemptive form of SJF; optimal with perfect burst-time knowledge.',
      'Every arrival can trigger a context switch.',
      'Still requires future knowledge, so it is a yardstick as much as a policy.',
    ],
  },
  'priority-scheduling': {
    paragraphs: [
      'Priority scheduling always runs the ready process with the highest priority. Priorities can be internal (derived from resource use or burst history) or external (set by the user or an administrator).',
      'With fixed priorities, a steady stream of high-priority work can starve low-priority processes forever. Aging solves this by gradually raising the priority of processes that have waited a long time.',
      'The main implementation question is tie-breaking, which is why the simulator here breaks ties by arrival time and then by name to stay deterministic.',
    ],
    keyPoints: [
      'Choice of priority source is what makes one priority scheduler different from another.',
      'Without aging, starvation of low-priority processes is guaranteed on a busy system.',
      'Priority inversion is a related hazard when a low-priority task holds a lock a high-priority task needs.',
    ],
  },
};

/** Build the concept block content for any scheduling algorithm. */
export function conceptFor(algorithm: Algorithm): SchedulingConcept {
  return AUTHORED[algorithm.id] ?? deriveAlgorithmConcept(algorithm);
}
