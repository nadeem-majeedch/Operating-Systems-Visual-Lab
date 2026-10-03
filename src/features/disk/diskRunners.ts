import type { SimulationRun } from '@/engine';
import {
  DISK_ALGORITHM_IDS,
  DISK_ALGORITHMS,
  DISK_PRESETS,
  DISK_LAB_ID,
  runDiskScheduling,
  type DiskAlgorithm,
  type DiskInput,
  type DiskPreset,
  type DiskStepData,
} from '@/engine';
import type { DiskDraft } from './drafts';

export const DISK_TOPIC_ID = 'disk-scheduling';
export const DISK_LAB_ID_VALUE = DISK_LAB_ID;

export function diskPresetOptions(): readonly DiskPreset[] {
  return DISK_PRESETS;
}

/** Assemble an engine input from the workstation's editable draft. */
export function diskInput(draft: DiskDraft): DiskInput {
  return {
    algorithm: draft.algorithm,
    diskSize: draft.diskSize,
    head: draft.head,
    requests: [...draft.requests],
    direction: draft.direction,
  };
}

export function runDiskInput(input: DiskInput): SimulationRun<DiskStepData> {
  return runDiskScheduling(input);
}

/** Map a lab's starting algorithm id (e.g. `sstf`) back to its policy. */
export function algorithmForAlgorithmId(algorithmId: string): DiskAlgorithm | undefined {
  return DISK_ALGORITHMS.find((algorithm) => DISK_ALGORITHM_IDS[algorithm] === algorithmId);
}

/**
 * Deterministic pseudo-random request queue.
 *
 * A tiny linear congruential generator keeps "generate requests" reproducible:
 * the same seed always yields the same queue, so a workload can be recreated and
 * asserted in tests rather than depending on `Math.random`.
 */
export function generateRequests(diskSize: number, count: number, seed: number): number[] {
  const size = Math.max(1, Math.floor(diskSize));
  const total = Math.max(0, Math.floor(count));
  let state = (Math.floor(seed) >>> 0) || 1;
  const requests: number[] = [];
  for (let index = 0; index < total; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    requests.push(state % size);
  }
  return requests;
}
