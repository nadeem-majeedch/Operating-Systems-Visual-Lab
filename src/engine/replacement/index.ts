export {
  MAX_FRAMES,
  MAX_PAGE_NUMBER,
  MAX_REFERENCES,
  MAX_REPLACEMENT_STEPS,
  MIN_FRAMES,
  MIN_PAGE_NUMBER,
  MIN_REFERENCES,
  PAGE_REPLACEMENT_ENGINE_ID,
  PAGE_REPLACEMENT_LAB_ID,
  REPLACEMENT_ALGORITHMS,
  REPLACEMENT_ALGORITHM_IDS,
  REPLACEMENT_ALGORITHM_LABELS,
} from './types';
export type {
  FrameSlotView,
  PageReplacementInput,
  PageReplacementStepData,
  ReplacementAlgorithm,
  ReplacementEvent,
} from './types';

export {
  PAGE_REPLACEMENT_ALGORITHM_ID,
  pageReplacementEngine,
  pageReplacementStepMetrics,
  runPageReplacement,
  validatePageReplacementInput,
} from './replacement';

export {
  BELADY_REFERENCE_STRING,
  beladyComparison,
  compareReplacement,
  replacementCurve,
} from './comparison';
export type { BeladyAnomaly, FaultPoint, ReplacementCurve, ReplacementOutcome } from './comparison';

export { PAGE_REPLACEMENT_PRESETS, findPageReplacementPreset } from './presets';
export type { PageReplacementPreset } from './presets';

export {
  PAGE_REPLACEMENT_ALGORITHM_LIST,
  PAGE_REPLACEMENT_CHALLENGE_COUNT,
  PAGE_REPLACEMENT_PRESET_IDS,
  buildPageReplacementChallenges,
} from './challenges';
export type { PageReplacementChallenge, PageReplacementChallengeKind } from './challenges';
