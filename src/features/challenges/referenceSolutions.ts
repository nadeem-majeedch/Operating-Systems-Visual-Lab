import type { Process } from '@/engine';
import { CONVOY_PRESET, simulateFcfs, simulateRoundRobin } from '@/engine';
import { formatNumber } from '@/utils';

/**
 * Reference solutions.
 *
 * These are not canned answers: each row is produced by running the shipped
 * engine over a stated workload when the page renders, so a reference solution
 * can never drift away from the simulator it describes.
 */

export interface ReferenceVariant {
  readonly label: string;
  /** Value handed to the engine for the swept parameter. */
  readonly value: number;
}

export interface ReferenceCell {
  readonly label: string;
  readonly value: number;
  readonly formatted: string;
}

export interface ReferenceRow {
  readonly label: string;
  readonly cells: readonly ReferenceCell[];
}

export interface ReferenceSolution {
  readonly challengeId: string;
  readonly title: string;
  readonly algorithmLabel: string;
  readonly note: string;
  readonly columns: readonly string[];
  readonly rows: readonly ReferenceRow[];
  /** Workload used, so a learner can reproduce it. */
  readonly workload: readonly Process[];
}

const TUNING_WORKLOAD: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 5 },
  { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 5 },
  { id: 'p3', name: 'P3', arrivalTime: 0, burstTime: 5 },
  { id: 'p4', name: 'P4', arrivalTime: 0, burstTime: 5 },
];

const QUANTUMS = [1, 2, 3, 4, 6, 20];

function cell(label: string, value: number, decimals = 2): ReferenceCell {
  return { label, value, formatted: formatNumber(value, decimals) };
}

/** The convoy workload under FCFS, with every timing the challenge asks for. */
function convoyDiagnosis(): ReferenceSolution {
  const run = simulateFcfs({ processes: CONVOY_PRESET });
  const results = run.steps[run.steps.length - 1]?.data.results ?? [];

  return {
    challengeId: 'challenge-convoy-diagnosis',
    title: 'Reference run',
    algorithmLabel: 'First Come, First Served',
    note: 'Computed by the FCFS engine over the convoy workload. Open the lab, select the Convoy effect preset and check each row against the step explanations.',
    columns: ['Arrival', 'Burst', 'Start', 'Completion', 'Turnaround', 'Waiting'],
    rows: results.map((result) => ({
      label: result.processName,
      cells: [
        cell('arrival', result.arrivalTime, 0),
        cell('burst', result.burstTime, 0),
        cell('start', result.startTime, 0),
        cell('completion', result.completionTime, 0),
        cell('turnaround', result.turnaroundTime, 0),
        cell('waiting', result.waitingTime, 0),
      ],
    })),
    workload: CONVOY_PRESET,
  };
}

/** Sweep the quantum and report what each choice costs and buys. */
function quantumTuning(): ReferenceSolution {
  const rows: ReferenceRow[] = QUANTUMS.map((quantum) => {
    const run = simulateRoundRobin({ processes: TUNING_WORKLOAD, quantum });
    return {
      label: `quantum ${quantum}`,
      cells: [
        cell('response', run.summary.averageResponseTime ?? 0, 2),
        cell('waiting', run.summary.averageWaitingTime ?? 0, 2),
        cell('slices', run.summary.timeSlices ?? 0, 0),
        cell('switches', run.summary.contextSwitches ?? 0, 0),
      ],
    };
  });

  return {
    challengeId: 'challenge-quantum-tuning',
    title: 'Quantum sweep',
    algorithmLabel: 'Round Robin',
    note: 'Four identical processes (5 units each) arriving at t = 0, simulated once per quantum by the Round Robin engine. Smaller quanta buy a faster first turn and pay for it in context switches.',
    columns: ['Avg response', 'Avg waiting', 'Time slices', 'Context switches'],
    rows,
    workload: TUNING_WORKLOAD,
  };
}

/** Solutions available for the challenges that name a workload. */
export function getReferenceSolution(challengeId: string): ReferenceSolution | undefined {
  switch (challengeId) {
    case 'challenge-convoy-diagnosis':
      return convoyDiagnosis();
    case 'challenge-quantum-tuning':
      return quantumTuning();
    default:
      return undefined;
  }
}

export function hasReferenceSolution(challengeId: string): boolean {
  return getReferenceSolution(challengeId) !== undefined;
}
