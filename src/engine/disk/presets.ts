import type { DiskInput } from './types';

export interface DiskPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: DiskInput;
}

/** The textbook queue from Silberschatz: requests scattered across 0..199. */
const CLASSIC: readonly number[] = [98, 183, 37, 122, 14, 124, 65, 67];

/**
 * Deterministic disk workloads.
 *
 * The classic scattered queue makes every policy diverge; the extra presets
 * isolate one idea each — the value of the sweep direction, SSTF's starvation
 * risk, and the extra edge travel that separates SCAN from LOOK and C-SCAN from
 * C-LOOK.
 */
export const DISK_PRESETS: readonly DiskPreset[] = [
  {
    id: 'disk-fcfs',
    name: 'FCFS — arrival order',
    description: 'Service the scattered queue exactly as it arrived, whatever the distance.',
    input: { algorithm: 'fcfs', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-sstf',
    name: 'SSTF — nearest first',
    description: 'Greedily serve the closest request and watch total movement collapse.',
    input: { algorithm: 'sstf', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-scan',
    name: 'SCAN (elevator, up)',
    description: 'Sweep to the top edge, then reverse — every request waits at most one sweep.',
    input: { algorithm: 'scan', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-cscan',
    name: 'C-SCAN (circular, up)',
    description: 'Sweep up only, return to 0 without servicing, and sweep again.',
    input: { algorithm: 'c-scan', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-look',
    name: 'LOOK (up)',
    description: 'Like SCAN, but reverse at the last request instead of the disk edge.',
    input: { algorithm: 'look', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-clook',
    name: 'C-LOOK (up)',
    description: 'Sweep up only and jump straight to the lowest pending request.',
    input: { algorithm: 'c-look', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'up' },
  },
  {
    id: 'disk-scan-down',
    name: 'SCAN down — direction matters',
    description: 'The same queue swept toward cylinder 0 first instead of the top edge.',
    input: { algorithm: 'scan', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'down' },
  },
  {
    id: 'disk-look-down',
    name: 'LOOK down',
    description: 'Reverse at the lowest request rather than travelling to cylinder 0.',
    input: { algorithm: 'look', diskSize: 200, head: 53, requests: [...CLASSIC], direction: 'down' },
  },
  {
    id: 'disk-sstf-starvation',
    name: 'SSTF starvation',
    description: 'A cluster beside the head starves the single far request, even though it arrived first.',
    input: {
      algorithm: 'sstf',
      diskSize: 200,
      head: 50,
      requests: [10, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      direction: 'up',
    },
  },
  {
    id: 'disk-fairness',
    name: 'Fairness under load',
    description: 'Requests clustered at both ends: SCAN serves the low end only after reaching the edge.',
    input: {
      algorithm: 'c-scan',
      diskSize: 200,
      head: 100,
      requests: [10, 20, 30, 40, 150, 160, 170, 180, 190],
      direction: 'up',
    },
  },
];

export function findDiskPreset(id: string): DiskPreset | undefined {
  return DISK_PRESETS.find((preset) => preset.id === id);
}
