export {
  MAX_ADDRESS_BITS,
  MAX_ADDRESS_VALUE,
  MAX_PAGE_SIZE,
  MAX_PAGING_STEPS,
  MAX_REFERENCES,
  MAX_TLB_SIZE,
  MIN_ADDRESS_BITS,
  MIN_PAGE_SIZE,
  MIN_REFERENCES,
  MIN_TLB_SIZE,
  PAGE_SIZES,
  TLB_POLICIES,
  TLB_POLICY_LABELS,
} from './types';
export type {
  FrameView,
  PageTableEntryView,
  PagingEvent,
  PagingInput,
  PagingStepData,
  TlbEntryView,
  TlbOutcome,
  TlbPolicy,
} from './types';

export {
  composePhysical,
  decomposeAddress,
  formatBinary,
  formatHex,
  frameCountFor,
  isPowerOfTwo,
  log2Int,
  maskBits,
  offsetBitsFor,
  pageCountFor,
  pagingGeometry,
} from './address';
export type { AddressParts, PagingGeometry } from './address';

export {
  PAGING_ALGORITHM_ID,
  PAGING_ENGINE_ID,
  PAGING_LAB_ID,
  pagingEngine,
  pagingStepMetrics,
  runPaging,
  validatePagingInput,
} from './translation';

export { PAGING_PRESETS, findPagingPreset } from './presets';
export type { PagingPreset } from './presets';

export { PAGING_CHALLENGE_COUNT, PAGING_PRESET_IDS, buildPagingChallenges } from './challenges';
export type { PagingChallenge, PagingChallengeKind } from './challenges';
