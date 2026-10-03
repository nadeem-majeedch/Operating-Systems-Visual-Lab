import type { MemoryInput, MemoryOperation, MemoryPreset } from '@/engine';

/** Editable state behind the memory workstation: the script and the layout. */
export interface MemoryDraft {
  totalSize: number;
  /** Present for fixed partitioning only. */
  partitions: number[];
  operations: MemoryOperation[];
}

export function draftFromPreset(preset: MemoryPreset): MemoryDraft {
  return {
    totalSize: preset.totalSize,
    partitions: preset.partitions ? [...preset.partitions] : [],
    operations: preset.operations.map((operation) => ({ ...operation })),
  };
}

/** Build a draft from a full engine input, used when loading an example. */
export function draftFromInput(input: MemoryInput): MemoryDraft {
  return {
    totalSize: input.totalSize,
    partitions: input.partitions ? [...input.partitions] : [],
    operations: input.operations.map((operation) => ({ ...operation })),
  };
}
