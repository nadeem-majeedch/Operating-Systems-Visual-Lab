import type { PageReplacementInput, ReplacementAlgorithm } from './types';
import { PAGE_REPLACEMENT_PRESETS, findPageReplacementPreset } from './presets';
import { runPageReplacement } from './replacement';
import { BELADY_REFERENCE_STRING, beladyComparison } from './comparison';

export type PageReplacementChallengeKind =
  | 'faults'
  | 'hits'
  | 'victim'
  | 'policy'
  | 'anomaly'
  | 'behaviour';

export interface PageReplacementChallenge {
  readonly id: string;
  readonly kind: PageReplacementChallengeKind;
  readonly title: string;
  readonly prompt: string;
  /** The configuration the question is about; the panel can replay it. */
  readonly input: PageReplacementInput;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

function presetInput(id: string): PageReplacementInput {
  const preset = findPageReplacementPreset(id);
  if (!preset) throw new Error(`missing page-replacement preset ${id}`);
  return preset.input;
}

function summary(id: string): Record<string, number> {
  return runPageReplacement(presetInput(id)).summary;
}

function firstVictim(id: string): number {
  const step = runPageReplacement(presetInput(id)).steps.find((item) => item.data.evicted);
  return step?.data.victimPage ?? -1;
}

function numericOptions(
  correct: number,
  candidates: readonly number[],
): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, ...candidates.filter((value) => value >= 0)])].sort(
    (a, b) => a - b,
  );
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

function choiceOptions(
  correct: string,
  choices: readonly string[],
): { options: string[]; correctIndex: number } {
  const options = [...new Set([correct, ...choices])];
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * The page-replacement challenge set.
 *
 * Every numeric answer is read out of the engine's own run, so a learner can
 * reproduce it by loading the matching preset and stepping through — nothing is
 * asserted that the simulator cannot show.
 */
export function buildPageReplacementChallenges(): PageReplacementChallenge[] {
  const challenges: PageReplacementChallenge[] = [];
  const basic = presetInput('repl-basic');
  const anomaly = presetInput('repl-belady');

  // 1 — FIFO faults on the basic string.
  {
    const correct = summary('repl-basic').faults ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct - 1, correct + 3]);
    challenges.push({
      id: 'repl-fifo-faults',
      kind: 'faults',
      title: 'FIFO fault count',
      prompt: 'How many page faults does FIFO produce for the "Basic string" over three frames?',
      input: basic,
      options,
      correctIndex,
      explanation:
        'Every first touch faults; under FIFO the oldest resident page is evicted each time no frame is free, which is why so few of these references are hits.',
    });
  }

  // 2 — LRU faults on the basic string.
  {
    const correct = summary('repl-lru-locality').faults ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct - 1, correct + 2]);
    challenges.push({
      id: 'repl-lru-faults',
      kind: 'faults',
      title: 'LRU fault count',
      prompt: 'How many page faults does LRU produce for the "LRU exploits locality" string over three frames?',
      input: presetInput('repl-lru-locality'),
      options,
      correctIndex,
      explanation:
        'LRU keeps recently used pages, so it reuses the locality the string deliberately creates instead of discarding it like FIFO.',
    });
  }

  // 3 — OPT faults on the basic string.
  {
    const correct = summary('repl-optimal').faults ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 2, correct + 1, correct + 3]);
    challenges.push({
      id: 'repl-optimal-faults',
      kind: 'faults',
      title: 'OPT fault count',
      prompt: 'How many page faults does OPT produce for the "Optimal bound" string over three frames?',
      input: presetInput('repl-optimal'),
      options,
      correctIndex,
      explanation:
        'OPT evicts the page not needed for the longest time, so it faults the least — it is the theoretical lower bound for this string.',
    });
  }

  // 4 — which policy is the theoretical bound.
  {
    const { options, correctIndex } = choiceOptions('Optimal (OPT)', ['FIFO', 'LRU', 'Second Chance (Clock)']);
    challenges.push({
      id: 'repl-best-policy',
      kind: 'policy',
      title: 'The measuring stick',
      prompt: 'Which replacement policy is guaranteed to fault the least, given full future knowledge?',
      input: basic,
      options,
      correctIndex,
      explanation:
        'OPT is optimal by construction — it evicts the page whose next use is furthest away — but it needs the entire future string, so real systems only use it as a yardstick.',
    });
  }

  // 5 — hits on the basic string under FIFO.
  {
    const correct = summary('repl-basic').hits ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct + 2, correct - 1]);
    challenges.push({
      id: 'repl-fifo-hits',
      kind: 'hits',
      title: 'FIFO hit count',
      prompt: 'How many of the twelve references are hits in the "Basic string" run?',
      input: basic,
      options,
      correctIndex,
      explanation:
        'A hit needs the page to still be resident, and FIFO evicts purely by age, so only the repeat references that arrive before their page ages out are hits.',
    });
  }

  // 6 — Bélády's anomaly under FIFO.
  {
    const fifo = beladyComparison(BELADY_REFERENCE_STRING).find((curve) => curve.algorithm === 'fifo')!;
    const anomalyPoint = fifo.anomaly;
    const correct = anomalyPoint
      ? `No — it faults more with ${anomalyPoint.toFrameCount} frames`
      : 'Yes — it faults fewer';
    const { options, correctIndex } = choiceOptions(correct, [
      'Yes — it faults fewer',
      'Identical fault counts',
      'No — it faults more with 4 frames',
    ]);
    challenges.push({
      id: 'repl-belady-fifo',
      kind: 'anomaly',
      title: "Bélády's anomaly",
      prompt:
        'For the "Bélády\'s anomaly" string, does giving FIFO four frames instead of three reduce the fault count?',
      input: anomaly,
      options,
      correctIndex,
      explanation:
        'FIFO is not a stack algorithm, so adding a frame can change which pages are resident and increase faults — the famous anomaly. LRU and OPT cannot exhibit it.',
    });
  }

  // 7 — LRU is immune to the anomaly.
  {
    const curves = beladyComparison(BELADY_REFERENCE_STRING);
    const lru = curves.find((curve) => curve.algorithm === 'lru')!;
    const immune = lru.anomaly === null;
    const correct = immune ? 'Fewer or equal faults — LRU cannot show the anomaly' : 'More faults with four frames';
    const { options, correctIndex } = choiceOptions(correct, [
      'More faults with four frames',
      'Exactly the same faults as FIFO',
    ]);
    challenges.push({
      id: 'repl-lru-no-anomaly',
      kind: 'anomaly',
      title: 'Who is immune?',
      prompt: 'For the same string, what happens to LRU’s fault count when the frame count grows?',
      input: anomaly,
      options,
      correctIndex,
      explanation:
        'LRU is a stack algorithm: the resident set for n frames is always a subset of the resident set for n+1 frames, so more frames can never mean more faults.',
    });
  }

  // 8 — LRU victim.
  {
    const victim = firstVictim('repl-lru-locality');
    const { options, correctIndex } = numericOptions(victim, [0, 1, 2, 5]);
    challenges.push({
      id: 'repl-lru-victim',
      kind: 'victim',
      title: 'LRU’s first victim',
      prompt: 'On its first replacement, which page does LRU evict?',
      input: presetInput('repl-lru-locality'),
      options,
      correctIndex,
      explanation:
        'LRU evicts the page that has gone unused the longest. Step through the run to see exactly which page that is.',
    });
  }

  // 9 — OPT victim.
  {
    const victim = firstVictim('repl-optimal');
    const { options, correctIndex } = numericOptions(victim, [0, 1, 2, 3]);
    challenges.push({
      id: 'repl-optimal-victim',
      kind: 'victim',
      title: 'OPT’s first victim',
      prompt: 'On its first replacement, which page does OPT evict?',
      input: presetInput('repl-optimal'),
      options,
      correctIndex,
      explanation:
        'OPT looks ahead: the victim is the resident page whose next use is furthest in the future (or that never returns).',
    });
  }

  // 10 — Clock reference bit on a hit.
  {
    const { options, correctIndex } = choiceOptions('It is set to 1, giving the page a second chance', [
      'It is cleared to 0',
      'It is left unchanged',
    ]);
    challenges.push({
      id: 'repl-clock-bit',
      kind: 'behaviour',
      title: 'The reference bit',
      prompt: 'In the Second Chance (Clock) policy, what happens to a page’s reference bit on a hit?',
      input: presetInput('repl-clock'),
      options,
      correctIndex,
      explanation:
        'A hit sets the bit so the hand skips the page on its next sweep, clearing the bit as it passes — that is the second chance.',
    });
  }

  // 11 — one frame.
  {
    const correct = summary('repl-one-frame').faults ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct - 1, correct + 1, correct + 2]);
    challenges.push({
      id: 'repl-one-frame-faults',
      kind: 'faults',
      title: 'A single frame',
      prompt: 'With one frame and the string 1 2 1 2 1, how many faults occur?',
      input: presetInput('repl-one-frame'),
      options,
      correctIndex,
      explanation:
        'A single frame holds at most one page, so alternating references evict each other — every reference is a fault.',
    });
  }

  // 12 — more frames than pages.
  {
    const correct = summary('repl-many-frames').faults ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct + 2, correct + 3]);
    challenges.push({
      id: 'repl-many-frames-faults',
      kind: 'faults',
      title: 'More frames than pages',
      prompt: 'With five frames and only three distinct pages (1 2 3 1 2 3), how many faults occur?',
      input: presetInput('repl-many-frames'),
      options,
      correctIndex,
      explanation:
        'Once every distinct page is resident there is always a free frame, so no victim is ever chosen — the fault count equals the number of distinct pages.',
    });
  }

  return challenges;
}

/** Stable count used by tests and the UI's progress copy. */
export const PAGE_REPLACEMENT_CHALLENGE_COUNT = buildPageReplacementChallenges().length;

/** All preset ids, exported so tests can assert the panel covers each one. */
export const PAGE_REPLACEMENT_PRESET_IDS = PAGE_REPLACEMENT_PRESETS.map((preset) => preset.id);

/** Algorithms the lab offers, in teaching order. */
export const PAGE_REPLACEMENT_ALGORITHM_LIST: readonly ReplacementAlgorithm[] = [
  'fifo',
  'optimal',
  'lru',
  'clock',
];
