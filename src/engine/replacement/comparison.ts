import type { ReplacementAlgorithm } from './types';
import { MAX_FRAMES, REPLACEMENT_ALGORITHMS } from './types';
import { runPageReplacement } from './replacement';

export interface ReplacementOutcome {
  readonly algorithm: ReplacementAlgorithm;
  readonly hits: number;
  readonly faults: number;
  readonly replacements: number;
  readonly hitRate: number;
  readonly faultRate: number;
}

/** Run every policy over the same string and frames, for side-by-side comparison. */
export function compareReplacement(
  referenceString: readonly number[],
  frameCount: number,
  algorithms: readonly ReplacementAlgorithm[] = REPLACEMENT_ALGORITHMS,
): readonly ReplacementOutcome[] {
  return algorithms.map((algorithm) => {
    const summary = runPageReplacement({ algorithm, frameCount, referenceString }).summary;
    return {
      algorithm,
      hits: summary.hits ?? 0,
      faults: summary.faults ?? 0,
      replacements: summary.replacements ?? 0,
      hitRate: summary.hitRate ?? 0,
      faultRate: summary.faultRate ?? 0,
    };
  });
}

export interface FaultPoint {
  readonly frameCount: number;
  readonly faults: number;
  readonly hits: number;
}

export interface BeladyAnomaly {
  /** Faults with the smaller frame count. */
  readonly fromFrameCount: number;
  readonly fromFaults: number;
  /** Faults with the larger frame count — more frames, more faults. */
  readonly toFrameCount: number;
  readonly toFaults: number;
}

export interface ReplacementCurve {
  readonly algorithm: ReplacementAlgorithm;
  readonly points: readonly FaultPoint[];
  /** The first frame-count increase that raised the fault count, if any. */
  readonly anomaly: BeladyAnomaly | null;
}

/** Fault count as the frame count grows from 1 to `maxFrames`. */
export function replacementCurve(
  referenceString: readonly number[],
  algorithm: ReplacementAlgorithm,
  maxFrames: number = MAX_FRAMES,
): ReplacementCurve {
  const points: FaultPoint[] = [];
  for (let frameCount = 1; frameCount <= maxFrames; frameCount += 1) {
    const summary = runPageReplacement({ algorithm, frameCount, referenceString }).summary;
    points.push({
      frameCount,
      faults: summary.faults ?? 0,
      hits: summary.hits ?? 0,
    });
  }
  return { algorithm, points, anomaly: firstAnomaly(points) };
}

function firstAnomaly(points: readonly FaultPoint[]): BeladyAnomaly | null {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (current.faults > previous.faults) {
      return {
        fromFrameCount: previous.frameCount,
        fromFaults: previous.faults,
        toFrameCount: current.frameCount,
        toFaults: current.faults,
      };
    }
  }
  return null;
}

/**
 * Frame-count curves for every policy.
 *
 * FIFO (and its Clock approximation) can see faults increase as frames are
 * added — Bélády's anomaly. LRU and OPT are stack algorithms and cannot, which
 * is what makes the comparison pedagogically useful.
 */
export function beladyComparison(
  referenceString: readonly number[],
  maxFrames: number = MAX_FRAMES,
): readonly ReplacementCurve[] {
  return REPLACEMENT_ALGORITHMS.map((algorithm) =>
    replacementCurve(referenceString, algorithm, maxFrames),
  );
}

/** The classic reference string that exhibits Bélády's anomaly under FIFO. */
export const BELADY_REFERENCE_STRING: readonly number[] = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
