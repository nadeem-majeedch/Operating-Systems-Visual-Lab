import { clamp } from '@/utils';
import { PROCESS_STATES } from './states';
import type {
  ProcessControlBlock,
  ProcessLifecycleInput,
  ProcessSeed,
  ProcessState,
  ProcessSystem,
} from './types';
import { DEFAULT_BURST, DEFAULT_PRIORITY, MAX_PRIORITY, MIN_PRIORITY } from './types';

/** A brand-new, empty system: no processes, clock at zero. */
export function createSystem(): ProcessSystem {
  return {
    clock: 0,
    processes: [],
    nextPid: 1,
    contextSwitches: 0,
    lastRunningPid: null,
    sequence: 0,
  };
}

export interface CreatePcbOptions {
  readonly pid: number;
  readonly name: string;
  readonly parentPid?: number | null;
  readonly state?: ProcessState;
  readonly priority?: number;
  readonly burstTime?: number;
  readonly creationTime?: number;
}

/** Build a PCB with every field defaulted, so no caller has to guess. */
export function createPcb({
  pid,
  name,
  parentPid = null,
  state = 'new',
  priority = DEFAULT_PRIORITY,
  burstTime = DEFAULT_BURST,
  creationTime = 0,
}: CreatePcbOptions): ProcessControlBlock {
  const safeBurst = Math.max(1, Math.trunc(burstTime));
  return {
    pid,
    name,
    parentPid,
    state,
    priority: clamp(Math.trunc(priority), MIN_PRIORITY, MAX_PRIORITY),
    creationTime,
    cpuTime: 0,
    waitingTime: 0,
    burstTime: safeBurst,
    remainingTime: safeBurst,
    completionTime: null,
  };
}

export function findProcess(system: ProcessSystem, pid: number): ProcessControlBlock | undefined {
  return system.processes.find((process) => process.pid === pid);
}

export function findProcessByName(
  system: ProcessSystem,
  name: string,
): ProcessControlBlock | undefined {
  return system.processes.find((process) => process.name === name);
}

/** The process currently on the CPU, or `undefined` when the CPU is idle. */
export function runningProcess(system: ProcessSystem): ProcessControlBlock | undefined {
  return system.processes.find((process) => process.state === 'running');
}

export function runningPid(system: ProcessSystem): number | null {
  return runningProcess(system)?.pid ?? null;
}

/** Replace one process, leaving the rest of the system untouched. */
export function updateProcess(
  system: ProcessSystem,
  pid: number,
  patch: Partial<ProcessControlBlock>,
): ProcessSystem {
  return {
    ...system,
    processes: system.processes.map((process) =>
      process.pid === pid ? { ...process, ...patch } : process,
    ),
  };
}

/** Append a process and advance the PID counter. */
export function addProcess(
  system: ProcessSystem,
  pcb: ProcessControlBlock,
): ProcessSystem {
  return { ...system, processes: [...system.processes, pcb], nextPid: pcb.pid + 1 };
}

/** Return a name guaranteed not to collide with an existing process. */
export function uniqueName(system: ProcessSystem, base: string): string {
  const taken = new Set(system.processes.map((process) => process.name));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/* -------------------------------------------------------------------------- */
/* Derived statistics                                                         */
/* -------------------------------------------------------------------------- */

export interface SystemMetrics {
  readonly created: number;
  readonly ready: number;
  readonly running: number;
  readonly waiting: number;
  readonly terminated: number;
  readonly contextSwitches: number;
  /** Total CPU time consumed by all processes. */
  readonly cpuTime: number;
  /** Total waiting time accumulated by all processes. */
  readonly waitingTime: number;
}

export function countByState(system: ProcessSystem, state: ProcessState): number {
  return system.processes.filter((process) => process.state === state).length;
}

/** Snapshot metrics used by the measurements panel. */
export function systemMetrics(system: ProcessSystem): SystemMetrics {
  let cpuTime = 0;
  let waitingTime = 0;
  for (const process of system.processes) {
    cpuTime += process.cpuTime;
    waitingTime += process.waitingTime;
  }
  return {
    created: system.processes.length,
    ready: countByState(system, 'ready'),
    running: countByState(system, 'running'),
    waiting: countByState(system, 'waiting'),
    terminated: countByState(system, 'terminated'),
    contextSwitches: system.contextSwitches,
    cpuTime,
    waitingTime,
  };
}

/**
 * The scheduler's preference order among runnable processes.
 *
 * Smallest priority number wins; ties are broken by PID so the choice is
 * deterministic and independent of insertion order.
 */
export function schedulerOrder(processes: readonly ProcessControlBlock[]): ProcessControlBlock[] {
  return [...processes].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.pid - b.pid;
  });
}

/** The process a priority scheduler would pick next, or `undefined`. */
export function nextToRun(system: ProcessSystem): ProcessControlBlock | undefined {
  return schedulerOrder(system.processes.filter((process) => process.state === 'ready'))[0];
}

/** Every state, in canonical order, paired with how many processes are in it. */
export function stateCounts(system: ProcessSystem): { state: ProcessState; count: number }[] {
  return PROCESS_STATES.map((state) => ({ state, count: countByState(system, state) }));
}

/* -------------------------------------------------------------------------- */
/* Deterministic seeding                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Build a system from authored seeds.
 *
 * Processes named as a `parent` get that process's PID as their `parentPid`,
 * which is what makes the process-tree view meaningful.
 */
export function seedSystem(input: ProcessLifecycleInput): ProcessSystem {
  let system = createSystem();
  const byName = new Map<string, number>();

  input.seeds.forEach((seed: ProcessSeed) => {
    const pid = system.nextPid;
    const name = uniqueName(system, seed.name);
    const parentPid = seed.parent === undefined ? null : (byName.get(seed.parent) ?? null);
    const pcb = createPcb({
      pid,
      name,
      parentPid,
      state: seed.state ?? 'new',
      ...(seed.priority === undefined ? {} : { priority: seed.priority }),
      ...(seed.burstTime === undefined ? {} : { burstTime: seed.burstTime }),
      creationTime: 0,
    });
    byName.set(seed.name, pid);
    byName.set(name, pid);
    system = addProcess(system, pcb);
  });

  return system;
}
