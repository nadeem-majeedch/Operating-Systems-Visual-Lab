import type { ProcessState, ProcessTransition } from './types';

/**
 * The five process states, in the order a process visits them.
 *
 * These are the canonical states from the textbook model: a process is always
 * in exactly one of them, and only the transitions declared below are legal.
 */
export const PROCESS_STATES: readonly ProcessState[] = [
  'new',
  'ready',
  'running',
  'waiting',
  'terminated',
];

export interface ProcessStateInfo {
  readonly label: string;
  /** One-sentence explanation of what the state means. */
  readonly description: string;
}

export const PROCESS_STATE_INFO: Record<ProcessState, ProcessStateInfo> = {
  new: {
    label: 'New',
    description:
      'Being created. The kernel allocates a PCB and reserves the resources the process needs, but it is not yet competing for the CPU.',
  },
  ready: {
    label: 'Ready',
    description:
      'Runnable and waiting in the ready queue. It needs only a dispatch decision to start running.',
  },
  running: {
    label: 'Running',
    description:
      'Executing on the CPU. With a single processor exactly one process can be in this state at a time.',
  },
  waiting: {
    label: 'Waiting',
    description:
      'Blocked on an event such as I/O completion or a semaphore. It cannot run until that event happens.',
  },
  terminated: {
    label: 'Terminated',
    description:
      'Finished or aborted. Its PCB survives until the parent reaps it, which is why zombie processes exist.',
  },
};

/** A single legal edge of the process state machine. */
export interface TransitionRule {
  readonly transition: ProcessTransition;
  readonly from: ProcessState;
  readonly to: ProcessState;
  /** Imperative label for the button that triggers it, e.g. `Admit`. */
  readonly verb: string;
  /** Short label drawn on the state-machine edge, e.g. `admit`. */
  readonly edgeLabel: string;
  /** What just happened, in one sentence. */
  readonly description: string;
  /** The teaching note: why the transition exists and what it costs. */
  readonly explanation: string;
}

/**
 * Every legal transition, and nothing else.
 *
 * Two facts matter for correctness and are asserted in the engine tests:
 * 1. `running` has exactly three exits — ready (preempt), waiting (block),
 *    terminated (exit).
 * 2. There is no direct `new → running` or `waiting → running` edge; a process
 *    must pass through `ready` and be dispatched.
 */
export const TRANSITION_RULES: Record<ProcessTransition, TransitionRule> = {
  admit: {
    transition: 'admit',
    from: 'new',
    to: 'ready',
    verb: 'Admit',
    edgeLabel: 'admit',
    description: 'The process is admitted to the ready queue.',
    explanation:
      'Admission (new → ready) happens once the kernel has built the PCB and granted the process the resources it needs. The process is now runnable and competes with every other ready process for the CPU.',
  },
  dispatch: {
    transition: 'dispatch',
    from: 'ready',
    to: 'running',
    verb: 'Dispatch',
    edgeLabel: 'dispatch',
    description: 'The scheduler gives the process the CPU.',
    explanation:
      'Dispatch (ready → running) is the scheduler’s decision. The CPU reloads the saved context — program counter, registers and stack pointer — from the PCB and begins executing the process. A single CPU runs one process at a time.',
  },
  preempt: {
    transition: 'preempt',
    from: 'running',
    to: 'ready',
    verb: 'Preempt',
    edgeLabel: 'preempt',
    description: 'A time slice expires or a higher-priority process arrives.',
    explanation:
      'Preemption (running → ready) is what makes a scheduler preemptive. The kernel saves the running process’s context into its PCB so the process can resume exactly where it stopped, then picks another candidate. Saving and restoring is a context switch.',
  },
  block: {
    transition: 'block',
    from: 'running',
    to: 'waiting',
    verb: 'Block on I/O',
    edgeLabel: 'block',
    description: 'The process requests an event it must wait for.',
    explanation:
      'A running process that issues a blocking system call — reading a disk, waiting on a semaphore — moves to waiting (running → waiting). It cannot run again until the event completes, so the CPU is immediately available to other work.',
  },
  unblock: {
    transition: 'unblock',
    from: 'waiting',
    to: 'ready',
    verb: 'Complete I/O',
    edgeLabel: 'unblock',
    description: 'The awaited event completes.',
    explanation:
      'When the I/O or signal the process was waiting for finishes, the kernel moves it from waiting to ready. It is runnable again, but it must still be chosen by the scheduler before it runs.',
  },
  terminate: {
    transition: 'terminate',
    from: 'running',
    to: 'terminated',
    verb: 'Terminate',
    edgeLabel: 'terminate',
    description: 'The process exits and its resources are released.',
    explanation:
      'Termination (running → terminated) is the final transition. The process exits normally or is killed, the kernel records its exit status and releases its memory and open files. The PCB is kept until the parent collects the status.',
  },
};

/** The transitions available from a state, in a stable display order. */
const ORDER: readonly ProcessTransition[] = [
  'admit',
  'dispatch',
  'preempt',
  'block',
  'unblock',
  'terminate',
];

export function transitionRules(): readonly TransitionRule[] {
  return ORDER.map((transition) => TRANSITION_RULES[transition]);
}
