/**
 * Types shared by the virtual-memory paging simulation.
 *
 * A single engine models the hardware translation path: a logical address is
 * split into a page number and an offset, the page number is looked up in the
 * TLB, then in the page table (a miss there may fault the page in), and finally
 * the frame number is recombined with the offset to form a physical address.
 *
 * The geometry is small and exact so every value can be shown in binary: the
 * page size is a power of two, so `offsetBits = log2(pageSize)`, the page number
 * occupies the remaining logical bits and the frame number the remaining
 * physical bits.
 */

export type PagingEvent = 'decompose' | 'tlb' | 'page-table' | 'fault' | 'address' | 'invalid';

export type TlbOutcome = 'hit' | 'miss';

/** How a full TLB chooses an entry to evict. */
export type TlbPolicy = 'lru' | 'fifo';

export interface PagingInput {
  /** Bytes per page (and per frame). A power of two. */
  readonly pageSize: number;
  /** Width of a logical (virtual) address, in bits. */
  readonly logicalAddressBits: number;
  /** Width of a physical address, in bits. */
  readonly physicalAddressBits: number;
  /** Number of TLB entries. */
  readonly tlbSize: number;
  readonly tlbPolicy: TlbPolicy;
  /** Logical addresses to translate, in order. */
  readonly references: readonly number[];
  /** Page numbers that are not resident, so referencing them faults. */
  readonly absentPages: readonly number[];
}

export interface TlbEntryView {
  readonly page: number;
  readonly frame: number;
  /** Monotonic use counter driving LRU eviction. */
  readonly lastUsed: number;
}

export interface PageTableEntryView {
  readonly page: number;
  readonly frame: number | null;
  readonly present: boolean;
}

export interface FrameView {
  readonly frame: number;
  readonly page: number | null;
}

export interface PagingStepData {
  readonly kind: 'paging';
  readonly event: PagingEvent;
  /** Index of the reference being translated, or -1 before the first. */
  readonly referenceIndex: number;
  readonly logicalAddress: number;
  readonly pageNumber: number;
  readonly offset: number;
  /** Geometry, repeated per step so the visualization is self-contained. */
  readonly offsetBits: number;
  readonly pageBits: number;
  readonly frameBits: number;
  readonly pageCount: number;
  readonly frameCount: number;
  readonly frameNumber: number | null;
  readonly physicalAddress: number | null;
  readonly tlbOutcome: TlbOutcome | null;
  readonly pagePresent: boolean | null;
  readonly faulted: boolean;
  readonly victimPage: number | null;
  readonly victimFrame: number | null;
  readonly invalid: boolean;
  readonly tlbEntries: readonly TlbEntryView[];
  readonly pageTable: readonly PageTableEntryView[];
  readonly frames: readonly FrameView[];
  readonly tlbHits: number;
  readonly tlbMisses: number;
  readonly pageTableAccesses: number;
  readonly pageFaults: number;
  readonly invalidAddresses: number;
  /** 0..1, or 0 before any lookup. */
  readonly hitRate: number;
  readonly summary: string;
}

export const PAGE_SIZES: readonly number[] = [16, 32, 64, 128, 256, 512, 1024];
export const MIN_PAGE_SIZE = 16;
export const MAX_PAGE_SIZE = 1024;
export const MIN_ADDRESS_BITS = 4;
export const MAX_ADDRESS_BITS = 16;
export const MIN_TLB_SIZE = 1;
export const MAX_TLB_SIZE = 16;
export const MIN_REFERENCES = 1;
export const MAX_REFERENCES = 24;
/** Largest logical address the editor will accept (before range rejection). */
export const MAX_ADDRESS_VALUE = 2 ** MAX_ADDRESS_BITS - 1;
/** Hard cap on produced steps, well above anything the editor can build. */
export const MAX_PAGING_STEPS = 200;

export const TLB_POLICIES: readonly TlbPolicy[] = ['lru', 'fifo'];
export const TLB_POLICY_LABELS: Readonly<Record<TlbPolicy, string>> = {
  lru: 'LRU',
  fifo: 'FIFO',
};
