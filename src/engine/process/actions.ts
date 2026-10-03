import { slugify } from '@/utils';
import { PROCESS_STATE_INFO, TRANSITION_RULES } from './states';
import { transitionProblem } from './transition';
import {
  addProcess,
  createPcb,
  createSystem,
  findProcess,
  findProcessByName,
  schedulerOrder,
  runningProcess,
  uniqueName,
  updateProcess,
} from './system';
import type {
  ProcessAction,
  ProcessControlBlock,
  ProcessEvent,
  ProcessEventKind,
  ProcessOutcome,
  ProcessScriptStep,
  ProcessState,
  ProcessSystem,
  ProcessTransition,
} from './types';

/** Past-tense labels for the state-machine edges. */
const PAST_TENSE: Record<ProcessTransition, string> = {
  admit: 'admitted',
  dispatch: 'dispatched',
  preempt: 'preempted',
  block: 'blocked',
  unblock: 'unblocked',
  terminate: 'terminated',
};

interface EventDraft {
  readonly kind: ProcessEventKind;
  readonly label: string;
  readonly description: string;
  readonly explanation: string;
  readonly transition?: ProcessTransition | null;
  readonly pid?: number | null;
  readonly fromState?: ProcessState | null;
  readonly toState?: ProcessState | null;
  readonly highlights?: readonly string[];
  readonly contextSwitch?: boolean;
}

/** Append an event and advance the deterministic sequence counter. */
function record(
  system: ProcessSystem,
  draft: EventDraft,
): { readonly system: ProcessSystem; readonly event: ProcessEvent } {
  const index = system.sequence;
  const event: ProcessEvent = {
    id: `${slugify(draft.label) || 'event'}-${index}`,
    index,
    clock: system.clock,
    kind: draft.kind,
    transition: draft.transition ?? null,
    label: draft.label,
    description: draft.description,
    explanation: draft.explanation,
    pid: draft.pid ?? null,
    fromState: draft.fromState ?? null,
    toState: draft.toState ?? null,
    highlights: draft.highlights ?? [],
    contextSwitch: draft.contextSwitch ?? false,
  };
  return { system: { ...system, sequence: index + 1 }, event };
}

function fail(system: ProcessSystem, error: string): ProcessOutcome {
  return { ok: false, system, error };
}

/* -------------------------------------------------------------------------- */
/* Individual actions                                                         */
/* -------------------------------------------------------------------------- */

function applyCreate(
  system: ProcessSystem,
  action: Extract<ProcessAction, { kind: 'create' }>,
): ProcessOutcome {
  const pid = system.nextPid;
  const requested = action.name?.trim() ?? '';
  const name = uniqueName(system, requested === '' ? `P${pid}` : requested);
  const parentPid = action.parentPid ?? null;

  const parent = parentPid === null ? undefined : findProcess(system, parentPid);
  if (parentPid !== null && !parent) {
    return fail(system, `Cannot create ${name}: no process with PID ${parentPid}.`);
  }

  const pcb = createPcb({
    pid,
    name,
    parentPid,
    state: 'new',
    ...(action.priority === undefined ? {} : { priority: action.priority }),
    ...(action.burstTime === undefined ? {} : { burstTime: action.burstTime }),
    creationTime: system.clock,
  });

  const next = addProcess(system, pcb);
  const { system: recorded, event } = record(next, {
    kind: 'create',
    label: `${name} created`,
    description: `PID ${pid} is created at t=${system.clock}${
      parent ? ` by ${parent.name} (PID ${parent.pid})` : ''
    } and enters the new state.`,
    explanation:
      'Creating a process allocates a PID and a PCB. The PCB is the kernel’s entire record of the process: identity, parent, state, priority and its accounting counters. A new process must be admitted before it can compete for the CPU.',
    pid,
    toState: 'new',
    highlights: [name],
  });

  return { ok: true, system: recorded, event };
}

function applyTransition(
  system: ProcessSystem,
  transition: ProcessTransition,
  pid: number,
): ProcessOutcome {
  const process = findProcess(system, pid);
  if (!process) return fail(system, `No process with PID ${pid}.`);

  const problem = transitionProblem(process.state, transition);
  if (problem) return fail(system, `${process.name}: ${problem}`);

  if (transition === 'dispatch') {
    const running = runningProcess(system);
    if (running && running.pid !== pid) {
      return fail(
        system,
        `${running.name} is already on the CPU. Preempt or block it before dispatching another process.`,
      );
    }
  }

  const rule = TRANSITION_RULES[transition];
  const isSwitch =
    transition === 'dispatch' && system.lastRunningPid !== null && system.lastRunningPid !== pid;
  const previous = isSwitch ? findProcess(system, system.lastRunningPid ?? -1) : undefined;

  const moved = updateProcess(system, pid, {
    state: rule.to,
    ...(transition === 'terminate' ? { completionTime: system.clock } : {}),
  });
  const next: ProcessSystem = {
    ...moved,
    contextSwitches: moved.contextSwitches + (isSwitch ? 1 : 0),
    ...(transition === 'dispatch' ? { lastRunningPid: pid } : {}),
  };

  const fromLabel = PROCESS_STATE_INFO[rule.from].label;
  const toLabel = PROCESS_STATE_INFO[rule.to].label;

  const description =
    transition === 'dispatch'
      ? isSwitch
        ? `${process.name} (PID ${pid}) is dispatched at t=${system.clock}; ${
            previous?.name ?? 'the previous process'
          }’s context is saved and ${process.name}’s is restored.`
        : `${process.name} (PID ${pid}) is dispatched onto the idle CPU at t=${system.clock}.`
      : `${process.name} (PID ${pid}) moves from ${fromLabel} to ${toLabel} at t=${system.clock}.`;

  const { system: recorded, event } = record(next, {
    kind: transition,
    transition,
    label: `${process.name} ${PAST_TENSE[transition]}`,
    description,
    explanation: rule.explanation,
    pid,
    fromState: rule.from,
    toState: rule.to,
    highlights: isSwitch && previous ? [previous.name, process.name] : [process.name],
    contextSwitch: isSwitch,
  });

  return { ok: true, system: recorded, event };
}

function applyTick(system: ProcessSystem, units = 1): ProcessOutcome {
  const steps = Math.max(1, Math.trunc(units));
  const before = runningProcess(system);
  let processes = system.processes.map((process) => ({ ...process }));
  let clock = system.clock;
  let completed: ProcessControlBlock | undefined;
  let ranUnits = 0;

  for (let unit = 0; unit < steps; unit += 1) {
    // Ready and waiting processes are, by definition, not on the CPU.
    processes = processes.map((process) =>
      process.state === 'ready' || process.state === 'waiting'
        ? { ...process, waitingTime: process.waitingTime + 1 }
        : process,
    );

    const running = processes.find((process) => process.state === 'running');
    if (running) {
      const remaining = running.remainingTime - 1;
      const finishing = remaining <= 0;
      ranUnits += 1;
      processes = processes.map((process) =>
        process.pid === running.pid
          ? {
              ...process,
              cpuTime: process.cpuTime + 1,
              remainingTime: Math.max(0, remaining),
              ...(finishing
                ? { state: 'terminated' as ProcessState, completionTime: clock + 1 }
                : {}),
            }
          : process,
      );
      if (finishing) completed = processes.find((process) => process.pid === running.pid);
    }
    clock += 1;
  }

  const next: ProcessSystem = { ...system, processes, clock };

  if (completed) {
    const process = completed;
    const { system: recorded, event } = record(next, {
      kind: 'terminate',
      transition: 'terminate',
      label: `${process.name} terminated`,
      description: `${process.name} (PID ${process.pid}) used the last of its ${process.burstTime}-unit burst and exits at t=${clock}.`,
      explanation:
        'A process that has no work left terminates on its own. The kernel releases its resources and records the exit status in the PCB so the parent can collect it.',
      pid: process.pid,
      fromState: 'running',
      toState: 'terminated',
      highlights: [process.name],
    });
    return { ok: true, system: recorded, event };
  }

  if (before) {
    const updated = processes.find((process) => process.pid === before.pid) ?? before;
    const { system: recorded, event } = record(next, {
      kind: 'tick',
      label: `${before.name} ran`,
      description: `${before.name} (PID ${before.pid}) executed ${ranUnits} time unit${
        ranUnits === 1 ? '' : 's'
      }; ${updated.cpuTime} of ${updated.burstTime} used, ${updated.remainingTime} remaining.`,
      explanation:
        'While a process runs it consumes CPU time; every other ready or waiting process accumulates waiting time. The tick action is how the kernel’s clock advances, and it is why waiting time grows even when nothing visible appears to change.',
      pid: before.pid,
      highlights: [before.name],
    });
    return { ok: true, system: recorded, event };
  }

  const { system: recorded, event } = record(next, {
    kind: 'tick',
    label: 'CPU idle',
    description: `No process was running; the clock advanced ${steps} time unit${
      steps === 1 ? '' : 's'
    } to t=${clock}.`,
    explanation:
      'An idle CPU still consumes wall-clock time, and any ready or waiting processes keep accumulating waiting time. A real scheduler would rather dispatch work than idle.',
    highlights: [],
  });
  return { ok: true, system: recorded, event };
}

function applySchedule(system: ProcessSystem): ProcessOutcome {
  const running = runningProcess(system);
  const ready = system.processes.filter((process) => process.state === 'ready');

  // Compare the running process against the ready queue on equal terms.
  const candidates = running
    ? [...ready, { ...running, state: 'ready' as ProcessState }]
    : ready;
  const chosen = schedulerOrder(candidates)[0];

  if (!chosen) {
    return fail(system, 'No ready process is available to dispatch. Admit a process first.');
  }

  if (running && chosen.pid === running.pid) {
    const { system: recorded, event } = record(system, {
      kind: 'schedule',
      label: `${running.name} keeps the CPU`,
      description: `${running.name} (PID ${running.pid}) already has the best priority among runnable processes, so the scheduler leaves it running at t=${system.clock}.`,
      explanation:
        'The scheduler only takes the CPU away when another process deserves it more. Leaving the current process running avoids a context switch entirely, which is the cheapest possible scheduling decision.',
      pid: running.pid,
      highlights: [running.name],
    });
    return { ok: true, system: recorded, event };
  }

  /*
   * The outgoing process is whoever last held the CPU. That may still be
   * running (a preemption), or it may have just blocked or terminated — in
   * which case it left the CPU free but its context is still what the switch
   * writes out.
   */
  const outgoing =
    running ??
    (system.lastRunningPid === null ? undefined : findProcess(system, system.lastRunningPid));
  const isSwitch = outgoing !== undefined && outgoing.pid !== chosen.pid;

  const staged = running ? updateProcess(system, running.pid, { state: 'ready' }) : system;
  const next: ProcessSystem = {
    ...updateProcess(staged, chosen.pid, { state: 'running' }),
    contextSwitches: staged.contextSwitches + (isSwitch ? 1 : 0),
    lastRunningPid: chosen.pid,
  };

  const description = running
    ? `${running.name} is preempted and ${chosen.name} (PID ${chosen.pid}) is dispatched at t=${system.clock}, so the CPU changes hands.`
    : outgoing && isSwitch
      ? `The CPU moves from ${outgoing.name} (now ${outgoing.state}) to ${chosen.name} (PID ${chosen.pid}) at t=${system.clock}.`
      : `${chosen.name} (PID ${chosen.pid}) is dispatched onto the idle CPU at t=${system.clock}.`;

  const explanation = isSwitch
    ? 'The CPU changes hands: the kernel writes the outgoing process’s context into its PCB and loads the incoming process’s. That save-and-restore pair is a context switch, and it is pure overhead — no user work happens while it runs.'
    : 'The scheduler scans the ready queue and picks the process with the best priority. Nothing was holding the CPU, so this dispatch restores no saved context and is not a context switch.';

  const { system: recorded, event } = record(next, {
    kind: 'schedule',
    transition: 'dispatch',
    label: `Scheduler runs ${chosen.name}`,
    description,
    explanation,
    pid: chosen.pid,
    fromState: 'ready',
    toState: 'running',
    highlights: isSwitch && outgoing ? [outgoing.name, chosen.name] : [chosen.name],
    contextSwitch: isSwitch,
  });

  return { ok: true, system: recorded, event };
}

function applyReset(): ProcessOutcome {
  const fresh = createSystem();
  const { system, event } = record(fresh, {
    kind: 'reset',
    label: 'System reset',
    description: 'Every process is removed and the clock returns to zero.',
    explanation:
      'Resetting returns the kernel to a clean slate: no PCBs, no running process, and a clock at zero. The event log starts again.',
    highlights: [],
  });
  return { ok: true, system, event };
}

/* -------------------------------------------------------------------------- */
/* Public entry points                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Apply one action to the system.
 *
 * Pure: the returned system is a new value and the input is never mutated. On
 * failure the original system is returned untouched alongside a readable error,
 * so an illegal click can never corrupt the simulation.
 */
export function applyAction(system: ProcessSystem, action: ProcessAction): ProcessOutcome {
  switch (action.kind) {
    case 'create':
      return applyCreate(system, action);
    case 'admit':
    case 'dispatch':
    case 'preempt':
    case 'block':
    case 'unblock':
    case 'terminate':
      return applyTransition(system, action.kind, action.pid);
    case 'tick':
      return applyTick(system, action.units ?? 1);
    case 'schedule':
      return applySchedule(system);
    case 'reset':
      return applyReset();
    default: {
      const exhaustive: never = action;
      return fail(system, `Unsupported action: ${String(exhaustive)}`);
    }
  }
}

/**
 * Apply a name-addressed script step, resolving names to PIDs as it goes.
 *
 * Used by `run()` so authored scenarios never hard-code PIDs.
 */
export function applyScriptStep(system: ProcessSystem, step: ProcessScriptStep): ProcessOutcome {
  return applyAction(system, scriptToAction(system, step));
}

/** Compile a name-addressed script step into a PID-addressed action. */
export function scriptToAction(system: ProcessSystem, step: ProcessScriptStep): ProcessAction {
  if (step.action === 'create') {
    const parent = step.parent === undefined ? undefined : findProcessByName(system, step.parent);
    return {
      kind: 'create',
      name: step.name,
      ...(step.priority === undefined ? {} : { priority: step.priority }),
      ...(step.burstTime === undefined ? {} : { burstTime: step.burstTime }),
      ...(parent === undefined ? {} : { parentPid: parent.pid }),
    };
  }
  if (step.action === 'tick') {
    return { kind: 'tick', ...(step.units === undefined ? {} : { units: step.units }) };
  }
  if (step.action === 'schedule') {
    return { kind: 'schedule' };
  }
  const pid = findProcessByName(system, step.name)?.pid;
  // An unknown name becomes PID -1, which the transition path reports clearly.
  return { kind: step.action, pid: pid ?? -1 };
}
