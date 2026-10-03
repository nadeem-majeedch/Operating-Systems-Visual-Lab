export {
  FIT_POLICIES,
  FIT_POLICY_LABELS,
  MAX_MEMORY_SIZE,
  MAX_OPERATIONS,
  MAX_PARTITIONS,
  MAX_REQUEST_SIZE,
  MIN_MEMORY_SIZE,
  MIN_PARTITION_SIZE,
  MIN_REQUEST_SIZE,
} from './types';
export type {
  AllocateOperation,
  CompactOperation,
  DeallocateOperation,
  FitPolicy,
  MemoryBlockView,
  MemoryEventKind,
  MemoryInput,
  MemoryOperation,
  MemoryStepData,
  PartitionMode,
} from './types';

export {
  allocateBlock,
  coalesce,
  compactBlocks,
  computeMemoryMetrics,
  createFixedLayout,
  createVariableLayout,
  deallocateBlock,
  findFit,
  layoutFor,
} from './blocks';
export type { AllocationResult, Block, DeallocationResult, MemoryMetrics } from './blocks';

export {
  CONTIGUOUS_LAB_ID,
  FIXED_PARTITIONS_LAB_ID,
  MEMORY_ALGORITHM_IDS,
  memoryAlgorithmId,
  memoryEngine,
  memoryLabId,
  memoryStepMetrics,
  runMemory,
  validateMemoryInput,
} from './allocation';

export { CONTIGUOUS_PRESETS, FIXED_PARTITION_PRESETS } from './presets';
export type { MemoryPreset } from './presets';

export { MEMORY_CHALLENGE_COUNT, buildMemoryChallenges } from './challenges';
export type { MemoryChallenge, MemoryChallengeKind } from './challenges';
