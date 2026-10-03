import type {
  AllocateOperation,
  CompactOperation,
  DeallocateOperation,
  MemoryOperation,
} from './types';

export interface MemoryPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly totalSize: number;
  /** Fixed partitions, present only for the fixed-partitioning scenarios. */
  readonly partitions?: readonly number[];
  readonly operations: readonly MemoryOperation[];
}

const alloc = (name: string, size: number): AllocateOperation => ({ kind: 'allocate', name, size });
const free = (name: string): DeallocateOperation => ({ kind: 'deallocate', name });
const compact: CompactOperation = { kind: 'compact' };

/**
 * Variable-partition workloads.
 *
 * `mem-strategies` is the important one: after three non-adjacent holes of
 * different sizes are created, a small request lands in a different place under
 * first, best and worst fit. `mem-fragmentation` builds a map where a large
 * request fails on total free memory alone, then succeeds after compaction.
 */
export const CONTIGUOUS_PRESETS: readonly MemoryPreset[] = [
  {
    id: 'mem-basic',
    name: 'Simple sequence',
    description: 'Allocate four processes, free one, then place a new one in the hole.',
    totalSize: 1000,
    operations: [alloc('A', 200), alloc('B', 300), alloc('C', 150), alloc('D', 250), free('B'), alloc('E', 250)],
  },
  {
    id: 'mem-strategies',
    name: 'Strategies diverge',
    description: 'First, best and worst fit place the same request in different holes.',
    totalSize: 1200,
    operations: [
      alloc('A', 300),
      alloc('X', 150),
      alloc('B', 400),
      alloc('Y', 150),
      alloc('C', 200),
      free('A'),
      free('B'),
      free('C'),
      alloc('E', 150),
    ],
  },
  {
    id: 'mem-fragmentation',
    name: 'External fragmentation',
    description: 'A request fails on fragmented free memory, then succeeds after compaction.',
    totalSize: 1200,
    operations: [
      alloc('A', 300),
      alloc('X', 150),
      alloc('B', 300),
      alloc('Y', 150),
      alloc('C', 300),
      free('A'),
      free('B'),
      free('C'),
      alloc('E', 800),
      compact,
      alloc('E', 800),
    ],
  },
  {
    id: 'mem-coalesce',
    name: 'Coalescing holes',
    description: 'Three neighbouring processes leave and their holes merge into one.',
    totalSize: 800,
    operations: [alloc('A', 200), alloc('B', 200), alloc('C', 200), free('A'), free('B'), free('C'), alloc('D', 500)],
  },
  {
    id: 'mem-exact-fit',
    name: 'Exact fit',
    description: 'A freed hole is exactly the right size for the next request.',
    totalSize: 500,
    operations: [alloc('A', 200), alloc('B', 300), free('A'), alloc('C', 200)],
  },
];

/** Fixed-partition workloads, where the waste lives inside each partition. */
export const FIXED_PARTITION_PRESETS: readonly MemoryPreset[] = [
  {
    id: 'fixed-basic',
    name: 'Three partitions',
    description: 'Requests smaller than their partition leave the remainder wasted.',
    totalSize: 1000,
    partitions: [200, 300, 500],
    operations: [alloc('A', 150), alloc('B', 280), alloc('C', 450), free('B')],
  },
  {
    id: 'fixed-internal',
    name: 'Internal fragmentation',
    description: 'Four equal partitions each hold a smaller process.',
    totalSize: 1000,
    partitions: [250, 250, 250, 250],
    operations: [alloc('A', 200), alloc('B', 200), alloc('C', 200), alloc('D', 200)],
  },
  {
    id: 'fixed-uneven',
    name: 'Uneven partitions',
    description: 'Placement policy decides which free partition a process takes.',
    totalSize: 1000,
    partitions: [100, 400, 200, 300],
    operations: [alloc('A', 90), alloc('B', 250), alloc('C', 180), free('A'), alloc('D', 90)],
  },
];
