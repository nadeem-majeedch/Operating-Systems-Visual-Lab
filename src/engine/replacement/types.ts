/**
 * Types shared by the page-replacement simulation.
 *
 * A single engine serves four replacement policies over the same reference
 * string: **FIFO** evicts the longest-resident page, **LRU** the least recently
 * used, **Optimal** the page whose next use lies furthest in the future, and
 * **Second Chance (Clock)** approximates LRU with a reference bit and a sweeping
 * hand. Because the four share one input shape and one step shape, the same
 * workstation, comparison view and challenge panel can render any of them.
 */

export type ReplacementAlgorithm = 'fifo' | 'optimal' | 'lru' | 'clock';

/** What a single reference did to the frames. */
export type ReplacementEvent = 'init' | 'hit' | 'fault' | 'replace';

export interface PageReplacementInput {
  readonly algorithm: ReplacementAlgorithm;
  /** Number of physical frames the process may occupy. */
  readonly frameCount: number;
  /** Page numbers referenced in order (not byte addresses). */
  readonly referenceString: readonly number[];
}

export interface FrameSlotView {
  readonly frame: number;
  readonly page: number | null;
  /** The clock/second-chance reference bit. */
  readonly referenced: boolean;
  /** Reference index at which the page was last used (LRU recency). */
  readonly recency: number;
  /** Reference index at which the page was loaded (FIFO order). */
  readonly loadedAt: number;
  /** True when this frame was touched by the current reference. */
  readonly active: boolean;
  /** True when this frame lost a victim to the current reference. */
  readonly victim: boolean;
  /** True when the clock hand points at this frame. */
  readonly hand: boolean;
}

export interface PageReplacementStepData {
  readonly kind: 'page-replacement';
  readonly algorithm: ReplacementAlgorithm;
  readonly event: ReplacementEvent;
  /** Index of the reference being served, or -1 for the initial step. */
  readonly referenceIndex: number;
  readonly referenceCount: number;
  readonly references: readonly number[];
  /** The page number just referenced (-1 for the initial step). */
  readonly reference: number;
  readonly hit: boolean;
  readonly faulted: boolean;
  /** Frame the referenced page now occupies, or null before any reference. */
  readonly frameNumber: number | null;
  readonly victimPage: number | null;
  readonly victimFrame: number | null;
  readonly evicted: boolean;
  readonly frames: readonly FrameSlotView[];
  readonly frameCount: number;
  readonly hits: number;
  readonly faults: number;
  readonly replacements: number;
  /** 0..1, or 0 before the first reference. */
  readonly hitRate: number;
  /** 0..1, or 0 before the first reference. */
  readonly faultRate: number;
  /** The exact justification for the eviction (replacement steps only). */
  readonly reason: string;
  readonly summary: string;
}

export const REPLACEMENT_ALGORITHMS: readonly ReplacementAlgorithm[] = ['fifo', 'optimal', 'lru', 'clock'];

export const REPLACEMENT_ALGORITHM_LABELS: Readonly<Record<ReplacementAlgorithm, string>> = {
  fifo: 'FIFO',
  optimal: 'Optimal (OPT)',
  lru: 'LRU',
  clock: 'Second Chance (Clock)',
};

/** Content/registry algorithm ids, one per policy. */
export const REPLACEMENT_ALGORITHM_IDS: Readonly<Record<ReplacementAlgorithm, string>> = {
  fifo: 'fifo-page',
  optimal: 'optimal-page',
  lru: 'lru-page',
  clock: 'clock-page',
};

export const MIN_FRAMES = 1;
export const MAX_FRAMES = 8;
export const MIN_REFERENCES = 0;
export const MAX_REFERENCES = 24;
export const MIN_PAGE_NUMBER = 0;
export const MAX_PAGE_NUMBER = 99;
/** Hard cap on produced steps, well above anything the editor can build. */
export const MAX_REPLACEMENT_STEPS = 200;

export const PAGE_REPLACEMENT_ENGINE_ID = 'page-replacement-engine';
export const PAGE_REPLACEMENT_LAB_ID = 'lab-page-replacement';
