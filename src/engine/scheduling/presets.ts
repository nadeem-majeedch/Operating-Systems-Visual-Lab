import type { Process } from './types';
import { MAX_PROCESSES } from './validate';

/**
 * Build a process with a conventional `P<n>` name.
 *
 * `priority` is optional so the helper keeps working for policies that ignore
 * it; colour is left unset and resolved from the palette by the presentation
 * layer, unless a workload wants to pin an explicit visual identity.
 */
export function createProcess(
  index: number,
  arrivalTime: number,
  burstTime: number,
  priority?: number,
): Process {
  const number = index + 1;
  return {
    id: `p${number}`,
    name: `P${number}`,
    arrivalTime,
    burstTime,
    ...(priority === undefined ? {} : { priority }),
  };
}

/** Themed palette for Gantt segments; colour-blind friendly and high contrast. */
export const PROCESS_COLORS: readonly string[] = [
  '#6366f1',
  '#22d3ee',
  '#f59e0b',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#4ade80',
  '#38bdf8',
  '#facc15',
  '#c084fc',
  '#2dd4bf',
];

export function colorForIndex(index: number): string {
  if (PROCESS_COLORS.length === 0) return '#6366f1';
  return PROCESS_COLORS[((index % PROCESS_COLORS.length) + PROCESS_COLORS.length) % PROCESS_COLORS.length]!;
}

/** Classic textbook example: staggered arrivals with a long burst. */
export const FCFS_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 7, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 4, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1, priority: 1 },
  { id: 'p4', name: 'P4', arrivalTime: 5, burstTime: 4, priority: 4 },
];

/** A convoy-effect demo: one long job blocks three short ones. */
export const CONVOY_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 12, priority: 6 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 2, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 3 },
  { id: 'p4', name: 'P4', arrivalTime: 3, burstTime: 2, priority: 4 },
];

/** All jobs arrive together — FCFS degenerates to fixed ordering. */
export const BATCH_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
  { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 3, priority: 1 },
  { id: 'p3', name: 'P3', arrivalTime: 0, burstTime: 8, priority: 3 },
];

/** Small, gentle workload — the default starting point for a new learner. */
export const SIMPLE_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 1 },
];

/**
 * A short job arriving late, so a preemptive policy clearly takes the CPU away
 * from a long-running process mid-burst.
 */
export const PREEMPTION_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 8, priority: 4 },
  { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 2, priority: 1 },
  { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1, priority: 2 },
];

/**
 * One long low-priority job plus a steady stream of short high-priority jobs:
 * the classic starvation pattern for SRTF and priority scheduling.
 */
export const STARVATION_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 16, priority: 9 },
  { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 2, priority: 1 },
  { id: 'p3', name: 'P3', arrivalTime: 5, burstTime: 2, priority: 1 },
  { id: 'p4', name: 'P4', arrivalTime: 8, burstTime: 2, priority: 2 },
];

/** Four equal jobs arriving together — the canonical Round Robin fairness case. */
export const ROUND_ROBIN_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 1 },
  { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 4, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 0, burstTime: 4, priority: 3 },
  { id: 'p4', name: 'P4', arrivalTime: 0, burstTime: 4, priority: 4 },
];

/** Staggered arrivals with varied bursts and priorities — a realistic mix. */
export const MIXED_PRESET: readonly Process[] = [
  { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 6, priority: 5 },
  { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 2, priority: 2 },
  { id: 'p3', name: 'P3', arrivalTime: 3, burstTime: 8, priority: 8 },
  { id: 'p4', name: 'P4', arrivalTime: 4, burstTime: 3, priority: 1 },
  { id: 'p5', name: 'P5', arrivalTime: 6, burstTime: 1, priority: 6 },
];

export interface ProcessPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly processes: readonly Process[];
}

/** Every shipped workload. `simple` is the gentle default; `mixed` is the challenge. */
export const PROCESS_PRESETS: readonly ProcessPreset[] = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'Three short jobs with staggered arrivals.',
    processes: SIMPLE_PRESET,
  },
  {
    id: 'textbook',
    name: 'Textbook mix',
    description: 'Staggered arrivals with one long CPU-bound job.',
    processes: FCFS_PRESET,
  },
  {
    id: 'preemption',
    name: 'Preemption',
    description: 'A late short job interrupts a long one under SRTF.',
    processes: PREEMPTION_PRESET,
  },
  {
    id: 'starvation',
    name: 'Starvation',
    description: 'A stream of short high-priority jobs keeps a long low-priority job waiting.',
    processes: STARVATION_PRESET,
  },
  {
    id: 'round-robin',
    name: 'Round Robin',
    description: 'Four equal jobs ready together — pure fairness.',
    processes: ROUND_ROBIN_PRESET,
  },
  {
    id: 'mixed',
    name: 'Mixed arrivals',
    description: 'Five jobs with varied bursts and priorities.',
    processes: MIXED_PRESET,
  },
  {
    id: 'convoy',
    name: 'Convoy effect',
    description: 'One long job delays three short ones behind it.',
    processes: CONVOY_PRESET,
  },
  {
    id: 'batch',
    name: 'Simultaneous batch',
    description: 'Every process arrives at t=0.',
    processes: BATCH_PRESET,
  },
];

/** Deterministic pseudo-random set so "Generate" stays reproducible in tests. */
export function randomProcessSet(seed = Date.now(), size = 4): Process[] {
  const count = Math.min(Math.max(2, size), 8);
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  const nextRandom = (): number => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  return Array.from({ length: count }, (_, index) =>
    createProcess(
      index,
      Math.floor(nextRandom() * 6),
      1 + Math.floor(nextRandom() * 8),
      1 + Math.floor(nextRandom() * 5),
    ),
  );
}

export const MAX_PROCESS_COUNT = MAX_PROCESSES;
