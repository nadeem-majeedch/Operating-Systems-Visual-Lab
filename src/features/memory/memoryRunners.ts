import type { SimulationRun } from '@/engine';
import {
  CONTIGUOUS_PRESETS,
  FIXED_PARTITION_PRESETS,
  runMemory,
  type FitPolicy,
  type MemoryInput,
  type MemoryPreset,
  type MemoryStepData,
  type PartitionMode,
} from '@/engine';

export const MEMORY_TOPIC_ID = 'memory-management';
export const CONTIGUOUS_LAB_ID = 'lab-contiguous-allocation';
export const FIXED_LAB_ID = 'lab-fixed-partitions';

export function contiguousPresetOptions(): readonly MemoryPreset[] {
  return CONTIGUOUS_PRESETS;
}

export function fixedPresetOptions(): readonly MemoryPreset[] {
  return FIXED_PARTITION_PRESETS;
}

/** Build the engine input from the workstation's draft state. */
export function memoryInput(
  mode: PartitionMode,
  policy: FitPolicy,
  totalSize: number,
  partitions: readonly number[],
  operations: MemoryInput['operations'],
): MemoryInput {
  return {
    mode,
    policy,
    totalSize,
    ...(mode === 'fixed' ? { partitions: [...partitions] } : {}),
    operations,
  };
}

export function runMemoryInput(input: MemoryInput): SimulationRun<MemoryStepData> {
  return runMemory(input);
}

export function algorithmIdFor(mode: PartitionMode, policy: FitPolicy): string {
  return mode === 'fixed' ? 'fixed-partitions' : policy;
}
