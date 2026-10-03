import type { PageReplacementInput } from '../../replacement';
import {
  BELADY_REFERENCE_STRING,
  beladyComparison,
  findPageReplacementPreset,
  runPageReplacement,
} from '../../replacement';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer } from './helpers';

const TOPIC = 'virtual-memory';
const LAB = 'lab-page-replacement';

function presetInput(id: string): PageReplacementInput {
  const preset = findPageReplacementPreset(id);
  if (!preset) throw new Error(`missing page-replacement preset ${id}`);
  return preset.input;
}

function summaryOf(id: string): Record<string, number> {
  return runPageReplacement(presetInput(id)).summary;
}

function firstVictim(id: string): number {
  const step = runPageReplacement(presetInput(id)).steps.find((item) => item.data.evicted);
  return step?.data.victimPage ?? -1;
}

/**
 * The page-replacement bank.
 *
 * Fault counts, hit counts and victims are read out of the replacement engine,
 * and the anomaly verdicts come from the engine's own Bélády sweep, so nothing
 * here can disagree with the simulator.
 */
export function pageReplacementChallenges(): Challenge[] {
  const challenges: Challenge[] = [];

  {
    const correct = summaryOf('repl-basic').faults ?? 0;
    challenges.push({
      id: 'replacement-fifo-faults',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many page faults does FIFO produce over three frames for the basic string?',
      scenario: 'The twelve-reference string 7 0 1 2 0 3 0 4 2 3 0 3 with three frames.',
      unit: 'page faults',
      expectedAnswer: numberAnswer(correct),
      explanation: `FIFO evicts the page that has been resident longest, whether or not it is still in use, so it discards pages the program is about to need again and thrashes: ${correct} faults. LRU exploits the same string’s locality far better.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('repl-lru-locality').faults ?? 0;
    challenges.push({
      id: 'replacement-lru-faults',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'On the locality string, how many faults does LRU produce over three frames?',
      scenario: 'The string 1 2 3 4 1 2 5 1 2 3 4 5 with three frames under LRU.',
      unit: 'page faults',
      expectedAnswer: numberAnswer(correct),
      explanation: `LRU keeps recently used pages, so it preserves the working set the string deliberately revisits: ${correct} faults. Because it is a stack algorithm, adding frames can never make LRU fault more.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('repl-optimal').faults ?? 0;
    challenges.push({
      id: 'replacement-optimal-faults',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'How many faults does OPT produce for the basic string, the theoretical minimum?',
      scenario: 'The basic seven-page string with three frames and full future knowledge.',
      unit: 'page faults',
      expectedAnswer: numberAnswer(correct),
      explanation: `OPT evicts the page whose next use is furthest away, so it faults the least possible: ${correct}. It is unimplementable without seeing the future, but it is the yardstick every real policy is measured against.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'Optimal (OPT)';
    const { options, correctId } = choiceSet(correct, ['FIFO', 'LRU', 'Second Chance (Clock)'], 2);
    challenges.push({
      id: 'replacement-optimal-policy',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'Which policy is guaranteed to fault the least, given full knowledge of the future?',
      scenario: 'Comparing replacement policies on the same reference string.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'OPT is optimal by construction — it evicts the page used furthest in the future. Real systems approximate it: LRU with recency, or Clock with a single reference bit.',
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('repl-basic').hits ?? 0;
    challenges.push({
      id: 'replacement-fifo-hits',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many of the twelve references are hits in the basic FIFO run?',
      scenario: 'Reference string 7 0 1 2 0 3 0 4 2 3 0 3 with three frames.',
      unit: 'hits',
      expectedAnswer: numberAnswer(correct),
      explanation: `A hit needs the page still resident, and FIFO evicts purely by age, so only ${correct} references find their page in a frame. Every other reference is a fault and a disk access.`,
      relatedLab: LAB,
    });
  }

  {
    const fifo = beladyComparison(BELADY_REFERENCE_STRING).find((curve) => curve.algorithm === 'fifo');
    const anomalyPoint = fifo?.anomaly ?? null;
    const moreFaults = anomalyPoint !== null;
    const { options, correctId } = choiceSet(
      moreFaults ? 'No — it can fault more with more frames' : 'Yes — more frames always help',
      [moreFaults ? 'Yes — more frames always help' : 'No — it can fault more with more frames'],
      0,
    );
    challenges.push({
      id: 'replacement-belady-fifo',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'For the Bélády string, does giving FIFO four frames instead of three reduce its faults?',
      scenario: `The string ${BELADY_REFERENCE_STRING.join(' ')}, compared at three and four frames.`,
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `${moreFaults ? `No — the engine detects an anomaly at ${anomalyPoint?.toFrameCount} frames: FIFO faults *more* with the extra frame.` : 'The engine finds no anomaly on this sweep.'} FIFO is not a stack algorithm, so the resident set for three frames is not a subset of the set for four, and the extra frame changes which page is victimised. LRU and OPT cannot exhibit this.`,
      relatedLab: LAB,
    });
  }

  {
    const lru = beladyComparison(BELADY_REFERENCE_STRING).find((curve) => curve.algorithm === 'lru');
    const immune = !lru?.anomaly;
    const { options, correctId } = choiceSet(
      immune ? 'Fewer or equal faults — LRU cannot show the anomaly' : 'More faults with four frames',
      [immune ? 'More faults with four frames' : 'Fewer or equal faults — LRU cannot show the anomaly'],
      1,
    );
    challenges.push({
      id: 'replacement-lru-immune',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'For the same string, what happens to LRU’s fault count as frames increase?',
      scenario: `The string ${BELADY_REFERENCE_STRING.join(' ')} under LRU at increasing frame counts.`,
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'LRU is a stack algorithm: the pages resident with n frames are always a subset of those resident with n+1 frames, so extra memory can never cause extra faults. That property is exactly what FIFO lacks.',
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('repl-one-frame').faults ?? 0;
    challenges.push({
      id: 'replacement-one-frame',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'With a single frame and the string 1 2 1 2 1, how many faults occur?',
      scenario: 'One frame, alternating references to two pages.',
      unit: 'page faults',
      expectedAnswer: numberAnswer(correct),
      explanation: `A single frame holds one page, so every switch between pages evicts the other: ${correct} faults out of five references. This is the degenerate case that motivates adding frames.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('repl-many-frames').faults ?? 0;
    challenges.push({
      id: 'replacement-many-frames',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'With five frames and the string 1 2 3 1 2 3, how many faults occur?',
      scenario: 'Five frames for only three distinct pages.',
      unit: 'page faults',
      expectedAnswer: numberAnswer(correct),
      explanation: `Once each distinct page is resident there is always a free frame, so no page is ever evicted and the fault count equals the number of distinct pages: ${correct}. This is why more memory flattens the fault curve until the working set no longer fits.`,
      relatedLab: LAB,
    });
  }

  {
    const victim = firstVictim('repl-lru-locality');
    const candidates = [0, 1, 2, 5].filter((page) => page !== victim);
    const { options, correctId } = choiceSet(`page ${victim}`, candidates.map((page) => `page ${page}`), 0);
    challenges.push({
      id: 'replacement-lru-victim',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'On its first replacement, which page does LRU evict?',
      scenario: 'LRU over three frames on the locality string.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `LRU evicts the page that has gone unused the longest, which the engine records as ${`page ${victim}`} for the first replacement. Stepping through the run shows each page’s last-use time being compared.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'It is set, giving the page a second chance before eviction';
    const { options, correctId } = choiceSet(correct, [
      'It is cleared, marking the page for immediate eviction',
      'It is ignored by the clock hand',
    ], 0);
    challenges.push({
      id: 'replacement-clock-bit',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'In Second Chance (Clock), what happens to a page’s reference bit on a hit?',
      scenario: 'The clock hand passes a resident page whose reference bit is 1.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'A hit sets the reference bit to 1. When the hand reaches a page with the bit set, it clears the bit and moves on — the page gets a second chance. Only a page whose bit is 0 is evicted, which approximates LRU without tracking exact times.',
      relatedLab: LAB,
    });
  }

  {
    const distinct = new Set(BELADY_REFERENCE_STRING).size;
    const correct = distinct;
    challenges.push({
      id: 'replacement-distinct-pages',
      topic: TOPIC,
      bank: 'page-replacement',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'How many distinct pages does the Bélády anomaly string touch?',
      scenario: `The string ${BELADY_REFERENCE_STRING.join(' ')}.`,
      unit: 'distinct pages',
      expectedAnswer: numberAnswer(correct),
      explanation: `Only ${correct} distinct pages appear, which is why the anomaly is possible: with four frames FIFO is almost holding the whole working set, yet a poorly timed eviction can still fault more than three frames would. The fault count is bounded below by the number of distinct pages.`,
      relatedLab: LAB,
    });
  }

  return challenges;
}
