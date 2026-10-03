/** Types shared by every synchronization simulation. */

export type SyncKind = 'race' | 'producer-consumer' | 'philosophers' | 'readers-writers';

export type SyncTone = 'default' | 'positive' | 'warning' | 'danger';

/** One actor (process/thread) as the visualisation sees it. */
export interface SyncActorView {
  readonly name: string;
  /** Machine token, e.g. `running`, `blocked`. */
  readonly state: string;
  /** Human-readable label for the state. */
  readonly status: string;
  /** What the actor is doing right now, e.g. `LOAD counter`. */
  readonly detail?: string;
  readonly tone?: SyncTone;
}

/** A shared counter, lock or semaphore the visualisation shows. */
export interface SyncResourceView {
  readonly name: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone?: SyncTone;
}

/** Fields common to every synchronization step snapshot. */
export interface SyncStepCommon {
  readonly kind: SyncKind;
  readonly clock: number;
  /** Actor that acted in this step, if any. */
  readonly activeActor: string | null;
  readonly actors: readonly SyncActorView[];
  readonly resources: readonly SyncResourceView[];
  /** One-line summary of the current machine state. */
  readonly summary: string;
  /** Still on track to produce the correct result. */
  readonly correct: boolean;
  readonly deadlocked: boolean;
}

/* -------------------------------------------------------------------------- */
/* Race conditions                                                            */
/* -------------------------------------------------------------------------- */

export type RaceMode = 'unsafe' | 'mutex' | 'semaphore';

export interface RaceRegisterView {
  readonly name: string;
  readonly value: number | null;
}

export interface RaceStepData extends SyncStepCommon {
  readonly kind: 'race';
  readonly mode: RaceMode;
  readonly counter: number;
  readonly expected: number;
  readonly registers: readonly RaceRegisterView[];
  readonly criticalSectionOwner: string | null;
  readonly lostUpdates: number;
}

/* -------------------------------------------------------------------------- */
/* Producer / consumer                                                        */
/* -------------------------------------------------------------------------- */

export interface ProducerConsumerStepData extends SyncStepCommon {
  readonly kind: 'producer-consumer';
  readonly buffer: readonly (string | null)[];
  readonly capacity: number;
  readonly produced: number;
  readonly consumed: number;
}

/* -------------------------------------------------------------------------- */
/* Dining philosophers                                                        */
/* -------------------------------------------------------------------------- */

export type PhilosopherState = 'thinking' | 'hungry' | 'eating' | 'waiting' | 'done';
export type PhilosophersStrategy = 'naive' | 'ordered' | 'limited';

export interface PhilosopherView {
  readonly name: string;
  readonly state: PhilosopherState;
  readonly holds: readonly string[];
}

export interface ForkView {
  readonly id: string;
  readonly holder: string | null;
}

export interface PhilosophersStepData extends SyncStepCommon {
  readonly kind: 'philosophers';
  readonly philosophers: readonly PhilosopherView[];
  readonly forks: readonly ForkView[];
  readonly meals: number;
  readonly strategy: PhilosophersStrategy;
}

/* -------------------------------------------------------------------------- */
/* Readers / writers                                                          */
/* -------------------------------------------------------------------------- */

export interface ReadersWritersStepData extends SyncStepCommon {
  readonly kind: 'readers-writers';
  readonly readers: number;
  readonly writer: string | null;
  readonly readCount: number;
  readonly readersWaiting: number;
  readonly writersWaiting: number;
}

export type SyncStepData =
  | RaceStepData
  | ProducerConsumerStepData
  | PhilosophersStepData
  | ReadersWritersStepData;

/* -------------------------------------------------------------------------- */
/* Inputs                                                                     */
/* -------------------------------------------------------------------------- */

export interface RaceInput {
  readonly mode: RaceMode;
  /** Increments each process performs. */
  readonly iterations: number;
  /** Number of processes racing on the shared counter. */
  readonly processCount: number;
}

export interface ProducerConsumerInput {
  readonly capacity: number;
  readonly producers: number;
  readonly consumers: number;
  /** Items each producer tries to place. */
  readonly itemsPerProducer: number;
  /** Items each consumer tries to take. */
  readonly itemsPerConsumer: number;
}

export interface PhilosophersInput {
  readonly philosophers: number;
  /** Meals each philosopher attempts. */
  readonly meals: number;
  readonly strategy: PhilosophersStrategy;
}

export interface ReadersWritersInput {
  readonly readers: number;
  readonly writers: number;
  /** Reads each reader performs. */
  readonly reads: number;
  /** Writes each writer performs. */
  readonly writes: number;
}

export type SynchronizationInput =
  | RaceInput
  | ProducerConsumerInput
  | PhilosophersInput
  | ReadersWritersInput;

/* -------------------------------------------------------------------------- */
/* Bounds                                                                     */
/* -------------------------------------------------------------------------- */

export const MIN_RACE_PROCESSES = 2;
export const MAX_RACE_PROCESSES = 4;
export const DEFAULT_RACE_ITERATIONS = 2;
export const MIN_RACE_ITERATIONS = 1;
export const MAX_RACE_ITERATIONS = 4;

export const MIN_BUFFER_CAPACITY = 1;
export const MAX_BUFFER_CAPACITY = 6;
export const MIN_ACTORS = 1;
export const MAX_ACTORS = 3;
export const MIN_ITEMS = 1;
export const MAX_ITEMS = 6;

export const MIN_PHILOSOPHERS = 3;
export const MAX_PHILOSOPHERS = 5;
export const MIN_MEALS = 1;
export const MAX_MEALS = 3;

export const MIN_READERS = 1;
export const MAX_READERS = 3;
export const MIN_WRITERS = 1;
export const MAX_WRITERS = 2;
export const MIN_OPS = 1;
export const MAX_OPS = 3;

/** Hard cap on how many steps a single run may produce. */
export const MAX_SYNC_STEPS = 400;
