import type { AllocationStrategy, FsInput, FsOperation, FsPreset } from '@/engine';

/** Editable state behind the file-system workstation. */
export interface FsDraft {
  allocation: AllocationStrategy;
  blockCount: number;
  blockSize: number;
  inodeCount: number;
  /** The operation script, replayed by the engine step by step. */
  operations: FsOperation[];
}

function cloneOperation(operation: FsOperation): FsOperation {
  return { ...operation };
}

export function draftFromPreset(preset: FsPreset): FsDraft {
  return draftFromInput(preset.input);
}

export function draftFromInput(input: FsInput): FsDraft {
  return {
    allocation: input.allocation,
    blockCount: input.blockCount,
    blockSize: input.blockSize,
    inodeCount: input.inodeCount,
    operations: input.operations.map(cloneOperation),
  };
}
