import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  FrameView,
  PageTableEntryView,
  PagingInput,
  PagingStepData,
  TlbEntryView,
} from './types';
import {
  MAX_ADDRESS_BITS,
  MAX_ADDRESS_VALUE,
  MAX_PAGE_SIZE,
  MAX_REFERENCES,
  MAX_TLB_SIZE,
  MIN_ADDRESS_BITS,
  MIN_PAGE_SIZE,
  MIN_REFERENCES,
  MIN_TLB_SIZE,
  TLB_POLICIES,
} from './types';
import {
  composePhysical,
  decomposeAddress,
  isPowerOfTwo,
  offsetBitsFor,
  pagingGeometry,
  type PagingGeometry,
} from './address';

export const PAGING_ALGORITHM_ID = 'address-translation';
export const PAGING_ENGINE_ID = 'address-translation-engine';
export const PAGING_LAB_ID = 'lab-tlb-translation';

export function validatePagingInput(input: PagingInput): ValidationResult {
  const collector = new ValidationCollector();

  collector.addIf(
    !isPowerOfTwo(input.pageSize) || input.pageSize < MIN_PAGE_SIZE || input.pageSize > MAX_PAGE_SIZE,
    'pageSize',
    `pageSize must be a power of two between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
  );
  collector.addIf(
    !Number.isInteger(input.logicalAddressBits) ||
      input.logicalAddressBits < MIN_ADDRESS_BITS ||
      input.logicalAddressBits > MAX_ADDRESS_BITS,
    'logicalAddressBits',
    `logicalAddressBits must be an integer between ${MIN_ADDRESS_BITS} and ${MAX_ADDRESS_BITS}`,
  );
  collector.addIf(
    !Number.isInteger(input.physicalAddressBits) ||
      input.physicalAddressBits < MIN_ADDRESS_BITS ||
      input.physicalAddressBits > MAX_ADDRESS_BITS,
    'physicalAddressBits',
    `physicalAddressBits must be an integer between ${MIN_ADDRESS_BITS} and ${MAX_ADDRESS_BITS}`,
  );

  if (isPowerOfTwo(input.pageSize)) {
    const offsetBits = offsetBitsFor(input.pageSize);
    collector.addIf(
      Number.isInteger(input.logicalAddressBits) && input.logicalAddressBits < offsetBits,
      'logicalAddressBits',
      `a ${input.pageSize}-byte page needs at least ${offsetBits} offset bits`,
    );
    collector.addIf(
      Number.isInteger(input.physicalAddressBits) && input.physicalAddressBits < offsetBits,
      'physicalAddressBits',
      `a ${input.pageSize}-byte page needs at least ${offsetBits} offset bits`,
    );
  }

  collector.addIf(
    !Number.isInteger(input.tlbSize) || input.tlbSize < MIN_TLB_SIZE || input.tlbSize > MAX_TLB_SIZE,
    'tlbSize',
    `tlbSize must be an integer between ${MIN_TLB_SIZE} and ${MAX_TLB_SIZE}`,
  );
  collector.addIf(
    !TLB_POLICIES.includes(input.tlbPolicy),
    'tlbPolicy',
    'tlbPolicy must be lru or fifo',
  );

  collector.addIf(
    input.references.length < MIN_REFERENCES || input.references.length > MAX_REFERENCES,
    'references',
    `between ${MIN_REFERENCES} and ${MAX_REFERENCES} references are supported`,
  );
  input.references.forEach((reference, index) => {
    collector.addIf(
      !Number.isInteger(reference) || reference < 0 || reference > MAX_ADDRESS_VALUE,
      `references[${index}]`,
      `each reference must be an integer between 0 and ${MAX_ADDRESS_VALUE}`,
    );
  });

  if (
    isPowerOfTwo(input.pageSize) &&
    Number.isInteger(input.logicalAddressBits) &&
    input.logicalAddressBits >= offsetBitsFor(input.pageSize)
  ) {
    const pageCount = 2 ** (input.logicalAddressBits - offsetBitsFor(input.pageSize));
    input.absentPages.forEach((page, index) => {
      collector.addIf(
        !Number.isInteger(page) || page < 0 || page >= pageCount,
        `absentPages[${index}]`,
        `page ${page} is outside the ${pageCount}-page address space`,
      );
    });
  }

  return collector.toResult();
}

export function pagingStepMetrics(data: PagingStepData): Record<string, number> {
  const lookups = data.tlbHits + data.tlbMisses;
  return {
    tlbHits: data.tlbHits,
    tlbMisses: data.tlbMisses,
    pageTableAccesses: data.pageTableAccesses,
    pageFaults: data.pageFaults,
    invalidAddresses: data.invalidAddresses,
    hitRate: lookups === 0 ? 0 : data.tlbHits / lookups,
  };
}

interface TlbEntry {
  page: number;
  frame: number;
  lastUsed: number;
  insertedAt: number;
}

interface MutableState {
  pageTable: (number | null)[];
  frames: (number | null)[];
  frameLoaded: number[];
  tlb: TlbEntry[];
  tick: number;
  tlbHits: number;
  tlbMisses: number;
  pageTableAccesses: number;
  pageFaults: number;
  invalidAddresses: number;
}

interface ReferenceView {
  referenceIndex: number;
  logicalAddress: number;
  pageNumber: number;
  offset: number;
  frameNumber: number | null;
  physicalAddress: number | null;
  tlbOutcome: 'hit' | 'miss' | null;
  pagePresent: boolean | null;
  faulted: boolean;
  victimPage: number | null;
  victimFrame: number | null;
  invalid: boolean;
}

function emptyReference(): ReferenceView {
  return {
    referenceIndex: -1,
    logicalAddress: 0,
    pageNumber: 0,
    offset: 0,
    frameNumber: null,
    physicalAddress: null,
    tlbOutcome: null,
    pagePresent: null,
    faulted: false,
    victimPage: null,
    victimFrame: null,
    invalid: false,
  };
}

function hitRateFor(state: MutableState): number {
  const lookups = state.tlbHits + state.tlbMisses;
  return lookups === 0 ? 0 : state.tlbHits / lookups;
}

/**
 * Translate a stream of logical addresses through a TLB-backed page table.
 *
 * The run is deterministic: the same addresses, geometry and absent-page set
 * always produce the same frames, victims and counters, so the walk can be
 * replayed and tested.
 */
export function runPaging(
  input: PagingInput,
  config: SimulationConfig = {},
): SimulationRun<PagingStepData> {
  assertValid(validatePagingInput(input), 'Paging translation');

  const geometry: PagingGeometry = pagingGeometry(input);
  const { pageCount, frameCount, pageSize } = geometry;

  const state: MutableState = {
    pageTable: new Array<number | null>(pageCount).fill(null),
    frames: new Array<number | null>(frameCount).fill(null),
    frameLoaded: new Array<number>(frameCount).fill(-1),
    tlb: [],
    tick: 0,
    tlbHits: 0,
    tlbMisses: 0,
    pageTableAccesses: 0,
    pageFaults: 0,
    invalidAddresses: 0,
  };

  // Pre-map the low pages page → frame, skipping the absent ones and any page
  // that does not fit in the physical frame count.
  const mappable = Math.min(pageCount, frameCount);
  for (let page = 0; page < mappable; page += 1) {
    if (input.absentPages.includes(page)) continue;
    state.pageTable[page] = page;
    state.frames[page] = page;
    state.frameLoaded[page] = state.tick;
    state.tick += 1;
  }

  const view = emptyReference();

  const snapshot = (summary: string): PagingStepData => {
    const tlbEntries: TlbEntryView[] = state.tlb.map((entry) => ({
      page: entry.page,
      frame: entry.frame,
      lastUsed: entry.lastUsed,
    }));
    const pageTable: PageTableEntryView[] = state.pageTable.map((frame, page) => ({
      page,
      frame,
      present: frame !== null,
    }));
    const frames: FrameView[] = state.frames.map((page, frame) => ({ frame, page }));
    return {
      kind: 'paging',
      event: 'decompose',
      referenceIndex: view.referenceIndex,
      logicalAddress: view.logicalAddress,
      pageNumber: view.pageNumber,
      offset: view.offset,
      offsetBits: geometry.offsetBits,
      pageBits: geometry.pageBits,
      frameBits: geometry.frameBits,
      pageCount,
      frameCount,
      frameNumber: view.frameNumber,
      physicalAddress: view.physicalAddress,
      tlbOutcome: view.tlbOutcome,
      pagePresent: view.pagePresent,
      faulted: view.faulted,
      victimPage: view.victimPage,
      victimFrame: view.victimFrame,
      invalid: view.invalid,
      tlbEntries,
      pageTable,
      frames,
      tlbHits: state.tlbHits,
      tlbMisses: state.tlbMisses,
      pageTableAccesses: state.pageTableAccesses,
      pageFaults: state.pageFaults,
      invalidAddresses: state.invalidAddresses,
      hitRate: hitRateFor(state),
      summary,
    };
  };

  const drafts: StepDraft<PagingStepData>[] = [];

  const emit = (
    event: PagingStepData['event'],
    label: string,
    description: string,
    explanation: string,
  ): void => {
    const data = { ...snapshot(label), event };
    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights: [],
      metrics: pagingStepMetrics(data),
    });
  };

  /* --------------------------------------------------------------------- init */
  emit(
    'decompose',
    'Memory geometry',
    `${geometry.logicalSize} bytes of logical space (${pageCount} pages) and ${geometry.physicalSize} bytes of physical memory (${frameCount} frames), with ${pageSize}-byte pages.`,
    `A logical address is ${input.logicalAddressBits} bits: the low ${geometry.offsetBits} bits are the offset inside a page, and the remaining ${geometry.pageBits} bits number one of ${pageCount} pages. A physical address is ${input.physicalAddressBits} bits: the same ${geometry.offsetBits}-bit offset and a ${geometry.frameBits}-bit frame number selecting one of ${frameCount} frames. The TLB holds ${input.tlbSize} entries with ${input.tlbPolicy.toUpperCase()} replacement.`,
  );

  const insertTlb = (page: number, frame: number): void => {
    const existing = state.tlb.findIndex((entry) => entry.page === page);
    if (existing >= 0) {
      state.tlb[existing] = { page, frame, lastUsed: state.tick, insertedAt: state.tlb[existing]?.insertedAt ?? state.tick };
      state.tick += 1;
      return;
    }
    if (state.tlb.length >= input.tlbSize) {
      let victim = 0;
      for (let index = 1; index < state.tlb.length; index += 1) {
        const candidate = state.tlb[index]!;
        const current = state.tlb[victim]!;
        const key = input.tlbPolicy === 'lru' ? 'lastUsed' : 'insertedAt';
        if (candidate[key] < current[key]) victim = index;
      }
      state.tlb.splice(victim, 1);
    }
    state.tlb.push({ page, frame, lastUsed: state.tick, insertedAt: state.tick });
    state.tick += 1;
  };

  const loadPage = (page: number): { frame: number; victimPage: number | null; victimFrame: number | null } => {
    let frame = state.frames.indexOf(null);
    let victimPage: number | null = null;
    let victimFrame: number | null = null;
    if (frame === -1) {
      frame = 0;
      for (let index = 1; index < state.frames.length; index += 1) {
        if ((state.frameLoaded[index] ?? 0) < (state.frameLoaded[frame] ?? 0)) frame = index;
      }
      victimFrame = frame;
      victimPage = state.frames[frame] ?? null;
      if (victimPage !== null) state.pageTable[victimPage] = null;
    }
    state.frames[frame] = page;
    state.pageTable[page] = frame;
    state.frameLoaded[frame] = state.tick;
    state.tick += 1;
    return { frame, victimPage, victimFrame };
  };

  /* ------------------------------------------------------------- references */
  input.references.forEach((logical, index) => {
    const parts = decomposeAddress(logical, pageSize);
    view.referenceIndex = index;
    view.logicalAddress = logical;
    view.pageNumber = parts.pageNumber;
    view.offset = parts.offset;
    view.frameNumber = null;
    view.physicalAddress = null;
    view.tlbOutcome = null;
    view.pagePresent = null;
    view.faulted = false;
    view.victimPage = null;
    view.victimFrame = null;
    view.invalid = false;

    emit(
      'decompose',
      `Split ${logical}`,
      `Logical address ${logical} = page ${parts.pageNumber}, offset ${parts.offset}.`,
      `Dividing by the page size gives the page number and the remainder is the offset: ${logical} = ${parts.pageNumber} × ${pageSize} + ${parts.offset}. The hardware does this with bit fields instead — the low ${geometry.offsetBits} bits become the offset and the high ${geometry.pageBits} bits the page number.`,
    );

    if (logical >= geometry.logicalSize) {
      view.invalid = true;
      state.invalidAddresses += 1;
      emit(
        'invalid',
        `Reject ${logical}`,
        `Address ${logical} is outside the ${geometry.logicalSize}-byte logical space.`,
        `The largest logical address is ${geometry.logicalSize - 1}, so ${logical} cannot name a page in this process. The hardware traps before any translation happens — the protection fault is raised against the page number, not against physical memory.`,
      );
      return;
    }

    const entry = state.tlb.find((item) => item.page === parts.pageNumber);
    if (entry) {
      state.tlbHits += 1;
      entry.lastUsed = state.tick;
      state.tick += 1;
      view.tlbOutcome = 'hit';
      view.frameNumber = entry.frame;
      emit(
        'tlb',
        `TLB hit — page ${parts.pageNumber} → frame ${entry.frame}`,
        `The page number ${parts.pageNumber} is already in the TLB, so translation needs no memory access.`,
        `A TLB hit is the fast path: the frame number comes straight out of the on-chip buffer and the offset is copied through unchanged. Every hit saves one page-table read.`,
      );
    } else {
      state.tlbMisses += 1;
      view.tlbOutcome = 'miss';
      state.pageTableAccesses += 1;
      const mapped = state.pageTable[parts.pageNumber];
      if (mapped !== null && mapped !== undefined) {
        view.pagePresent = true;
        view.frameNumber = mapped;
        emit(
          'tlb',
          `TLB miss — page ${parts.pageNumber}`,
          `Page ${parts.pageNumber} is not in the TLB, so the hardware walks the page table.`,
          `A TLB miss is not an error — it just costs more. The processor reads the page-table entry for page ${parts.pageNumber} from memory.`,
        );
        emit(
          'page-table',
          `Page table — page ${parts.pageNumber} is in frame ${mapped}`,
          `The page-table entry marks page ${parts.pageNumber} valid and points at frame ${mapped}.`,
          `The page-table entry holds the frame number and a valid (present) bit. Because the valid bit is set, the translation can proceed and the frame number is ${mapped}.`,
        );
        insertTlb(parts.pageNumber, mapped);
      } else {
        view.pagePresent = false;
        view.faulted = true;
        state.pageFaults += 1;
        emit(
          'tlb',
          `TLB miss — page ${parts.pageNumber}`,
          `Page ${parts.pageNumber} is not in the TLB, so the hardware walks the page table.`,
          `The walk now reaches an entry whose valid bit is clear, which is a page fault. Control transfers to the operating system while the page is brought in.`,
        );
        const { frame, victimPage, victimFrame } = loadPage(parts.pageNumber);
        view.frameNumber = frame;
        view.victimPage = victimPage;
        view.victimFrame = victimFrame;
        emit(
          'fault',
          `Page fault — page ${parts.pageNumber} loaded into frame ${frame}`,
          victimPage === null
            ? `Page ${parts.pageNumber} was not resident; it is loaded into the free frame ${frame}.`
            : `Page ${parts.pageNumber} was not resident; it replaces page ${victimPage} in frame ${frame}.`,
          victimPage === null
            ? `A free frame is available, so the fault is resolved by reading the page from disk into frame ${frame} and setting its valid bit. Page faults are far more expensive than TLB misses because they touch the disk.`
            : `No frame is free, so a victim is evicted: page ${victimPage} leaves frame ${frame}, its page-table entry is invalidated, and page ${parts.pageNumber} takes its place. Choosing the victim well is what page-replacement policies are for.`,
        );
        insertTlb(parts.pageNumber, frame);
      }
    }

    if (view.frameNumber !== null) {
      view.physicalAddress = composePhysical(view.frameNumber, parts.offset, pageSize);
      emit(
        'address',
        `Physical address ${view.physicalAddress}`,
        `Frame ${view.frameNumber} × ${pageSize} + offset ${parts.offset} = ${view.physicalAddress}.`,
        `The frame number replaces the page number in the high bits while the offset is copied through untouched: physical = ${view.frameNumber} × ${pageSize} + ${parts.offset} = ${view.physicalAddress}. The offset never changes during translation.`,
      );
    }
  });

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? snapshot('')) as PagingStepData;

  return {
    algorithmId: PAGING_ALGORITHM_ID,
    labId: PAGING_LAB_ID,
    input: {
      pageSize,
      logicalAddressBits: input.logicalAddressBits,
      physicalAddressBits: input.physicalAddressBits,
      tlbSize: input.tlbSize,
      tlbPolicy: input.tlbPolicy,
      references: input.references.length,
      absentPages: input.absentPages.length,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<PagingStepData>({
      labId: PAGING_LAB_ID,
      algorithmId: PAGING_ALGORITHM_ID,
      steps,
      parameters: {
        pageSize,
        logicalAddressBits: input.logicalAddressBits,
        physicalAddressBits: input.physicalAddressBits,
      },
      speed: config.speed,
    }),
    summary: {
      translations: input.references.length,
      tlbHits: finalData.tlbHits,
      tlbMisses: finalData.tlbMisses,
      pageTableAccesses: finalData.pageTableAccesses,
      pageFaults: finalData.pageFaults,
      invalidAddresses: finalData.invalidAddresses,
      hitRate: finalData.hitRate,
      steps: steps.length,
    },
  };
}

export const pagingEngine: SimulationEngine<PagingInput, PagingStepData> = {
  id: PAGING_ENGINE_ID,
  algorithmId: PAGING_ALGORITHM_ID,
  labId: PAGING_LAB_ID,
  name: 'Address Translation & the TLB',
  description:
    'Split a logical address into page and offset, walk a TLB-backed page table, fault absent pages, and recombine frame and offset into a physical address.',
  validate: validatePagingInput,
  run: runPaging,
};
