import type { PagingInput } from './types';

export interface PagingPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: PagingInput;
}

/**
 * Deterministic translation workloads.
 *
 * Each one is sized so the derived numbers stay small enough to read in binary:
 * a 64-byte page with an 8-bit logical address gives four pages and a 2-bit page
 * number, which makes the decomposition and the address recombination obvious.
 */
export const PAGING_PRESETS: readonly PagingPreset[] = [
  {
    id: 'paging-basic',
    name: 'Basic walk',
    description: 'Four pages, four frames, a roomy TLB — watch the hit rate climb.',
    input: {
      pageSize: 64,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 4,
      tlbPolicy: 'lru',
      references: [0, 64, 128, 100, 128, 0, 192],
      absentPages: [],
    },
  },
  {
    id: 'paging-fault',
    name: 'Page fault',
    description: 'One page starts absent, so its first reference faults and is loaded.',
    input: {
      pageSize: 64,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 4,
      tlbPolicy: 'lru',
      references: [128, 128, 192],
      absentPages: [2],
    },
  },
  {
    id: 'paging-tlb-evict-lru',
    name: 'TLB eviction (LRU)',
    description: 'A two-entry TLB over three pages: LRU evicts the least recently used page.',
    input: {
      pageSize: 64,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 2,
      tlbPolicy: 'lru',
      references: [0, 64, 0, 128, 64],
      absentPages: [],
    },
  },
  {
    id: 'paging-tlb-evict-fifo',
    name: 'TLB eviction (FIFO)',
    description: 'The same stream, but FIFO evicts the oldest entry instead of the idlest.',
    input: {
      pageSize: 64,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 2,
      tlbPolicy: 'fifo',
      references: [0, 64, 0, 128, 64],
      absentPages: [],
    },
  },
  {
    id: 'paging-invalid',
    name: 'Invalid address',
    description: 'A reference past the end of the logical space is rejected before translation.',
    input: {
      pageSize: 64,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 4,
      tlbPolicy: 'lru',
      references: [0, 300, 128],
      absentPages: [],
    },
  },
  {
    id: 'paging-small-pages',
    name: 'Small pages',
    description: '16-byte pages split an 8-bit address into sixteen pages — more page bits.',
    input: {
      pageSize: 16,
      logicalAddressBits: 8,
      physicalAddressBits: 8,
      tlbSize: 4,
      tlbPolicy: 'lru',
      references: [0, 16, 32, 48, 16, 240, 17],
      absentPages: [],
    },
  },
];

export function findPagingPreset(id: string): PagingPreset | undefined {
  return PAGING_PRESETS.find((preset) => preset.id === id);
}
