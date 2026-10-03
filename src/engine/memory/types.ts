/**
 * Types shared by the memory-management simulations.
 *
 * A single engine serves both partitioning schemes. In **variable** partitions
 * memory starts as one free hole and each allocation carves a piece out of it,
 * leaving holes that later coalesce — the source of external fragmentation. In
 * **fixed** partitions memory is divided up front into equal-or-unequal blocks,
 * and an allocation occupies a whole partition even if the request is smaller —
 * the source of internal fragmentation.
 */

export type FitPolicy = 'first-fit' | 'best-fit' | 'worst-fit' | 'next-fit';
export type PartitionMode = 'fixed' | 'variable';

export interface AllocateOperation {
  readonly kind: 'allocate';
  readonly name: string;
  readonly size: number;
}

export interface DeallocateOperation {
  readonly kind: 'deallocate';
  readonly name: string;
}

export interface CompactOperation {
  readonly kind: 'compact';
}

export type MemoryOperation = AllocateOperation | DeallocateOperation | CompactOperation;

export interface MemoryInput {
  readonly mode: PartitionMode;
  readonly policy: FitPolicy;
  readonly totalSize: number;
  /** Fixed partition sizes in address order. Required in `fixed` mode. */
  readonly partitions?: readonly number[];
  readonly operations: readonly MemoryOperation[];
}

export interface MemoryBlockView {
  readonly id: string;
  readonly start: number;
  /** The block's reserved size (a partition's size in fixed mode). */
  readonly size: number;
  readonly state: 'free' | 'allocated';
  readonly process: string | null;
  /** Bytes the process actually asked for. */
  readonly processSize: number;
  /** Wasted bytes inside the block (`size − processSize`). */
  readonly internalWaste: number;
  readonly highlighted: boolean;
}

export type MemoryEventKind = 'init' | 'allocate' | 'deallocate' | 'compact' | 'failed';

export interface MemoryStepData {
  readonly kind: 'memory';
  readonly mode: PartitionMode;
  readonly policy: FitPolicy;
  readonly event: MemoryEventKind;
  readonly totalSize: number;
  readonly blocks: readonly MemoryBlockView[];
  /** Process names currently resident, in address order. */
  readonly resident: readonly string[];
  readonly activeProcess: string | null;
  readonly activeStart: number | null;
  readonly success: boolean | null;
  readonly freeBlocks: number;
  readonly allocatedBytes: number;
  readonly freeBytes: number;
  readonly internalFragmentation: number;
  readonly externalFragmentation: number;
  readonly largestFreeBlock: number;
  readonly nextPointer: number;
  readonly failures: number;
  readonly compactions: number;
  readonly summary: string;
}

export const MIN_MEMORY_SIZE = 100;
export const MAX_MEMORY_SIZE = 4096;
export const MIN_PARTITION_SIZE = 16;
export const MAX_PARTITIONS = 8;
export const MIN_REQUEST_SIZE = 1;
export const MAX_REQUEST_SIZE = 4096;
export const MAX_OPERATIONS = 40;
/** Hard cap on produced steps, well above anything the editor can build. */
export const MAX_MEMORY_STEPS = 120;

export const FIT_POLICIES: readonly FitPolicy[] = ['first-fit', 'best-fit', 'worst-fit', 'next-fit'];

export const FIT_POLICY_LABELS: Readonly<Record<FitPolicy, string>> = {
  'first-fit': 'First fit',
  'best-fit': 'Best fit',
  'worst-fit': 'Worst fit',
  'next-fit': 'Next fit',
};
