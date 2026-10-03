import type { Id } from '@/types';

/* -------------------------------------------------------------------------- */
/* States and transitions                                                     */
/* -------------------------------------------------------------------------- */

/** The five process states of the classic model. */
export type ProcessState = 'new' | 'ready' | 'running' | 'waiting' | 'terminated';

/** A legal edge of the process state machine. */
export type ProcessTransition =
  | 'admit'
  | 'dispatch'
  | 'preempt'
  | 'block'
  | 'unblock'
  | 'terminate';

/* -------------------------------------------------------------------------- */
/* The process control block and the system                                   */
/* -------------------------------------------------------------------------- */

/**
 * Everything the kernel must remember about one process.
 *
 * A PCB is the unit of context switching: saving and restoring these fields is
 * exactly what a context switch does.
 */
export interface ProcessControlBlock {
  readonly pid: number;
  /** Display name, e.g. `P1`. Unique within a run. */
  readonly name: string;
  /** Creator of this process, or `null` for the initial/root process. */
  readonly parentPid: number | null;
  readonly state: ProcessState;
  /** Lower number = higher priority; the scheduler prefers small values. */
  readonly priority: number;
  /** Clock value at which the process was created. */
  readonly creationTime: number;
  /** Total CPU time the process has actually consumed. */
  readonly cpuTime: number;
  /** Total time spent ready or waiting (i.e. runnable but not on the CPU). */
  readonly waitingTime: number;
  /** Planned CPU burst; used by the tick action to auto-complete a process. */
  readonly burstTime: number;
  /** CPU time still to run before the burst finishes. */
  readonly remainingTime: number;
  /** Clock value at which the process terminated, or `null`. */
  readonly completionTime: number | null;
}

/**
 * The whole simulated system: every PCB plus the bookkeeping the kernel keeps
 * about the CPU.
 */
export interface ProcessSystem {
  /** Logical time, advanced one unit per tick. */
  readonly clock: number;
  readonly processes: readonly ProcessControlBlock[];
  /** Next PID the kernel will hand out. PIDs are never reused. */
  readonly nextPid: number;
  /** How many times the CPU has changed hands between processes. */
  readonly contextSwitches: number;
  /**
   * The most recent process that occupied the CPU. Kept so a later dispatch can
   * tell whether it is a genuine context switch or just a first dispatch.
   */
  readonly lastRunningPid: number | null;
  /** Monotonic counter used to label events deterministically. */
  readonly sequence: number;
}

/* -------------------------------------------------------------------------- */
/* Actions and events                                                         */
/* -------------------------------------------------------------------------- */

/** Something the learner can ask the kernel to do. */
export type ProcessAction =
  | {
      readonly kind: 'create';
      readonly name?: string;
      readonly priority?: number;
      readonly burstTime?: number;
      readonly parentPid?: number | null;
    }
  | { readonly kind: 'admit'; readonly pid: number }
  | { readonly kind: 'dispatch'; readonly pid: number }
  | { readonly kind: 'preempt'; readonly pid: number }
  | { readonly kind: 'block'; readonly pid: number }
  | { readonly kind: 'unblock'; readonly pid: number }
  | { readonly kind: 'terminate'; readonly pid: number }
  | { readonly kind: 'tick'; readonly units?: number }
  | { readonly kind: 'schedule' }
  | { readonly kind: 'reset' };

/** Every kind of record the event log can show. */
export type ProcessEventKind =
  | 'create'
  | 'admit'
  | 'dispatch'
  | 'preempt'
  | 'block'
  | 'unblock'
  | 'terminate'
  | 'tick'
  | 'schedule'
  | 'reset'
  | 'initial';

/** One recorded thing that happened, with the reason it happened. */
export interface ProcessEvent {
  readonly id: Id;
  /** Position in the run’s event list. */
  readonly index: number;
  readonly clock: number;
  readonly kind: ProcessEventKind;
  /** The edge that was traversed, when the event is a state transition. */
  readonly transition: ProcessTransition | null;
  readonly label: string;
  readonly description: string;
  readonly explanation: string;
  /** The process the event is about, when there is one. */
  readonly pid: number | null;
  readonly fromState: ProcessState | null;
  readonly toState: ProcessState | null;
  /** Names or PIDs the visualisation should emphasise. */
  readonly highlights: readonly string[];
  /** True when this event moved the CPU from one process to another. */
  readonly contextSwitch: boolean;
}

/** Result of applying one action: the new system, plus the event it produced. */
export type ProcessOutcome =
  | { readonly ok: true; readonly system: ProcessSystem; readonly event: ProcessEvent }
  | { readonly ok: false; readonly system: ProcessSystem; readonly error: string };

/* -------------------------------------------------------------------------- */
/* Simulation step data and authored input                                    */
/* -------------------------------------------------------------------------- */

/** The per-step snapshot the state-machine visualisation renders. */
export interface ProcessStepData {
  readonly processes: readonly ProcessControlBlock[];
  readonly clock: number;
  readonly runningPid: number | null;
  readonly contextSwitches: number;
  readonly transition: ProcessTransition | null;
  readonly fromState: ProcessState | null;
  readonly toState: ProcessState | null;
  readonly contextSwitch: boolean;
}

/** One process in an authored scenario. */
export interface ProcessSeed {
  readonly name: string;
  readonly priority?: number;
  /** Planned CPU burst; defaults to {@link DEFAULT_BURST}. */
  readonly burstTime?: number;
  /** Name of the seeding process that created this one. */
  readonly parent?: string;
  /** Initial state; defaults to `new`. */
  readonly state?: ProcessState;
}

/**
 * A scripted action, addressed by process *name* rather than by PID so
 * scenarios stay readable and independent of PID assignment.
 */
export type ProcessScriptStep =
  | {
      readonly action: 'create';
      readonly name: string;
      readonly priority?: number;
      readonly burstTime?: number;
      readonly parent?: string;
    }
  | {
      readonly action: 'admit' | 'dispatch' | 'preempt' | 'block' | 'unblock' | 'terminate';
      readonly name: string;
    }
  | { readonly action: 'tick'; readonly units?: number }
  | { readonly action: 'schedule' };

/** Authored input for the process-lifecycle engine. */
export interface ProcessLifecycleInput {
  readonly seeds: readonly ProcessSeed[];
  /** Optional deterministic script replayed by `run()`. */
  readonly script?: readonly ProcessScriptStep[];
}

export const DEFAULT_PRIORITY = 5;
export const DEFAULT_BURST = 4;
export const MAX_PRIORITY = 10;
export const MIN_PRIORITY = 0;
export const MAX_SEEDS = 12;
