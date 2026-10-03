import type { PagingInput, PagingStepData } from './types';
import { findPagingPreset, PAGING_PRESETS } from './presets';
import { runPaging } from './translation';

export type PagingChallengeKind =
  | 'geometry'
  | 'decompose'
  | 'frame-count'
  | 'translate'
  | 'tlb'
  | 'fault'
  | 'hit-rate'
  | 'invalid';

export interface PagingChallenge {
  readonly id: string;
  readonly kind: PagingChallengeKind;
  readonly title: string;
  readonly prompt: string;
  /** The configuration the question is about; the panel can replay it. */
  readonly input: PagingInput;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

function presetInput(id: string): PagingInput {
  const preset = findPagingPreset(id);
  if (!preset) throw new Error(`missing paging preset ${id}`);
  return preset.input;
}

function run(id: string): readonly PagingStepData[] {
  return runPaging(presetInput(id)).steps.map((step) => step.data);
}

function stepAt(
  steps: readonly PagingStepData[],
  referenceIndex: number,
  event: PagingStepData['event'],
): PagingStepData | undefined {
  return steps.find((step) => step.referenceIndex === referenceIndex && step.event === event);
}

function numericOptions(
  correct: number,
  distractors: readonly number[],
): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, ...distractors])].sort((a, b) => a - b);
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

function choiceOptions(correct: string, choices: readonly string[]): { options: string[]; correctIndex: number } {
  const options = [...new Set([correct, ...choices])];
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * The paging challenge set.
 *
 * Geometry answers come straight from the address maths; TLB and page-fault
 * answers are read out of the engine's own run, so a learner can always
 * reproduce them by loading the preset and stepping through.
 */
export function buildPagingChallenges(): PagingChallenge[] {
  const challenges: PagingChallenge[] = [];
  const basic = presetInput('paging-basic');
  const evictLru = presetInput('paging-tlb-evict-lru');
  const fault = presetInput('paging-fault');
  const invalid = presetInput('paging-invalid');
  const small = presetInput('paging-small-pages');

  // 1 — offset bits.
  {
    const { options, correctIndex } = numericOptions(6, [4, 5, 7]);
    challenges.push({
      id: 'paging-offset-bits',
      kind: 'geometry',
      title: 'Offset bits',
      prompt: 'With a 64-byte page size, how many bits of a logical address are the offset?',
      input: basic,
      options,
      correctIndex,
      explanation: '64 = 2⁶, so the low 6 bits of the address index a byte inside the page.',
    });
  }

  // 2 — page count.
  {
    const { options, correctIndex } = numericOptions(4, [2, 8, 16]);
    challenges.push({
      id: 'paging-page-count',
      kind: 'geometry',
      title: 'How many pages?',
      prompt: 'An 8-bit logical address space with 64-byte pages contains how many pages?',
      input: basic,
      options,
      correctIndex,
      explanation: '256 bytes ÷ 64 bytes per page = 4 pages, so 8 − 6 = 2 page-number bits.',
    });
  }

  // 3 — frame count.
  {
    const { options, correctIndex } = numericOptions(16, [8, 32, 64]);
    challenges.push({
      id: 'paging-frame-count',
      kind: 'frame-count',
      title: 'How many frames?',
      prompt: 'A 10-bit physical address space with 64-byte frames holds how many frames?',
      input: { ...basic, physicalAddressBits: 10 },
      options,
      correctIndex,
      explanation: '1024 bytes ÷ 64 bytes per frame = 16 frames, so 10 − 6 = 4 frame-number bits.',
    });
  }

  // 4 — page number of an address.
  {
    const { options, correctIndex } = numericOptions(1, [0, 2, 3]);
    challenges.push({
      id: 'paging-decompose-page',
      kind: 'decompose',
      title: 'Page number of address 100',
      prompt: 'With 64-byte pages, which page does logical address 100 fall in?',
      input: basic,
      options,
      correctIndex,
      explanation: '⌊100 ÷ 64⌋ = 1, so address 100 names page 1.',
    });
  }

  // 5 — offset of an address.
  {
    const { options, correctIndex } = numericOptions(36, [28, 44, 64]);
    challenges.push({
      id: 'paging-decompose-offset',
      kind: 'decompose',
      title: 'Offset of address 100',
      prompt: 'With 64-byte pages, what is the offset of logical address 100?',
      input: basic,
      options,
      correctIndex,
      explanation: '100 − 1 × 64 = 36, so the offset is 36.',
    });
  }

  // 6 — physical address from frame and offset.
  {
    const { options, correctIndex } = numericOptions(330, [310, 320, 340]);
    challenges.push({
      id: 'paging-translate-physical',
      kind: 'translate',
      title: 'Form the physical address',
      prompt: 'With 64-byte frames, frame 5 and offset 10 give which physical address?',
      input: basic,
      options,
      correctIndex,
      explanation: 'Physical = frame × page size + offset = 5 × 64 + 10 = 330.',
    });
  }

  // 7 — TLB hit or miss in a run.
  {
    const steps = run('paging-basic');
    const outcome = stepAt(steps, 4, 'tlb')?.tlbOutcome ?? 'miss';
    const { options, correctIndex } = choiceOptions(
      outcome === 'hit' ? 'TLB hit' : 'TLB miss',
      ['TLB hit', 'TLB miss'],
    );
    challenges.push({
      id: 'paging-tlb-hit',
      kind: 'tlb',
      title: 'Fifth reference',
      prompt:
        'In the "Basic walk" preset the references are 0, 64, 128, 100, 128, 0, 192. Is the fifth reference (128) a TLB hit or a miss?',
      input: basic,
      options,
      correctIndex,
      explanation:
        'Pages 0, 1 and 2 have already been loaded into the TLB by the first three references, so page 2 is a hit.',
    });
  }

  // 8 — LRU eviction victim.
  {
    const steps = run('paging-tlb-evict-lru');
    const before = stepAt(steps, 2, 'address')?.tlbEntries.map((entry) => entry.page) ?? [];
    const after = stepAt(steps, 3, 'address')?.tlbEntries.map((entry) => entry.page) ?? [];
    const victim = before.find((page) => !after.includes(page)) ?? 0;
    const { options, correctIndex } = numericOptions(victim, [0, 1, 2, 3].filter((p) => p !== victim));
    challenges.push({
      id: 'paging-tlb-lru-victim',
      kind: 'tlb',
      title: 'LRU eviction',
      prompt:
        'In "TLB eviction (LRU)" the two-entry TLB holds pages 0 and 1. When page 2 misses, which page is evicted?',
      input: evictLru,
      options,
      correctIndex,
      explanation:
        'Page 0 was used most recently (it was a hit), so the least recently used entry, page 1, is the victim.',
    });
  }

  // 9 — page-fault verdict.
  {
    const steps = run('paging-fault');
    const faulted = steps.some((step) => step.event === 'fault');
    const { options, correctIndex } = choiceOptions(faulted ? 'Yes' : 'No', ['Yes', 'No']);
    challenges.push({
      id: 'paging-page-fault',
      kind: 'fault',
      title: 'Does it fault?',
      prompt:
        'In the "Page fault" preset page 2 is absent. Does the first reference to it raise a page fault?',
      input: fault,
      options,
      correctIndex,
      explanation:
        'Its page-table entry has its valid bit clear, so the first reference faults and the operating system loads the page into a free frame.',
    });
  }

  // 10 — TLB hit rate.
  {
    const summary = runPaging(basic).summary;
    const percent = Math.round((summary.hitRate ?? 0) * 100);
    const { options, correctIndex } = numericOptions(percent, [percent + 14, Math.max(0, percent - 14), 100]);
    challenges.push({
      id: 'paging-hit-rate',
      kind: 'hit-rate',
      title: 'TLB hit rate',
      prompt: 'What is the TLB hit rate for the "Basic walk" preset, to the nearest percent?',
      input: basic,
      options: options.map((option) => `${option}%`),
      correctIndex,
      explanation:
        'Three of the seven lookups find the page already in the TLB, giving a hit rate of about 43%.',
    });
  }

  // 11 — invalid addresses.
  {
    const steps = run('paging-invalid');
    const count = steps.filter((step) => step.event === 'invalid').length;
    const { options, correctIndex } = numericOptions(count, [0, 2, 3]);
    challenges.push({
      id: 'paging-invalid-count',
      kind: 'invalid',
      title: 'Rejected references',
      prompt:
        'In the "Invalid address" preset the references are 0, 300 and 128 with an 8-bit logical space. How many are rejected as out of range?',
      input: invalid,
      options,
      correctIndex,
      explanation:
        'The largest logical address is 255, so 300 is rejected before translation; the other two are translated normally.',
    });
  }

  // 12 — small-page geometry.
  {
    const { options, correctIndex } = numericOptions(16, [4, 8, 32]);
    challenges.push({
      id: 'paging-small-page-count',
      kind: 'geometry',
      title: 'More pages, smaller pages',
      prompt: 'An 8-bit logical space with 16-byte pages contains how many pages?',
      input: small,
      options,
      correctIndex,
      explanation: '256 ÷ 16 = 16 pages, so the page number needs 4 bits and the offset 4 bits.',
    });
  }

  return challenges;
}

/** Stable count used by tests and the UI's progress copy. */
export const PAGING_CHALLENGE_COUNT = buildPagingChallenges().length;

/** All preset ids, exported so tests can assert the panel covers each one. */
export const PAGING_PRESET_IDS = PAGING_PRESETS.map((preset) => preset.id);
