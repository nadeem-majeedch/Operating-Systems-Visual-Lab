import type { PagingInput, PagingStepData } from '../../paging';
import {
  PAGING_PRESETS,
  composePhysical,
  decomposeAddress,
  pagingGeometry,
  runPaging,
} from '../../paging';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer } from './helpers';

const TOPIC = 'virtual-memory';
const LAB = 'lab-tlb-translation';

function presetInput(id: string): PagingInput {
  const preset = PAGING_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing paging preset ${id}`);
  return preset.input;
}

function stepsOf(id: string): readonly PagingStepData[] {
  return runPaging(presetInput(id)).steps.map((step) => step.data);
}

/**
 * The paging bank.
 *
 * Geometry answers come straight from the address maths; TLB, fault and invalid
 * answers are read from the engine run for the named preset, so a learner can
 * reproduce each one by loading the preset and stepping through.
 */
export function pagingChallenges(): Challenge[] {
  const challenges: Challenge[] = [];
  const basic = presetInput('paging-basic');

  const geometry = pagingGeometry(basic);

  /* --------------------------------------------------------------------- */
  /* Address geometry                                                       */
  /* --------------------------------------------------------------------- */

  {
    challenges.push({
      id: 'paging-offset-bits',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'With a 64-byte page, how many bits of a logical address are the offset?',
      scenario: 'A 64-byte page size with an 8-bit logical address space.',
      unit: 'bits',
      expectedAnswer: numberAnswer(geometry.offsetBits),
      explanation: `64 = 2⁶, so the low ${geometry.offsetBits} bits index a byte inside the page. The remaining logical bits name the page, and splitting the address this way is what lets the page number be translated independently of the offset.`,
      relatedLab: LAB,
    });
  }

  {
    challenges.push({
      id: 'paging-page-count',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'An 8-bit logical space with 64-byte pages contains how many pages?',
      scenario: 'Logical addresses run from 0 to 255.',
      unit: 'pages',
      expectedAnswer: numberAnswer(geometry.pageCount),
      explanation: `256 bytes ÷ 64 bytes per page = ${geometry.pageCount} pages, so the page number needs ${geometry.pageBits} bits. More pages means a larger page table, which is why real systems use multi-level tables.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = pagingGeometry({ ...basic, physicalAddressBits: 10 }).frameCount;
    challenges.push({
      id: 'paging-frame-count',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'A 10-bit physical address space with 64-byte frames holds how many frames?',
      scenario: 'Physical memory is 1024 bytes; pages are 64 bytes.',
      unit: 'frames',
      expectedAnswer: numberAnswer(correct),
      explanation: `1024 ÷ 64 = ${correct} frames. There are usually more virtual pages than physical frames, which is precisely why a page table and a replacement policy are needed.`,
      relatedLab: LAB,
    });
  }

  {
    const parts = decomposeAddress(100, geometry.pageSize);
    challenges.push({
      id: 'paging-decompose-page',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'With 64-byte pages, which page does logical address 100 fall in?',
      scenario: 'Address 100 is split into a page number and an offset.',
      unit: 'page number',
      expectedAnswer: numberAnswer(parts.pageNumber),
      explanation: `⌊100 ÷ 64⌋ = ${parts.pageNumber}, so address 100 names page ${parts.pageNumber}. Division discards the offset, exactly as masking off the low ${geometry.offsetBits} bits would.`,
      relatedLab: LAB,
    });
  }

  {
    const parts = decomposeAddress(100, geometry.pageSize);
    challenges.push({
      id: 'paging-decompose-offset',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'What is the offset of logical address 100 within its page?',
      scenario: 'Address 100 with 64-byte pages.',
      unit: 'bytes',
      expectedAnswer: numberAnswer(parts.offset),
      explanation: `100 − ${parts.pageNumber} × 64 = ${parts.offset}, so the byte sits ${parts.offset} bytes into page ${parts.pageNumber}. The offset is copied unchanged into the physical address — translation only rewrites the page number.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = composePhysical(5, 10, geometry.pageSize);
    challenges.push({
      id: 'paging-compose-physical',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'Frame 5 with offset 10 gives which physical address?',
      scenario: '64-byte frames; the page was mapped to frame 5, offset 10.',
      unit: 'physical address',
      expectedAnswer: numberAnswer(correct),
      explanation: `Physical = frame × page size + offset = 5 × 64 + 10 = ${correct}. This is the whole point of translation: a virtual page number is replaced by a physical frame number while the offset passes through untouched.`,
      relatedLab: LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* The TLB and page faults                                                */
  /* --------------------------------------------------------------------- */

  {
    const hit = stepsOf('paging-basic').find(
      (step) => step.referenceIndex === 4 && step.event === 'tlb',
    )?.tlbOutcome;
    const isHit = hit === 'hit';
    const { options, correctId } = choiceSet(isHit ? 'TLB hit' : 'TLB miss', [isHit ? 'TLB miss' : 'TLB hit'], 0);
    challenges.push({
      id: 'paging-fifth-lookup',
      topic: TOPIC,
      bank: 'tlb',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'In the "Basic walk" preset, is the fifth reference (address 128) a TLB hit or a miss?',
      scenario: 'References 0, 64, 128, 100, 128, 0, 192 through a four-entry TLB.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Pages 0, 1 and 2 were loaded into the TLB by the first three references and nothing has been evicted, so the second visit to page 2 finds it resident — a hit. A hit skips the page-table walk entirely.',
      relatedLab: LAB,
    });
  }

  {
    const summary = runPaging(basic).summary;
    const percent = Math.round((summary.hitRate ?? 0) * 100);
    challenges.push({
      id: 'paging-hit-rate',
      topic: TOPIC,
      bank: 'tlb',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'What is the TLB hit rate for the "Basic walk" preset, to the nearest percent?',
      scenario: 'Seven references through a four-entry TLB covering four pages.',
      unit: 'percent',
      expectedAnswer: numberAnswer(percent, 0.6),
      explanation: `The engine reports ${summary.tlbHits} hits and ${summary.tlbMisses} misses, a hit rate of about ${percent}%. The first touch of a page always misses; only repeats hit, which is why locality of reference decides how well a TLB performs.`,
      relatedLab: LAB,
    });
  }

  {
    const faulted = stepsOf('paging-fault').some((step) => step.event === 'fault');
    const { options, correctId } = choiceSet(faulted ? 'Yes' : 'No', [faulted ? 'No' : 'Yes'], 1);
    challenges.push({
      id: 'paging-first-fault',
      topic: TOPIC,
      bank: 'page-faults',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Page 2 starts absent. Does the first reference to it raise a page fault?',
      scenario: 'The "Page fault" preset marks page 2 present = false before the run.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Its page-table entry has a clear valid bit, so the first touch faults and the operating system loads the page into a frame before retrying the instruction. The second reference then hits, because the page is now resident and the TLB may hold it.',
      relatedLab: LAB,
    });
  }

  {
    const count = stepsOf('paging-invalid').filter((step) => step.event === 'invalid').length;
    challenges.push({
      id: 'paging-invalid-count',
      topic: TOPIC,
      bank: 'page-faults',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'References 0, 300 and 128 with an 8-bit logical space — how many are rejected?',
      scenario: 'The largest legal logical address is 255.',
      unit: 'references',
      expectedAnswer: numberAnswer(count),
      explanation: `Address 300 exceeds 255, so ${count} reference${count === 1 ? '' : 's'} fail${count === 1 ? 's' : ''} the range check before translation. A fault is different from an error: a page fault is recoverable, an out-of-range address is a program bug that traps.`,
      relatedLab: LAB,
    });
  }

  {
    const before = stepsOf('paging-tlb-evict-lru').find(
      (step) => step.referenceIndex === 2 && step.event === 'address',
    )?.tlbEntries.map((entry) => entry.page) ?? [];
    const after = stepsOf('paging-tlb-evict-lru').find(
      (step) => step.referenceIndex === 3 && step.event === 'address',
    )?.tlbEntries.map((entry) => entry.page) ?? [];
    const victim = before.find((page) => !after.includes(page)) ?? 0;
    const candidates = [0, 1, 2, 3].filter((page) => page !== victim);
    const { options, correctId } = choiceSet(`page ${victim}`, candidates.map((page) => `page ${page}`), 0);
    challenges.push({
      id: 'paging-lru-victim',
      topic: TOPIC,
      bank: 'tlb',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'A two-entry LRU TLB holds pages 0 and 1 when page 2 misses. Which page is evicted?',
      scenario: 'References 0, 64, 0, 128, 64 with a two-entry LRU TLB.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `The second reference to page 0 made it the most recently used, so the least recently used entry — ${`page ${victim}`} — is the victim. LRU respects recent history; FIFO would instead evict whichever entry was loaded first, regardless of use.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'Splitting a logical address into its page number and its offset';
    const { options, correctId } = choiceSet(correct, [
      'Copying the entire page into a frame',
      'Choosing which page to evict',
      'Reading the page table from disk',
    ], 1);
    challenges.push({
      id: 'paging-translation-step',
      topic: TOPIC,
      bank: 'address-translation',
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'What is the first thing an address translation does?',
      scenario: 'A logical address arrives at the memory-management unit.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Translation splits the address into a page number and an offset. The page number is looked up (TLB first, then the page table) to find a frame; the offset is appended unchanged to form the physical address.',
      relatedLab: LAB,
    });
  }

  {
    const evicts = stepsOf('paging-tlb-evict-lru').some((step) => step.victimPage !== null);
    const correct = 'One of its existing entries must be evicted';
    const { options, correctId } = choiceSet(correct, [
      evicts ? 'Nothing — a full TLB can hold unlimited entries' : 'A page must be written back to disk',
      'The page table must be rebuilt from scratch',
    ], 1);
    challenges.push({
      id: 'paging-tlb-capacity',
      topic: TOPIC,
      bank: 'tlb',
      difficulty: 'advanced',
      kind: 'decision',
      question: 'A TLB miss occurs and the TLB is already full. What must happen before the new entry is installed?',
      scenario: 'A two-entry TLB is full when a new page number is looked up.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'A full TLB must drop an entry to make room, and the replacement policy — LRU or FIFO — decides which. Evicting a TLB entry is cheap compared with evicting a *page*: no data moves, only the cached mapping changes. The engine records the victim so the choice is visible.',
      relatedLab: LAB,
    });
  }

  return challenges;
}
