import { describe, expect, it } from 'vitest';
import {
  BELADY_REFERENCE_STRING,
  PAGE_REPLACEMENT_PRESETS,
  REPLACEMENT_ALGORITHMS,
  beladyComparison,
  buildPageReplacementChallenges,
  compareReplacement,
  replacementCurve,
  runPageReplacement,
  validatePageReplacementInput,
  type PageReplacementInput,
  type PageReplacementStepData,
  type SimulationRun,
} from '@/engine';

function finalData(run: SimulationRun<PageReplacementStepData>): PageReplacementStepData {
  const last = run.steps[run.steps.length - 1];
  if (!last) throw new Error('empty run');
  return last.data;
}

const basic: PageReplacementInput = {
  algorithm: 'fifo',
  frameCount: 3,
  referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3],
};

const anomalyString: readonly number[] = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

/* -------------------------------------------------------------------------- */
/* Structure                                                                   */
/* -------------------------------------------------------------------------- */

describe('page-replacement run structure', () => {
  it('emits one initial step plus one step per reference', () => {
    const run = runPageReplacement(basic);
    expect(run.steps.length).toBe(basic.referenceString.length + 1);
    expect(run.steps[0]?.data.event).toBe('init');
    expect(run.steps[0]?.data.referenceIndex).toBe(-1);
  });

  it('labels each reference step as a hit or a fault', () => {
    const run = runPageReplacement(basic);
    for (const step of run.steps.slice(1)) {
      expect(step.data.event === 'hit' || step.data.event === 'fault' || step.data.event === 'replace').toBe(
        true,
      );
      expect(step.data.hit || step.data.faulted).toBe(true);
      expect(step.data.hit && step.data.faulted).toBe(false);
    }
  });

  it('reports the algorithm id that matches the policy', () => {
    expect(runPageReplacement(basic).algorithmId).toBe('fifo-page');
    expect(runPageReplacement({ ...basic, algorithm: 'lru' }).algorithmId).toBe('lru-page');
    expect(runPageReplacement({ ...basic, algorithm: 'optimal' }).algorithmId).toBe('optimal-page');
    expect(runPageReplacement({ ...basic, algorithm: 'clock' }).algorithmId).toBe('clock-page');
    expect(runPageReplacement(basic).labId).toBe('lab-page-replacement');
  });

  it('is deterministic', () => {
    const first = runPageReplacement(basic);
    const second = runPageReplacement(basic);
    expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
    expect(second.summary).toEqual(first.summary);
  });

  it('keeps the frame count fixed and never duplicates a resident page', () => {
    for (const algorithm of REPLACEMENT_ALGORITHMS) {
      const run = runPageReplacement({ algorithm, frameCount: 3, referenceString: anomalyString });
      for (const step of run.steps) {
        expect(step.data.frames.length).toBe(3);
        const pages = step.data.frames.map((frame) => frame.page).filter((page) => page !== null);
        expect(new Set(pages).size).toBe(pages.length);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* FIFO                                                                        */
/* -------------------------------------------------------------------------- */

describe('FIFO', () => {
  it('counts faults, hits and replacements for the basic string', () => {
    const run = runPageReplacement(basic);
    expect(run.summary.hits).toBe(2);
    expect(run.summary.faults).toBe(10);
    expect(run.summary.replacements).toBe(7);
  });

  it('evicts the longest-resident page and explains why', () => {
    const run = runPageReplacement(basic);
    const firstReplace = run.steps.find((step) => step.data.event === 'replace');
    expect(firstReplace?.data.victimPage).toBe(7);
    expect(firstReplace?.data.victimFrame).toBe(0);
    expect(firstReplace?.data.reason).toMatch(/longest/);
  });

  it('ignores hits when deciding the eviction order', () => {
    const run = runPageReplacement(basic);
    // Page 0 is hit at reference 4, then evicted at reference 5: FIFO never
    // reorders on a hit, unlike LRU.
    const hit = run.steps.find((step) => step.data.referenceIndex === 4);
    expect(hit?.data.event).toBe('hit');
    const replaceAtIndex5 = run.steps.find(
      (step) => step.data.referenceIndex === 5 && step.data.event === 'replace',
    );
    expect(replaceAtIndex5?.data.victimPage).toBe(0);
  });

  it('finishes the basic string with ten faults', () => {
    const run = runPageReplacement({ ...basic, frameCount: 3 });
    expect(finalData(run).faults).toBe(10);
  });
});

/* -------------------------------------------------------------------------- */
/* LRU                                                                         */
/* -------------------------------------------------------------------------- */

describe('LRU', () => {
  it('evicts the least recently used page', () => {
    const run = runPageReplacement({ algorithm: 'lru', frameCount: 3, referenceString: anomalyString });
    const firstReplace = run.steps.find((step) => step.data.event === 'replace');
    expect(firstReplace?.data.victimPage).toBe(1);
    expect(firstReplace?.data.reason).toMatch(/least recently/);
  });

  it('refreshes recency on a hit so a reused page survives', () => {
    // 1 2 3 1 4 over three frames: page 1 is hit at reference 4, so LRU evicts
    // page 2 (the least recently used), not page 1.
    const run = runPageReplacement({ algorithm: 'lru', frameCount: 3, referenceString: [1, 2, 3, 1, 4] });
    const replaces = run.steps.filter((step) => step.data.event === 'replace');
    expect(replaces[replaces.length - 1]?.data.victimPage).toBe(2);

    // FIFO, by contrast, evicts page 1 because it was loaded first.
    const fifo = runPageReplacement({ algorithm: 'fifo', frameCount: 3, referenceString: [1, 2, 3, 1, 4] });
    const fifoReplaces = fifo.steps.filter((step) => step.data.event === 'replace');
    expect(fifoReplaces[fifoReplaces.length - 1]?.data.victimPage).toBe(1);
  });

  it('does better than FIFO when the string has locality', () => {
    const lru = runPageReplacement({ algorithm: 'lru', frameCount: 4, referenceString: anomalyString });
    const fifo = runPageReplacement({ algorithm: 'fifo', frameCount: 4, referenceString: anomalyString });
    expect(lru.summary.faults).toBeLessThan(fifo.summary.faults ?? 0);
  });
});

/* -------------------------------------------------------------------------- */
/* Optimal                                                                     */
/* -------------------------------------------------------------------------- */

describe('Optimal (OPT)', () => {
  it('faults the least of all policies on the basic string', () => {
    const outcomes = compareReplacement(basic.referenceString, 3);
    const optimal = outcomes.find((outcome) => outcome.algorithm === 'optimal');
    expect(optimal?.faults).toBe(7);
    for (const outcome of outcomes) {
      expect(outcome.faults).toBeGreaterThanOrEqual(optimal?.faults ?? 0);
    }
  });

  it('evicts the page whose next use is furthest away', () => {
    const run = runPageReplacement({ algorithm: 'optimal', frameCount: 3, referenceString: basic.referenceString });
    const firstReplace = run.steps.find((step) => step.data.event === 'replace');
    // Pages 7 and 1 are never used again; OPT takes page 7 first (lowest frame).
    expect(firstReplace?.data.victimPage).toBe(7);
    expect(firstReplace?.data.reason).toMatch(/never referenced again/);
  });

  it('mentions the future use when a page does return', () => {
    const run = runPageReplacement({ algorithm: 'optimal', frameCount: 3, referenceString: basic.referenceString });
    const replaces = run.steps.filter((step) => step.data.event === 'replace');
    expect(replaces.some((step) => /next use is at reference/.test(step.data.reason))).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Second Chance / Clock                                                       */
/* -------------------------------------------------------------------------- */

describe('Second Chance (Clock)', () => {
  const run = runPageReplacement({ algorithm: 'clock', frameCount: 3, referenceString: anomalyString });

  it('counts faults and hits for the anomaly string', () => {
    expect(run.summary.faults).toBe(9);
    expect(run.summary.hits).toBe(3);
  });

  it('sets the reference bit on a hit', () => {
    const hit = run.steps.find((step) => step.data.referenceIndex === 7);
    expect(hit?.data.event).toBe('hit');
    const frame = hit?.data.frames.find((slot) => slot.frame === hit.data.frameNumber);
    expect(frame?.referenced).toBe(true);
  });

  it('sweeps the hand, clearing reference bits before choosing a victim', () => {
    const firstReplace = run.steps.find((step) => step.data.event === 'replace');
    expect(firstReplace?.data.victimPage).toBe(1);
    expect(firstReplace?.data.victimFrame).toBe(0);
    expect(firstReplace?.data.reason).toMatch(/cleared 3 reference bits/);
  });

  it('tracks the hand position as a frame flag', () => {
    for (const step of run.steps) {
      expect(step.data.frames.filter((frame) => frame.hand).length).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Edge cases                                                                  */
/* -------------------------------------------------------------------------- */

describe('edge cases', () => {
  it('one frame faults on every change of page', () => {
    const run = runPageReplacement({ algorithm: 'fifo', frameCount: 1, referenceString: [1, 2, 1, 2, 1] });
    expect(run.summary.faults).toBe(5);
    expect(run.summary.hits).toBe(0);
    expect(run.summary.replacements).toBe(4);
  });

  it('treats a repeated page as hits after the first fault', () => {
    const run = runPageReplacement({ algorithm: 'lru', frameCount: 2, referenceString: [7, 7, 7] });
    expect(run.summary.faults).toBe(1);
    expect(run.summary.hits).toBe(2);
  });

  it('faults once per distinct page when there are more frames than pages', () => {
    const run = runPageReplacement({ algorithm: 'lru', frameCount: 5, referenceString: [1, 2, 3, 1, 2, 3] });
    expect(run.summary.faults).toBe(3);
    expect(run.summary.replacements).toBe(0);
    expect(run.summary.hits).toBe(3);
  });

  it('faults once per page for an all-unique string', () => {
    const run = runPageReplacement({ algorithm: 'fifo', frameCount: 3, referenceString: [1, 2, 3, 4, 5] });
    expect(run.summary.faults).toBe(5);
    expect(run.summary.replacements).toBe(2);
  });

  it('accepts an empty reference string and reports zeroes', () => {
    const input: PageReplacementInput = { algorithm: 'fifo', frameCount: 3, referenceString: [] };
    expect(validatePageReplacementInput(input)).toEqual({ valid: true });
    const run = runPageReplacement(input);
    expect(run.steps.length).toBe(1);
    expect(run.summary.hits).toBe(0);
    expect(run.summary.faults).toBe(0);
    expect(run.summary.faultRate).toBe(0);
    expect(run.summary.hitRate).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

describe('validation', () => {
  it('accepts a well-formed input', () => {
    expect(validatePageReplacementInput(basic)).toEqual({ valid: true });
  });

  it('rejects an unknown algorithm', () => {
    expect(validatePageReplacementInput({ ...basic, algorithm: 'random' as never }).valid).toBe(false);
  });

  it('rejects frame counts outside the supported range', () => {
    expect(validatePageReplacementInput({ ...basic, frameCount: 0 }).valid).toBe(false);
    expect(validatePageReplacementInput({ ...basic, frameCount: 9 }).valid).toBe(false);
  });

  it('rejects too many references and out-of-range page numbers', () => {
    expect(
      validatePageReplacementInput({ ...basic, referenceString: Array.from({ length: 25 }, () => 1) }).valid,
    ).toBe(false);
    expect(validatePageReplacementInput({ ...basic, referenceString: [-1] }).valid).toBe(false);
    expect(validatePageReplacementInput({ ...basic, referenceString: [100] }).valid).toBe(false);
    expect(validatePageReplacementInput({ ...basic, referenceString: [1.5] }).valid).toBe(false);
  });

  it('throws when run with invalid input', () => {
    expect(() => runPageReplacement({ ...basic, frameCount: 99 })).toThrow(/invalid input/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Comparison & Bélády                                                         */
/* -------------------------------------------------------------------------- */

describe('comparison and Bélády’s anomaly', () => {
  it('compares every policy on the same string and frame count', () => {
    const outcomes = compareReplacement(basic.referenceString, 3);
    expect(outcomes.map((outcome) => outcome.algorithm)).toEqual(REPLACEMENT_ALGORITHMS);
    for (const outcome of outcomes) {
      expect(outcome.hits + outcome.faults).toBe(basic.referenceString.length);
    }
  });

  it('detects the FIFO anomaly on the classic string', () => {
    const curve = replacementCurve(BELADY_REFERENCE_STRING, 'fifo');
    expect(curve.anomaly).not.toBeNull();
    expect(curve.anomaly?.fromFrameCount).toBe(3);
    expect(curve.anomaly?.fromFaults).toBe(9);
    expect(curve.anomaly?.toFrameCount).toBe(4);
    expect(curve.anomaly?.toFaults).toBe(10);
  });

  it('shows LRU and OPT cannot exhibit the anomaly', () => {
    for (const curve of beladyComparison(BELADY_REFERENCE_STRING)) {
      if (curve.algorithm === 'fifo' || curve.algorithm === 'clock') continue;
      expect(curve.anomaly).toBeNull();
      for (let index = 1; index < curve.points.length; index += 1) {
        const previous = curve.points[index - 1]!;
        const current = curve.points[index]!;
        expect(current.faults).toBeLessThanOrEqual(previous.faults);
      }
    }
  });

  it('gives OPT the fewest faults at every frame count on the anomaly string', () => {
    const curves = beladyComparison(BELADY_REFERENCE_STRING);
    const optimal = curves.find((curve) => curve.algorithm === 'optimal')!;
    for (const curve of curves) {
      for (let index = 0; index < curve.points.length; index += 1) {
        expect(curve.points[index]!.faults).toBeGreaterThanOrEqual(optimal.points[index]!.faults);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Presets & challenges                                                        */
/* -------------------------------------------------------------------------- */

describe('presets and challenges', () => {
  it('runs every preset without error', () => {
    for (const item of PAGE_REPLACEMENT_PRESETS) {
      expect(runPageReplacement(item.input).steps.length).toBeGreaterThan(0);
    }
  });

  it('produces well-formed, deterministic challenges', () => {
    const challenges = buildPageReplacementChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(10);
    for (const challenge of challenges) {
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(new Set(challenge.options).size).toBe(challenge.options.length);
      expect(runPageReplacement(challenge.input).steps.length).toBeGreaterThan(0);
    }
    expect(buildPageReplacementChallenges().map((item) => item.correctIndex)).toEqual(
      challenges.map((item) => item.correctIndex),
    );
  });

  it('gets the numeric answers right', () => {
    const byId = new Map(buildPageReplacementChallenges().map((challenge) => [challenge.id, challenge]));
    const answer = (id: string): string | undefined => {
      const challenge = byId.get(id);
      return challenge ? challenge.options[challenge.correctIndex] : undefined;
    };
    expect(answer('repl-fifo-faults')).toBe('10');
    expect(answer('repl-optimal-faults')).toBe('7');
    expect(answer('repl-fifo-hits')).toBe('2');
    expect(answer('repl-one-frame-faults')).toBe('5');
    expect(answer('repl-many-frames-faults')).toBe('3');
    expect(answer('repl-best-policy')).toBe('Optimal (OPT)');
    expect(answer('repl-belady-fifo')).toMatch(/^No/);
    expect(answer('repl-lru-no-anomaly')).toMatch(/^Fewer or equal/);
  });
});
