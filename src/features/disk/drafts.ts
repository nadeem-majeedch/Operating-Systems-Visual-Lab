import type { DiskAlgorithm, DiskDirection, DiskInput, DiskPreset } from '@/engine';

/** Editable state behind the disk-scheduling workstation. */
export interface DiskDraft {
  algorithm: DiskAlgorithm;
  diskSize: number;
  head: number;
  requests: number[];
  direction: DiskDirection;
}

export function draftFromPreset(preset: DiskPreset): DiskDraft {
  return draftFromInput(preset.input);
}

export function draftFromInput(input: DiskInput): DiskDraft {
  return {
    algorithm: input.algorithm,
    diskSize: input.diskSize,
    head: input.head,
    requests: [...input.requests],
    direction: input.direction,
  };
}
