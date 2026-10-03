import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  MemoryBlockView,
  MemoryEventKind,
  MemoryInput,
  MemoryOperation,
  MemoryStepData,
  PartitionMode,
} from './types';
import {
  FIT_POLICY_LABELS,
  MAX_MEMORY_SIZE,
  MAX_OPERATIONS,
  MAX_PARTITIONS,
  MAX_REQUEST_SIZE,
  MIN_MEMORY_SIZE,
  MIN_PARTITION_SIZE,
  MIN_REQUEST_SIZE,
} from './types';
import {
  allocateBlock,
  compactBlocks,
  computeMemoryMetrics,
  deallocateBlock,
  layoutFor,
  type Block,
} from './blocks';

export const MEMORY_ALGORITHM_IDS: readonly string[] = [
  'first-fit',
  'best-fit',
  'worst-fit',
  'next-fit',
  'fixed-partitions',
];

export const CONTIGUOUS_LAB_ID = 'lab-contiguous-allocation';
export const FIXED_PARTITIONS_LAB_ID = 'lab-fixed-partitions';

export function memoryAlgorithmId(input: Pick<MemoryInput, 'mode' | 'policy'>): string {
  return input.mode === 'fixed' ? 'fixed-partitions' : input.policy;
}

export function memoryLabId(mode: PartitionMode): string {
  return mode === 'fixed' ? FIXED_PARTITIONS_LAB_ID : CONTIGUOUS_LAB_ID;
}

export function validateMemoryInput(input: MemoryInput): ValidationResult {
  const collector = new ValidationCollector();

  collector.addIf(
    !Number.isInteger(input.totalSize) ||
      input.totalSize < MIN_MEMORY_SIZE ||
      input.totalSize > MAX_MEMORY_SIZE,
    'totalSize',
    `totalSize must be an integer between ${MIN_MEMORY_SIZE} and ${MAX_MEMORY_SIZE}`,
  );

  if (input.mode === 'fixed') {
    const partitions = input.partitions;
    if (!partitions || partitions.length === 0) {
      collector.add('partitions', 'fixed partitioning needs at least one partition');
    } else if (partitions.length > MAX_PARTITIONS) {
      collector.add('partitions', `at most ${MAX_PARTITIONS} partitions are supported`);
    } else {
      for (let index = 0; index < partitions.length; index += 1) {
        const size = partitions[index] ?? 0;
        if (!Number.isInteger(size) || size < MIN_PARTITION_SIZE) {
          collector.add(`partitions[${index}]`, `each partition must be at least ${MIN_PARTITION_SIZE}`);
        }
      }
      const total = partitions.reduce((sum, size) => sum + size, 0);
      if (Number.isInteger(input.totalSize) && total !== input.totalSize) {
        collector.add('partitions', `partitions must add up to totalSize (currently ${total})`);
      }
    }
  }

  if (input.operations.length > MAX_OPERATIONS) {
    collector.add('operations', `at most ${MAX_OPERATIONS} operations are supported`);
  }

  input.operations.forEach((operation, index) => {
    if (operation.kind === 'allocate') {
      collector.addIf(
        operation.name.trim().length === 0,
        `operations[${index}].name`,
        'a process needs a non-empty name',
      );
      collector.addIf(
        !Number.isInteger(operation.size) ||
          operation.size < MIN_REQUEST_SIZE ||
          operation.size > MAX_REQUEST_SIZE,
        `operations[${index}].size`,
        `size must be an integer between ${MIN_REQUEST_SIZE} and ${MAX_REQUEST_SIZE}`,
      );
    }
    if (operation.kind === 'deallocate') {
      collector.addIf(
        operation.name.trim().length === 0,
        `operations[${index}].name`,
        'a process needs a non-empty name',
      );
    }
  });

  return collector.toResult();
}

export function memoryStepMetrics(data: MemoryStepData): Record<string, number> {
  return {
    totalSize: data.totalSize,
    allocatedBytes: data.allocatedBytes,
    freeBytes: data.freeBytes,
    internalFragmentation: data.internalFragmentation,
    externalFragmentation: data.externalFragmentation,
    freeBlocks: data.freeBlocks,
    largestFreeBlock: data.largestFreeBlock,
    failures: data.failures,
    compactions: data.compactions,
    resident: data.resident.length,
  };
}

interface View {
  blocks: Block[];
  nextPointer: number;
  failures: number;
  compactions: number;
  activeProcess: string | null;
  activeStart: number | null;
  event: MemoryEventKind;
  success: boolean | null;
}

function opLabel(operation: MemoryOperation): string {
  if (operation.kind === 'allocate') return `${operation.name} (${operation.size})`;
  if (operation.kind === 'deallocate') return operation.name;
  return 'compaction';
}

/**
 * Contiguous memory allocation.
 *
 * One engine runs both partition schemes and all four placement policies. The
 * input is a script of operations — allocate, deallocate, compact — so the
 * learner's clicks become a deterministic, replayable run: the same script
 * always produces the same map.
 */
export function runMemory(
  input: MemoryInput,
  config: SimulationConfig = {},
): SimulationRun<MemoryStepData> {
  assertValid(validateMemoryInput(input), 'Memory allocation');

  const { mode, policy, totalSize } = input;
  const algorithmId = memoryAlgorithmId(input);
  const labId = memoryLabId(mode);
  const policyLabel = mode === 'fixed' ? 'Fixed partitions' : FIT_POLICY_LABELS[policy];

  const view: View = {
    blocks: layoutFor(input),
    nextPointer: 0,
    failures: 0,
    compactions: 0,
    activeProcess: null,
    activeStart: null,
    event: 'init',
    success: null,
  };

  const drafts: StepDraft<MemoryStepData>[] = [];

  const snapshot = (summary: string): MemoryStepData => {
    const metrics = computeMemoryMetrics(view.blocks, mode);
    const blocks: MemoryBlockView[] = view.blocks.map((block, index) => ({
      id: `blk-${index}`,
      start: block.start,
      size: block.size,
      state: block.state,
      process: block.process,
      processSize: block.processSize,
      internalWaste: Math.max(0, block.size - block.processSize),
      highlighted: view.activeStart !== null && block.start === view.activeStart,
    }));
    return {
      kind: 'memory',
      mode,
      policy,
      event: view.event,
      totalSize,
      blocks,
      resident: metrics.resident,
      activeProcess: view.activeProcess,
      activeStart: view.activeStart,
      success: view.success,
      freeBlocks: metrics.freeBlocks,
      allocatedBytes: metrics.allocatedBytes,
      freeBytes: metrics.freeBytes,
      internalFragmentation: metrics.internalFragmentation,
      externalFragmentation: metrics.externalFragmentation,
      largestFreeBlock: metrics.largestFreeBlock,
      nextPointer: view.nextPointer,
      failures: view.failures,
      compactions: view.compactions,
      summary,
    };
  };

  const draft = (label: string, description: string, explanation: string, highlights: readonly string[]): void => {
    const data = snapshot(label);
    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights,
      metrics: memoryStepMetrics(data),
    });
  };

  /* ------------------------------------------------------------------ init -- */
  if (mode === 'fixed') {
    const sizes = (input.partitions ?? []).join(', ');
    draft(
      'Memory divided into fixed partitions',
      `${(input.partitions ?? []).length} partitions summing to ${totalSize}: [${sizes}].`,
      'Fixed partitioning splits memory once, before any process arrives. A process is placed in a partition big enough to hold it and occupies the whole partition, so the unused tail is trapped as internal fragmentation. Partitions are never merged when a process leaves.',
      [],
    );
  } else {
    draft(
      'Memory is one free block',
      `All ${totalSize} units are free, so the first allocation can start at address 0.`,
      'Variable partitioning starts with a single hole and carves allocations out of it. Freed regions become holes again, and adjacent holes coalesce. When no single hole is large enough the request fails even if total free memory would fit — that is external fragmentation.',
      [],
    );
  }

  /* ------------------------------------------------------------ operations -- */
  for (const operation of input.operations) {
    const label = opLabel(operation);
    switch (operation.kind) {
      case 'allocate': {
        const result = allocateBlock(view.blocks, operation.name, operation.size, policy, view.nextPointer, mode);
        if (!result) {
          view.failures += 1;
          view.event = 'failed';
          view.success = false;
          view.activeProcess = operation.name;
          view.activeStart = null;
          const metrics = computeMemoryMetrics(view.blocks, mode);
          const reason =
            metrics.freeBytes < operation.size
              ? `Only ${metrics.freeBytes} units are free, less than the ${operation.size} requested.`
              : `Free memory totals ${metrics.freeBytes} units, but the largest single free block is ${metrics.largestFreeBlock} — the request is fragmented across smaller holes.`;
          draft(
            `${operation.name} could not be allocated`,
            `No free block is large enough for ${operation.size} units.`,
            `${reason} ${
              mode === 'variable'
                ? 'Compacting memory would slide the resident processes together and merge their holes into one block, which is the usual remedy when total free memory is sufficient but fragmented.'
                : 'With fixed partitions a request that fits no partition simply waits; the wasted tails inside other partitions cannot be borrowed.'
            }`,
            [],
          );
          break;
        }
        view.blocks = result.blocks;
        view.nextPointer = result.nextPointer;
        view.event = 'allocate';
        view.success = true;
        view.activeProcess = operation.name;
        const block = view.blocks[result.index];
        view.activeStart = block?.start ?? null;
        if (mode === 'fixed') {
          const waste = Math.max(0, (block?.size ?? 0) - operation.size);
          draft(
            `Allocate ${label}`,
            `${operation.name} occupies the ${block?.size}-unit partition at ${block?.start}; ${waste} units are wasted inside it.`,
            'Fixed partitioning rounds every request up to the next partition, so the leftover is internal fragmentation — memory that is reserved but unusable. Smaller partitions reduce the waste but force large requests to wait.',
            [operation.name],
          );
        } else {
          const remainder = (block?.size ?? 0) - operation.size;
          draft(
            `Allocate ${label}`,
            `${operation.name} is placed at address ${block?.start}, leaving ${remainder} free${
              remainder === 0 ? '' : ` immediately after it`
            }.`,
            `${policyLabel} chose this hole. ${
              policy === 'first-fit'
                ? 'First fit takes the first hole that fits, which is fast and leaves large holes intact at the high end.'
                : policy === 'best-fit'
                  ? 'Best fit takes the smallest hole that fits, which minimises the leftover here but tends to scatter tiny, unusable fragments elsewhere.'
                  : policy === 'worst-fit'
                    ? 'Worst fit takes the largest hole, leaving a big remainder that may still satisfy later large requests.'
                    : 'Next fit resumes from where the last allocation ended and wraps around, spreading allocations across memory instead of always packing the low end.'
            }`,
            [operation.name],
          );
        }
        break;
      }
      case 'deallocate': {
        const result = deallocateBlock(view.blocks, operation.name, mode);
        view.event = 'deallocate';
        view.activeProcess = operation.name;
        if (!result) {
          view.success = false;
          view.activeStart = null;
          draft(
            `${operation.name} is not resident`,
            `No allocated block belongs to ${operation.name}, so there is nothing to release.`,
            'Releasing a process that is not in memory is a no-op — in a real kernel it would usually be a bookkeeping bug.',
            [],
          );
          break;
        }
        view.success = true;
        const freeBefore = computeMemoryMetrics(view.blocks, mode).freeBlocks;
        view.blocks = result.blocks;
        const freed = view.blocks[result.index];
        view.activeStart = freed?.start ?? null;
        if (mode === 'variable') {
          const merged = computeMemoryMetrics(view.blocks, mode).freeBlocks < freeBefore + 1;
          draft(
            `Free ${operation.name}`,
            `${operation.name} released its block at ${freed?.start ?? 0}; ${view.blocks.length} free block${
              view.blocks.length === 1 ? '' : 's'
            } remain.`,
            `Adjacent free blocks are coalesced automatically${
              merged ? ' — here the released block merged with a neighbour' : ''
            }, so holes grow back together instead of fragmenting further.`,
            [operation.name],
          );
        } else {
          draft(
            `Free ${operation.name}`,
            `Partition at ${freed?.start ?? 0} is free again, keeping its reserved size of ${freed?.size ?? 0}.`,
            'In fixed partitioning a freed partition returns to the free list at its original size; neighbouring partitions are never merged because they are separate, pre-defined blocks.',
            [operation.name],
          );
        }
        break;
      }
      case 'compact': {
        view.event = 'compact';
        view.activeProcess = null;
        view.success = null;
        if (mode === 'fixed') {
          draft(
            'Compaction has no effect',
            'Fixed partitions keep their processes in place, so there is nothing to slide together.',
            'Compaction merges external holes by moving resident processes. Fixed partitions do not have movable holes — each partition is a permanent slot — so the operation is a no-op here.',
            [],
          );
          break;
        }
        view.compactions += 1;
        view.blocks = compactBlocks(view.blocks);
        view.nextPointer = 0;
        view.activeStart = view.blocks[view.blocks.length - 1]?.state === 'free' ? view.blocks[view.blocks.length - 1]!.start : null;
        const metrics = computeMemoryMetrics(view.blocks, mode);
        draft(
          'Compact memory',
          `Every process slid to the low end; free memory is now a single ${metrics.freeBytes}-unit block.`,
          'Compaction removes external fragmentation by relocating resident processes. It costs time — every moved byte must be copied and every pointer to it updated — which is why real systems either accept fragmentation or page instead of compacting on every allocation.',
          [],
        );
        break;
      }
    }
  }

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? snapshot('')) as MemoryStepData;

  return {
    algorithmId,
    labId,
    input: {
      totalSize,
      mode,
      policy,
      operations: input.operations.length,
      failures: finalData.failures,
      freeBlocks: finalData.freeBlocks,
      allocatedBytes: finalData.allocatedBytes,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<MemoryStepData>({
      labId,
      algorithmId,
      steps,
      parameters: { totalSize, mode, policy },
      speed: config.speed,
    }),
    summary: {
      totalSize,
      allocatedBytes: finalData.allocatedBytes,
      freeBytes: finalData.freeBytes,
      internalFragmentation: finalData.internalFragmentation,
      externalFragmentation: finalData.externalFragmentation,
      freeBlocks: finalData.freeBlocks,
      failures: finalData.failures,
      compactions: finalData.compactions,
      steps: steps.length,
    },
  };
}

export const memoryEngine: SimulationEngine<MemoryInput, MemoryStepData> = {
  id: 'memory-allocation-engine',
  algorithmId: 'first-fit',
  labId: CONTIGUOUS_LAB_ID,
  name: 'Contiguous Memory Allocation',
  description:
    'Place, release and compact processes across variable or fixed partitions using first, best, worst and next fit.',
  validate: validateMemoryInput,
  run: runMemory,
};
