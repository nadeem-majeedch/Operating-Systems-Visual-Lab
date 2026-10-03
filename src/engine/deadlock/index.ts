export {
  MAX_BANKER_PROCESSES,
  MAX_BANKER_RESOURCES,
  MAX_MATRIX_VALUE,
  MAX_RAG_INSTANCES,
  MAX_RAG_PROCESSES,
  MAX_RAG_RESOURCES,
  MIN_BANKER_PROCESSES,
  MIN_BANKER_RESOURCES,
  MIN_RAG_INSTANCES,
  MIN_RAG_PROCESSES,
  MIN_RAG_RESOURCES,
} from './types';
export type {
  BankersComparison,
  BankersInput,
  BankersPhase,
  BankersRequest,
  BankersRequestView,
  BankersRowState,
  BankersRowView,
  BankersStepData,
  DeadlockInput,
  DeadlockStepData,
  DeadlockTone,
  Matrix,
  MatrixInput,
  RagEdgeKind,
  RagEdgeView,
  RagInput,
  RagNodeKind,
  RagNodeView,
  RagStage,
  RagStepData,
} from './types';

export {
  cell,
  cloneMatrix,
  cloneVector,
  computeAvailable,
  findCycle,
  needMatrix,
  rowOf,
  runReduction,
  runSafety,
  sumOf,
  vectorAdd,
  vectorLessOrEqual,
  vectorSubtract,
} from './matrices';
export type { ProcessEdges, ReductionOutcome, SafetyIteration, SafetyOutcome } from './matrices';

export {
  BANKERS_ALGORITHM_ID,
  BANKERS_ENGINE_ID,
  BANKERS_LAB_ID,
  bankersEngine,
  bankersStepMetrics,
  runBankers,
  validateBankersInput,
} from './bankers';
export {
  RAG_ALGORITHM_ID,
  RAG_ENGINE_ID,
  RAG_LAB_ID,
  buildWaitForEdges,
  ragEngine,
  ragStepMetrics,
  runRag,
  validateRagInput,
} from './waitForGraph';

export { BANKERS_PRESETS, RAG_PRESETS } from './presets';
export type { DeadlockPreset } from './presets';

export {
  DEADLOCK_CHALLENGE_COUNT,
  buildDeadlockChallenges,
} from './challenges';
export type { DeadlockChallenge, DeadlockChallengeKind } from './challenges';

/** Stable ids of the implemented deadlock algorithms, in teaching order. */
export const DEADLOCK_ALGORITHM_IDS: readonly string[] = ['bankers-algorithm', 'wait-for-graph'];
