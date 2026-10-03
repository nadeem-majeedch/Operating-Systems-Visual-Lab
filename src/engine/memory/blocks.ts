import type { FitPolicy, MemoryInput, PartitionMode } from './types';

/**
 * A contiguous region of physical memory.
 *
 * In variable mode an allocated block's `size` is exactly the request, and free
 * blocks are holes. In fixed mode every block is a partition, so an allocated
 * partition keeps its full `size` and records the smaller `processSize`, which
 * is the internal fragmentation.
 */
export interface Block {
  start: number;
  size: number;
  state: 'free' | 'allocated';
  process: string | null;
  processSize: number;
}

export function createVariableLayout(totalSize: number): Block[] {
  return [{ start: 0, size: totalSize, state: 'free', process: null, processSize: 0 }];
}

export function createFixedLayout(partitions: readonly number[]): Block[] {
  let cursor = 0;
  return partitions.map((size) => {
    const block: Block = { start: cursor, size, state: 'free', process: null, processSize: 0 };
    cursor += size;
    return block;
  });
}

export function layoutFor(input: Pick<MemoryInput, 'mode' | 'totalSize' | 'partitions'>): Block[] {
  if (input.mode === 'fixed') return createFixedLayout(input.partitions ?? []);
  return createVariableLayout(input.totalSize);
}

export function blockSize(blocks: readonly Block[]): number {
  return blocks.reduce((total, block) => total + block.size, 0);
}

/** Merge adjacent free neighbours. Fixed partitions are never merged. */
export function coalesce(blocks: readonly Block[]): Block[] {
  const merged: Block[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    // Only genuine neighbours merge: two free blocks separated by a gap (or an
    // allocation) stay distinct.
    if (last && last.state === 'free' && block.state === 'free' && last.start + last.size === block.start) {
      merged[merged.length - 1] = { ...last, size: last.size + block.size };
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

function freeIndices(blocks: readonly Block[]): number[] {
  const indices: number[] = [];
  blocks.forEach((block, index) => {
    if (block.state === 'free' && block.size > 0) indices.push(index);
  });
  return indices;
}

/**
 * Index of the free block a policy chooses, or `-1` when none fits.
 *
 * Ties are broken by address (lowest first) for best-fit and worst-fit, and
 * next-fit resumes from `nextPointer` and wraps — the roving pointer that makes
 * it spread allocations instead of always packing the low end.
 */
export function findFit(
  blocks: readonly Block[],
  size: number,
  policy: FitPolicy,
  nextPointer: number,
): number {
  const fitting = freeIndices(blocks).filter((index) => (blocks[index]?.size ?? 0) >= size);
  if (fitting.length === 0) return -1;
  const first = fitting[0] as number;

  switch (policy) {
    case 'first-fit':
      return first;
    case 'best-fit': {
      let best = first;
      for (const index of fitting) {
        if ((blocks[index]?.size ?? 0) < (blocks[best]?.size ?? 0)) best = index;
      }
      return best;
    }
    case 'worst-fit': {
      let best = first;
      for (const index of fitting) {
        if ((blocks[index]?.size ?? 0) > (blocks[best]?.size ?? 0)) best = index;
      }
      return best;
    }
    case 'next-fit': {
      const ordered = [...fitting].sort(
        (a, b) => (blocks[a]?.start ?? 0) - (blocks[b]?.start ?? 0),
      );
      const from = ordered.find((index) => (blocks[index]?.start ?? 0) >= nextPointer);
      return from ?? (ordered[0] as number);
    }
  }
}

export interface AllocationResult {
  readonly blocks: Block[];
  /** Index of the newly allocated block. */
  readonly index: number;
  readonly nextPointer: number;
}

export function allocateBlock(
  blocks: readonly Block[],
  name: string,
  size: number,
  policy: FitPolicy,
  nextPointer: number,
  mode: PartitionMode,
): AllocationResult | null {
  const index = findFit(blocks, size, policy, nextPointer);
  if (index < 0) return null;
  const block = blocks[index];
  if (!block) return null;

  const next = blocks.map((item) => ({ ...item }));
  if (mode === 'variable') {
    const allocated: Block = {
      start: block.start,
      size,
      state: 'allocated',
      process: name,
      processSize: size,
    };
    const remainder = block.size - size;
    const replacement: Block[] =
      remainder > 0
        ? [
            allocated,
            { start: block.start + size, size: remainder, state: 'free', process: null, processSize: 0 },
          ]
        : [allocated];
    next.splice(index, 1, ...replacement);
  } else {
    next[index] = { ...block, state: 'allocated', process: name, processSize: size };
  }

  return {
    blocks: next,
    index,
    nextPointer: block.start + (mode === 'variable' ? size : block.size),
  };
}

export interface DeallocationResult {
  readonly blocks: Block[];
  readonly index: number;
}

export function deallocateBlock(
  blocks: readonly Block[],
  name: string,
  mode: PartitionMode,
): DeallocationResult | null {
  const index = blocks.findIndex((block) => block.state === 'allocated' && block.process === name);
  if (index < 0) return null;
  const next = blocks.map((block, position) =>
    position === index ? { ...block, state: 'free' as const, process: null, processSize: 0 } : { ...block },
  );
  return { blocks: mode === 'variable' ? coalesce(next) : next, index };
}

/** Slide every allocated block to the low end, leaving one free block behind. */
export function compactBlocks(blocks: readonly Block[]): Block[] {
  const allocated = blocks.filter((block) => block.state === 'allocated');
  const total = blockSize(blocks);
  const result: Block[] = [];
  let cursor = 0;
  for (const block of allocated) {
    result.push({ ...block, start: cursor });
    cursor += block.size;
  }
  if (cursor < total) {
    result.push({ start: cursor, size: total - cursor, state: 'free', process: null, processSize: 0 });
  }
  return result;
}

export interface MemoryMetrics {
  readonly allocatedBytes: number;
  readonly freeBytes: number;
  readonly internalFragmentation: number;
  readonly externalFragmentation: number;
  readonly freeBlocks: number;
  readonly largestFreeBlock: number;
  readonly resident: string[];
}

export function computeMemoryMetrics(
  blocks: readonly Block[],
  mode: PartitionMode,
): MemoryMetrics {
  let allocatedBytes = 0;
  let freeBytes = 0;
  let internalFragmentation = 0;
  let freeBlocks = 0;
  let largestFreeBlock = 0;
  const resident: string[] = [];

  for (const block of blocks) {
    if (block.state === 'allocated') {
      allocatedBytes += block.size;
      internalFragmentation += Math.max(0, block.size - block.processSize);
      if (block.process) resident.push(block.process);
    } else {
      freeBytes += block.size;
      freeBlocks += 1;
      if (block.size > largestFreeBlock) largestFreeBlock = block.size;
    }
  }

  return {
    allocatedBytes,
    freeBytes,
    internalFragmentation,
    externalFragmentation: mode === 'variable' ? freeBytes - largestFreeBlock : 0,
    freeBlocks,
    largestFreeBlock,
    resident,
  };
}
