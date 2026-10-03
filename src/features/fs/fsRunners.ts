import type { SimulationRun } from '@/engine';
import {
  ALLOCATION_ALGORITHM_IDS,
  ALLOCATION_STRATEGIES,
  FS_LAB_ID,
  FS_PRESETS,
  runFileSystem,
  type AllocationStrategy,
  type FsInput,
  type FsPreset,
  type FsStepData,
} from '@/engine';
import type { FsDraft } from './drafts';

export const FS_TOPIC_ID = 'file-systems';
export const FS_LAB_ID_VALUE = FS_LAB_ID;

export function fsPresetOptions(): readonly FsPreset[] {
  return FS_PRESETS;
}

/** Assemble an engine input from the workstation's editable draft. */
export function fsInput(draft: FsDraft): FsInput {
  return {
    allocation: draft.allocation,
    blockCount: draft.blockCount,
    blockSize: draft.blockSize,
    inodeCount: draft.inodeCount,
    operations: draft.operations.map((operation) => ({ ...operation })),
  };
}

export function runFsInput(input: FsInput): SimulationRun<FsStepData> {
  return runFileSystem(input);
}

/** Map a lab's starting algorithm id (e.g. `indexed-allocation`) back to its strategy. */
export function algorithmForAlgorithmId(algorithmId: string): AllocationStrategy | undefined {
  return ALLOCATION_STRATEGIES.find((strategy) => ALLOCATION_ALGORITHM_IDS[strategy] === algorithmId);
}
