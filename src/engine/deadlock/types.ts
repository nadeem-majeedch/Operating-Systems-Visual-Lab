/**
 * Types shared by the deadlock simulations.
 *
 * Two engines live here. The banker's algorithm works on four vectors per
 * process — allocation, maximum and the derived need — plus a global available
 * vector. The resource-allocation graph engine builds nodes and edges and then
 * either collapses them into a wait-for graph (single-instance resources) or
 * runs the reduction algorithm (multiple instances).
 *
 * Everything is plain data so the engines stay pure and the visualisations stay
 * dumb: an engine hands the UI a fully-described snapshot, never a mutable
 * model.
 */

export type DeadlockTone = 'default' | 'positive' | 'warning' | 'danger';

/** A rectangular matrix, indexed `[process][resource]`. */
export type Matrix = readonly (readonly number[])[];

/* -------------------------------------------------------------------------- */
/* Banker's algorithm                                                         */
/* -------------------------------------------------------------------------- */

export interface MatrixInput {
  readonly processes: readonly string[];
  readonly resources: readonly string[];
  /** Resources currently held by each process. */
  readonly allocation: Matrix;
  /** The maximum each process may ever need. */
  readonly max: Matrix;
  /** Resources currently free. */
  readonly available: readonly number[];
}

export interface BankersRequest {
  /** Index of the requesting process. */
  readonly process: number;
  /** One entry per resource. */
  readonly resources: readonly number[];
}

export interface BankersInput extends MatrixInput {
  /** Optional request to evaluate before the plain safety check. */
  readonly request?: BankersRequest;
}

export type BankersPhase = 'need' | 'request' | 'safety' | 'verdict';

export type BankersRowState = 'idle' | 'checking' | 'fits' | 'blocked' | 'finished';

export interface BankersRowView {
  readonly name: string;
  readonly allocation: readonly number[];
  readonly max: readonly number[];
  readonly need: readonly number[];
  readonly state: BankersRowState;
  readonly finished: boolean;
}

/** One cell the explanation is pointing at, plus whether it passed its test. */
export interface BankersComparison {
  readonly row: number;
  readonly resource: number;
  readonly ok: boolean;
}

export interface BankersRequestView {
  readonly process: string;
  readonly resources: readonly number[];
  readonly withinNeed: boolean | null;
  readonly withinAvailable: boolean | null;
  readonly status: 'pending' | 'rejected' | 'must-wait' | 'granted' | 'deferred';
}

export interface BankersStepData {
  readonly kind: 'bankers';
  readonly phase: BankersPhase;
  readonly summary: string;
  readonly processes: readonly string[];
  readonly resources: readonly string[];
  readonly rows: readonly BankersRowView[];
  readonly available: readonly number[];
  readonly work: readonly number[];
  readonly finished: readonly boolean[];
  readonly safeSequence: readonly string[];
  readonly activeProcess: number | null;
  readonly activeResource: number | null;
  readonly comparisons: readonly BankersComparison[];
  readonly request: BankersRequestView | null;
  /** `null` while the safety check has not produced a verdict yet. */
  readonly safe: boolean | null;
  readonly tone: DeadlockTone;
}

/* -------------------------------------------------------------------------- */
/* Resource-allocation graph                                                  */
/* -------------------------------------------------------------------------- */

export type RagNodeKind = 'process' | 'resource';
export type RagEdgeKind = 'allocation' | 'request' | 'wait';

export interface RagNodeView {
  readonly id: string;
  readonly name: string;
  readonly kind: RagNodeKind;
  /** Resource nodes only: how many instances the type owns. */
  readonly instances?: number;
  /** Resource nodes only: how many instances are currently free. */
  readonly free?: number;
  readonly tone?: DeadlockTone;
}

export interface RagEdgeView {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: RagEdgeKind;
  readonly label: string;
  readonly highlight: boolean;
  readonly cycle: boolean;
}

export type RagStage = 'nodes' | 'allocations' | 'requests' | 'collapse' | 'detect' | 'verdict';

export interface RagStepData {
  readonly kind: 'rag';
  readonly stage: RagStage;
  readonly summary: string;
  readonly nodes: readonly RagNodeView[];
  readonly edges: readonly RagEdgeView[];
  /** Collapsed process→process edges (single-instance resources only). */
  readonly waitForEdges: readonly RagEdgeView[];
  /** Process node ids that form a cycle, in order. */
  readonly cycle: readonly string[];
  readonly deadlocked: boolean | null;
  readonly singleInstance: boolean;
  /** Reduction bookkeeping, multi-instance resources only. */
  readonly work: readonly number[];
  readonly finished: readonly boolean[];
  readonly available: readonly number[];
  readonly finishedOrder: readonly string[];
  readonly tone: DeadlockTone;
}

export interface RagInput {
  readonly processes: readonly string[];
  readonly resources: readonly string[];
  /** One entry per resource: how many identical units the type owns. */
  readonly instances: readonly number[];
  /** Units currently held, `[process][resource]`. */
  readonly allocation: Matrix;
  /** Outstanding units requested but not yet granted, `[process][resource]`. */
  readonly requests: Matrix;
}

export type DeadlockInput = BankersInput | RagInput;

export type DeadlockStepData = BankersStepData | RagStepData;

/* -------------------------------------------------------------------------- */
/* Bounds                                                                     */
/* -------------------------------------------------------------------------- */

export const MIN_BANKER_PROCESSES = 1;
export const MAX_BANKER_PROCESSES = 6;
export const MIN_BANKER_RESOURCES = 1;
export const MAX_BANKER_RESOURCES = 4;
/** Largest value accepted in any single matrix cell or instance count. */
export const MAX_MATRIX_VALUE = 20;

export const MIN_RAG_PROCESSES = 1;
export const MAX_RAG_PROCESSES = 6;
export const MIN_RAG_RESOURCES = 1;
export const MAX_RAG_RESOURCES = 4;
export const MIN_RAG_INSTANCES = 1;
export const MAX_RAG_INSTANCES = 3;
