/**
 * Types shared by the disk-scheduling simulation.
 *
 * The disk is modelled as a flat cylinder range `0 .. diskSize - 1`. A request
 * queue names cylinders to visit, the head starts somewhere on the range, and a
 * policy decides the order in which the requests are served. Every policy is
 * expressed as a sequence of head movements, so one step shape drives the axis,
 * the seek chart, the metrics and the explanations.
 */

export type DiskAlgorithm = 'fcfs' | 'sstf' | 'scan' | 'c-scan' | 'look' | 'c-look';

/** The sweep direction; only the directional policies actually read it. */
export type DiskDirection = 'up' | 'down';

/** What a head movement accomplished. */
export type DiskEvent =
  /** The starting position, before any movement. */
  | 'init'
  /** The head reached a pending request and serviced it. */
  | 'service'
  /** The head travelled to the physical edge of the disk without servicing. */
  | 'turn'
  /** The head jumped back to the start (or first pending request) without servicing. */
  | 'wrap';

export interface DiskInput {
  readonly algorithm: DiskAlgorithm;
  /** Number of cylinders; valid positions are `0 .. diskSize - 1`. */
  readonly diskSize: number;
  /** Cylinder the head starts on. */
  readonly head: number;
  /** Requested cylinders, in queue (arrival) order. */
  readonly requests: readonly number[];
  /** Initial sweep direction, used by SCAN, C-SCAN, LOOK and C-LOOK. */
  readonly direction: DiskDirection;
}

export interface DiskStepData {
  readonly kind: 'disk';
  readonly algorithm: DiskAlgorithm;
  readonly event: DiskEvent;
  readonly diskSize: number;
  /** Head position after this movement. */
  readonly head: number;
  /** Head position before this movement. */
  readonly previousHead: number;
  /** The sweep direction after this movement. */
  readonly direction: DiskDirection;
  /** Cylinder serviced by this movement, or null for a turn or wrap. */
  readonly servedCylinder: number | null;
  /** Cylinders serviced so far, in service order. */
  readonly servicedOrder: readonly number[];
  /** Requests still waiting, in queue order. */
  readonly pending: readonly number[];
  /** The original queue, in arrival order. */
  readonly queue: readonly number[];
  /** Distance travelled by this movement. */
  readonly movement: number;
  /** Cumulative distance travelled. */
  readonly totalMovement: number;
  /** Number of requests serviced so far. */
  readonly servicedCount: number;
  readonly requestCount: number;
  /** totalMovement ÷ servicedCount, or 0 before the first service. */
  readonly averageSeek: number;
  /** Largest single hop so far — a measure of worst-case latency. */
  readonly worstSeek: number;
  readonly summary: string;
  /** One-sentence justification for this movement. */
  readonly reason: string;
}

export const DISK_ALGORITHMS: readonly DiskAlgorithm[] = [
  'fcfs',
  'sstf',
  'scan',
  'c-scan',
  'look',
  'c-look',
];

export const DISK_ALGORITHM_LABELS: Readonly<Record<DiskAlgorithm, string>> = {
  fcfs: 'FCFS',
  sstf: 'SSTF',
  scan: 'SCAN',
  'c-scan': 'C-SCAN',
  look: 'LOOK',
  'c-look': 'C-LOOK',
};

export const DISK_ALGORITHM_ABBREVIATIONS: Readonly<Record<DiskAlgorithm, string>> = {
  fcfs: 'FCFS',
  sstf: 'SSTF',
  scan: 'SCAN',
  'c-scan': 'C-SCAN',
  look: 'LOOK',
  'c-look': 'C-LOOK',
};

/** Content/registry algorithm ids, one per policy. */
export const DISK_ALGORITHM_IDS: Readonly<Record<DiskAlgorithm, string>> = {
  fcfs: 'fcfs-disk',
  sstf: 'sstf',
  scan: 'scan',
  'c-scan': 'c-scan',
  look: 'look',
  'c-look': 'c-look',
};

/** Policies that read the initial direction. */
export const DIRECTIONAL_ALGORITHMS: readonly DiskAlgorithm[] = ['scan', 'c-scan', 'look', 'c-look'];

export const DISK_DIRECTIONS: readonly DiskDirection[] = ['up', 'down'];

export const DISK_DIRECTION_LABELS: Readonly<Record<DiskDirection, string>> = {
  up: 'Up · toward the highest cylinder',
  down: 'Down · toward cylinder 0',
};

export const MIN_DISK_SIZE = 16;
export const MAX_DISK_SIZE = 1000;
export const MIN_REQUESTS = 1;
export const MAX_REQUESTS = 24;
/** Hard cap on produced steps, well above anything the editor can build. */
export const MAX_DISK_STEPS = 200;

export const DISK_ENGINE_ID = 'disk-scheduling-engine';
export const DISK_LAB_ID = 'lab-disk-scheduling';
