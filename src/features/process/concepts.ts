export interface ProcessConcept {
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

/** Concept text shown above the process-lifecycle simulator. */
export const PROCESS_LIFECYCLE_CONCEPT: ProcessConcept = {
  paragraphs: [
    'A process is a program in execution: the code, its current activity and everything the kernel must remember to pause and resume it. The kernel tracks each one with a process control block (PCB), and the PCB’s state field is the single most important fact about a process.',
    'A process is always in exactly one of five states. It is created in new, becomes runnable when it is admitted to ready, runs when the scheduler dispatches it, waits when it blocks on an event such as I/O, and ends in terminated. Only the edges of the state machine are legal — there is no way to run a process that has not first been made ready.',
    'Switching the CPU from one process to another is a context switch: the kernel saves the outgoing process’s registers and program counter into its PCB and restores the incoming process’s. That bookkeeping is pure overhead, which is why schedulers weigh the benefit of preempting a process against the cost of the switch.',
  ],
  keyPoints: [
    'Five states: new, ready, running, waiting, terminated.',
    'Only one process is running at a time on a single CPU.',
    'The scheduler owns ready → running; the process owns running → waiting and running → terminated.',
    'Waiting → ready is the kernel noticing an event completed, not the process asking to run.',
    'Every transition updates the PCB; a CPU handover is a context switch.',
  ],
};
