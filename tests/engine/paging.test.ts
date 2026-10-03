import { describe, expect, it } from 'vitest';
import {
  PAGING_ALGORITHM_ID,
  PAGING_LAB_ID,
  PAGING_PRESETS,
  buildPagingChallenges,
  composePhysical,
  decomposeAddress,
  formatBinary,
  formatHex,
  frameCountFor,
  isPowerOfTwo,
  log2Int,
  offsetBitsFor,
  pageCountFor,
  pagingGeometry,
  runPaging,
  validatePagingInput,
  type PagingInput,
  type PagingStepData,
  type SimulationRun,
} from '@/engine';

function finalData(run: SimulationRun<PagingStepData>): PagingStepData {
  const last = run.steps[run.steps.length - 1];
  if (!last) throw new Error('empty run');
  return last.data;
}

function preset(id: string): PagingInput {
  const found = PAGING_PRESETS.find((item) => item.id === id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found.input;
}

const base: PagingInput = {
  pageSize: 64,
  logicalAddressBits: 8,
  physicalAddressBits: 8,
  tlbSize: 4,
  tlbPolicy: 'lru',
  references: [0, 64, 128, 100, 128, 0, 192],
  absentPages: [],
};

/* -------------------------------------------------------------------------- */
/* Address decomposition & geometry                                            */
/* -------------------------------------------------------------------------- */

describe('address arithmetic', () => {
  it('recognises powers of two', () => {
    expect(isPowerOfTwo(64)).toBe(true);
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(100)).toBe(false);
    expect(isPowerOfTwo(0)).toBe(false);
  });

  it('computes log2 only for powers of two', () => {
    expect(log2Int(1024)).toBe(10);
    expect(log2Int(64)).toBe(6);
    expect(log2Int(100)).toBe(-1);
  });

  it('derives the offset width from the page size', () => {
    expect(offsetBitsFor(64)).toBe(6);
    expect(offsetBitsFor(16)).toBe(4);
    expect(offsetBitsFor(100)).toBe(-1);
  });

  it('splits a logical address into page number and offset', () => {
    expect(decomposeAddress(0, 64)).toEqual({ pageNumber: 0, offset: 0 });
    expect(decomposeAddress(100, 64)).toEqual({ pageNumber: 1, offset: 36 });
    expect(decomposeAddress(255, 64)).toEqual({ pageNumber: 3, offset: 63 });
  });

  it('recombines a frame and offset into a physical address', () => {
    expect(composePhysical(5, 10, 64)).toBe(330);
    expect(composePhysical(0, 0, 64)).toBe(0);
    expect(composePhysical(3, 63, 64)).toBe(255);
  });

  it('formats binary and hex fields', () => {
    expect(formatBinary(0b1010, 4)).toBe('1010');
    expect(formatBinary(0, 3)).toBe('000');
    expect(formatHex(0x1a, 8)).toBe('0x1A');
    expect(formatHex(2, 8)).toBe('0x02');
  });
});

describe('page and frame calculations', () => {
  it('counts pages and frames from the geometry', () => {
    expect(pageCountFor(64, 8)).toBe(4);
    expect(frameCountFor(64, 8)).toBe(4);
    expect(frameCountFor(64, 10)).toBe(16);
    expect(pageCountFor(16, 8)).toBe(16);
  });

  it('assembles the full geometry', () => {
    expect(pagingGeometry({ pageSize: 64, logicalAddressBits: 8, physicalAddressBits: 8 })).toEqual({
      pageSize: 64,
      offsetBits: 6,
      pageBits: 2,
      frameBits: 2,
      pageCount: 4,
      frameCount: 4,
      logicalSize: 256,
      physicalSize: 256,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Translation                                                                 */
/* -------------------------------------------------------------------------- */

describe('translation engine', () => {
  it('reports the paging algorithm and lab', () => {
    const run = runPaging(base);
    expect(run.algorithmId).toBe(PAGING_ALGORITHM_ID);
    expect(run.labId).toBe(PAGING_LAB_ID);
  });

  it('translates each reference to a physical address', () => {
    const run = runPaging(base);
    const last = run.steps.filter(
      (step) => step.data.referenceIndex === 6 && step.data.event === 'address',
    );
    expect(last[0]?.data.physicalAddress).toBe(192);
    expect(finalData(run).physicalAddress).toBe(192);
  });

  it('keeps the offset unchanged during translation', () => {
    const run = runPaging(base);
    for (const step of run.steps) {
      if (step.data.event !== 'address' || step.data.physicalAddress === null) continue;
      expect(step.data.physicalAddress % base.pageSize).toBe(step.data.offset);
    }
  });

  it('counts TLB hits and misses across the stream', () => {
    const run = runPaging(base);
    expect(run.summary.tlbHits).toBe(3);
    expect(run.summary.tlbMisses).toBe(4);
    expect(run.summary.pageTableAccesses).toBe(4);
    expect(run.summary.pageFaults).toBe(0);
  });

  it('is deterministic', () => {
    const first = runPaging(base);
    const second = runPaging(base);
    expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
    expect(second.summary).toEqual(first.summary);
  });
});

/* -------------------------------------------------------------------------- */
/* TLB behaviour                                                               */
/* -------------------------------------------------------------------------- */

describe('TLB behaviour', () => {
  it('marks a repeated page as a hit without touching the page table', () => {
    const run = runPaging(base);
    const hit = run.steps.find((step) => step.data.referenceIndex === 4 && step.data.event === 'tlb');
    expect(hit?.data.tlbOutcome).toBe('hit');
  });

  it('evicts the least-recently-used entry under LRU', () => {
    const run = runPaging(preset('paging-tlb-evict-lru'));
    expect(run.summary.tlbHits).toBe(1);
    expect(run.summary.tlbMisses).toBe(4);
    const entries = run.steps.find(
      (step) => step.data.referenceIndex === 3 && step.data.event === 'address',
    )?.data.tlbEntries.map((entry) => entry.page);
    expect(entries).toContain(2);
    expect(entries).not.toContain(1);
  });

  it('evicts the oldest entry under FIFO and scores better here', () => {
    const run = runPaging(preset('paging-tlb-evict-fifo'));
    expect(run.summary.tlbHits).toBe(2);
    expect(run.summary.tlbMisses).toBe(3);
    const entries = run.steps.find(
      (step) => step.data.referenceIndex === 3 && step.data.event === 'address',
    )?.data.tlbEntries.map((entry) => entry.page);
    expect(entries).toContain(1);
    expect(entries).not.toContain(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Page faults                                                                 */
/* -------------------------------------------------------------------------- */

describe('page faults', () => {
  it('faults an absent page in and then caches it', () => {
    const run = runPaging(preset('paging-fault'));
    expect(run.summary.pageFaults).toBe(1);
    expect(run.summary.tlbHits).toBe(1);
    expect(run.summary.tlbMisses).toBe(2);

    const fault = run.steps.find((step) => step.data.event === 'fault');
    expect(fault?.data.referenceIndex).toBe(0);
    expect(fault?.data.faulted).toBe(true);
    expect(fault?.data.victimPage).toBeNull();
    expect(fault?.data.frameNumber).toBe(2);
  });

  it('shows the absent page becomes present after the fault', () => {
    const run = runPaging(preset('paging-fault'));
    const fault = run.steps.find((step) => step.data.event === 'fault');
    const entry = fault?.data.pageTable.find((row) => row.page === 2);
    expect(entry?.present).toBe(true);
    expect(entry?.frame).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* Invalid addresses                                                           */
/* -------------------------------------------------------------------------- */

describe('invalid addresses', () => {
  it('rejects an address past the logical space without translating it', () => {
    const run = runPaging(preset('paging-invalid'));
    expect(run.summary.invalidAddresses).toBe(1);
    const invalid = run.steps.find((step) => step.data.event === 'invalid');
    expect(invalid?.data.referenceIndex).toBe(1);
    expect(invalid?.data.logicalAddress).toBe(300);
    expect(
      run.steps.some((step) => step.data.referenceIndex === 1 && step.data.event === 'address'),
    ).toBe(false);
  });

  it('accepts the largest address exactly', () => {
    const run = runPaging({ ...base, references: [255], absentPages: [] });
    expect(run.summary.invalidAddresses).toBe(0);
    expect(finalData(run).physicalAddress).toBe(255);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

describe('validation', () => {
  it('accepts a well-formed input and produces steps', () => {
    expect(validatePagingInput(base)).toEqual({ valid: true });
    expect(runPaging(base).steps.length).toBeGreaterThan(1);
  });

  it('rejects a non-power-of-two page size', () => {
    expect(validatePagingInput({ ...base, pageSize: 100 }).valid).toBe(false);
  });

  it('rejects address widths below the offset width', () => {
    expect(validatePagingInput({ ...base, logicalAddressBits: 4, pageSize: 64 }).valid).toBe(false);
  });

  it('rejects an out-of-range TLB size or policy', () => {
    expect(validatePagingInput({ ...base, tlbSize: 0 }).valid).toBe(false);
    expect(validatePagingInput({ ...base, tlbPolicy: 'random' as never }).valid).toBe(false);
  });

  it('rejects empty, negative or out-of-range references', () => {
    expect(validatePagingInput({ ...base, references: [] }).valid).toBe(false);
    expect(validatePagingInput({ ...base, references: [-1] }).valid).toBe(false);
    expect(validatePagingInput({ ...base, references: [999999] }).valid).toBe(false);
  });

  it('rejects an absent page outside the address space', () => {
    expect(validatePagingInput({ ...base, absentPages: [4] }).valid).toBe(false);
    expect(validatePagingInput({ ...base, absentPages: [3] }).valid).toBe(true);
  });

  it('throws when run with invalid input', () => {
    expect(() => runPaging({ ...base, pageSize: 100 })).toThrow(/invalid input/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Presets & challenges                                                        */
/* -------------------------------------------------------------------------- */

describe('presets and challenges', () => {
  it('runs every preset without error', () => {
    for (const item of PAGING_PRESETS) {
      expect(runPaging(item.input).steps.length).toBeGreaterThan(1);
    }
  });

  it('produces well-formed, deterministic challenges', () => {
    const challenges = buildPagingChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(10);
    for (const challenge of challenges) {
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(new Set(challenge.options).size).toBe(challenge.options.length);
    }
    expect(buildPagingChallenges().map((c) => c.correctIndex)).toEqual(
      challenges.map((c) => c.correctIndex),
    );
  });

  it('gets the geometry and translation answers right', () => {
    const byId = new Map(buildPagingChallenges().map((challenge) => [challenge.id, challenge]));
    const answer = (id: string): string | undefined => {
      const challenge = byId.get(id);
      return challenge ? challenge.options[challenge.correctIndex] : undefined;
    };
    expect(answer('paging-offset-bits')).toBe('6');
    expect(answer('paging-page-count')).toBe('4');
    expect(answer('paging-frame-count')).toBe('16');
    expect(answer('paging-decompose-page')).toBe('1');
    expect(answer('paging-decompose-offset')).toBe('36');
    expect(answer('paging-translate-physical')).toBe('330');
    expect(answer('paging-tlb-hit')).toBe('TLB hit');
    expect(answer('paging-page-fault')).toBe('Yes');
    expect(answer('paging-invalid-count')).toBe('1');
    expect(answer('paging-small-page-count')).toBe('16');
  });
});
