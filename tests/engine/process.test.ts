import { describe, expect, it } from 'vitest';
import {
  PROCESS_SCENE_PRESETS,
  PROCESS_STATES,
  applyAction,
  canTransition,
  createSystem,
  findProcess,
  findProcessByName,
  legalTransitions,
  runLifecycle,
  seedSystem,
  snapshot,
  systemMetrics,
  transitionProblem,
  transitionTarget,
} from '@/engine';
import type {
  ProcessAction,
  ProcessOutcome,
  ProcessState,
  ProcessSystem,
} from '@/engine';

function apply(system: ProcessSystem, action: ProcessAction): Extract<ProcessOutcome, { ok: true }> {
  const outcome = applyAction(system, action);
  if (!outcome.ok) throw new Error(`unexpected failure: ${outcome.error}`);
  return outcome;
}

function stateOf(system: ProcessSystem, name: string): ProcessState | undefined {
  return findProcessByName(system, name)?.state;
}

describe('process creation', () => {
  it('assigns a PID, a PCB and the new state', () => {
    const { system, event } = apply(createSystem(), { kind: 'create' });
    const process = system.processes[0];
    expect(process?.pid).toBe(1);
    expect(process?.name).toBe('P1');
    expect(process?.state).toBe('new');
    expect(process?.parentPid).toBeNull();
    expect(process?.creationTime).toBe(0);
    expect(process?.cpuTime).toBe(0);
    expect(process?.waitingTime).toBe(0);
    expect(event.kind).toBe('create');
    expect(event.toState).toBe('new');
  });

  it('honours an explicit name, priority, burst and parent', () => {
    let { system } = apply(createSystem(), { kind: 'create', name: 'init' });
    ({ system } = apply(system, { kind: 'create', name: 'worker', priority: 2, burstTime: 9, parentPid: 1 }));
    const worker = findProcessByName(system, 'worker');
    expect(worker?.priority).toBe(2);
    expect(worker?.burstTime).toBe(9);
    expect(worker?.remainingTime).toBe(9);
    expect(worker?.parentPid).toBe(1);
  });

  it('never reuses a PID and keeps names unique', () => {
    let { system } = apply(createSystem(), { kind: 'create', name: 'dup' });
    ({ system } = apply(system, { kind: 'create', name: 'dup' }));
    expect(system.processes.map((process) => process.pid)).toEqual([1, 2]);
    expect(system.processes.map((process) => process.name)).toEqual(['dup', 'dup-2']);
  });

  it('does not mutate the input system', () => {
    const system = createSystem();
    apply(system, { kind: 'create' });
    expect(system.processes).toHaveLength(0);
  });

  it('rejects a create action with an unknown parent', () => {
    const outcome = applyAction(createSystem(), { kind: 'create', parentPid: 99 });
    expect(outcome.ok).toBe(false);
  });
});

describe('legal transitions', () => {
  it('knows the whole state machine', () => {
    expect(canTransition('new', 'admit')).toBe(true);
    expect(canTransition('new', 'dispatch')).toBe(false);
    expect(canTransition('ready', 'dispatch')).toBe(true);
    expect(canTransition('running', 'preempt')).toBe(true);
    expect(canTransition('running', 'block')).toBe(true);
    expect(canTransition('running', 'terminate')).toBe(true);
    expect(canTransition('waiting', 'unblock')).toBe(true);
    expect(canTransition('waiting', 'dispatch')).toBe(false);
  });

  it('lists the exits from each state', () => {
    expect(legalTransitions('running').sort()).toEqual(['block', 'preempt', 'terminate']);
    expect(legalTransitions('waiting')).toEqual(['unblock']);
    expect(legalTransitions('terminated')).toEqual([]);
  });

  it('maps each transition to its destination', () => {
    expect(transitionTarget('admit')).toBe('ready');
    expect(transitionTarget('dispatch')).toBe('running');
    expect(transitionTarget('preempt')).toBe('ready');
    expect(transitionTarget('block')).toBe('waiting');
    expect(transitionTarget('unblock')).toBe('ready');
    expect(transitionTarget('terminate')).toBe('terminated');
  });

  it('explains why a transition is refused', () => {
    expect(transitionProblem('ready', 'dispatch')).toBeNull();
    const problem = transitionProblem('new', 'dispatch');
    expect(problem).toContain('New');
    expect(problem).toContain('Ready');
  });
});

describe('walking the lifecycle', () => {
  function oneProcess(): ProcessSystem {
    const { system } = apply(createSystem(), { kind: 'create', name: 'P1' });
    return system;
  }

  it('drives new → ready → running → terminated', () => {
    let system = oneProcess();
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    expect(stateOf(system, 'P1')).toBe('ready');

    const dispatched = apply(system, { kind: 'dispatch', pid: 1 });
    system = dispatched.system;
    expect(stateOf(system, 'P1')).toBe('running');
    expect(dispatched.event.transition).toBe('dispatch');
    expect(dispatched.event.contextSwitch).toBe(false);

    system = apply(system, { kind: 'terminate', pid: 1 }).system;
    expect(stateOf(system, 'P1')).toBe('terminated');
    expect(findProcess(system, 1)?.completionTime).toBe(system.clock);
  });

  it('supports running → waiting → ready through block and unblock', () => {
    let system = oneProcess();
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    system = apply(system, { kind: 'block', pid: 1 }).system;
    expect(stateOf(system, 'P1')).toBe('waiting');
    system = apply(system, { kind: 'unblock', pid: 1 }).system;
    expect(stateOf(system, 'P1')).toBe('ready');
  });

  it('supports running → ready through preemption', () => {
    let system = oneProcess();
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    const preempted = apply(system, { kind: 'preempt', pid: 1 });
    expect(stateOf(preempted.system, 'P1')).toBe('ready');
    expect(preempted.event.transition).toBe('preempt');
  });
});

describe('invalid transitions', () => {
  function pair(): ProcessSystem {
    let { system } = apply(createSystem(), { kind: 'create', name: 'P1' });
    ({ system } = apply(system, { kind: 'create', name: 'P2' }));
    return system;
  }

  it('refuses to dispatch a process that is still new', () => {
    const outcome = applyAction(pair(), { kind: 'dispatch', pid: 1 });
    expect(outcome.ok).toBe(false);
  });

  it('refuses to admit an already ready process', () => {
    const system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    const outcome = applyAction(system, { kind: 'admit', pid: 1 });
    expect(outcome.ok).toBe(false);
  });

  it('refuses to block a process that is only ready', () => {
    const system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    expect(applyAction(system, { kind: 'block', pid: 1 }).ok).toBe(false);
  });

  it('refuses to unblock a process that is not waiting', () => {
    const system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    expect(applyAction(system, { kind: 'unblock', pid: 1 }).ok).toBe(false);
  });

  it('refuses to terminate a process that is waiting', () => {
    let system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    system = apply(system, { kind: 'block', pid: 1 }).system;
    expect(applyAction(system, { kind: 'terminate', pid: 1 }).ok).toBe(false);
  });

  it('refuses a second dispatch while a process is running', () => {
    let system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'admit', pid: 2 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    const outcome = applyAction(system, { kind: 'dispatch', pid: 2 });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toContain('already on the CPU');
  });

  it('reports an unknown PID', () => {
    const outcome = applyAction(createSystem(), { kind: 'admit', pid: 7 });
    expect(outcome.ok).toBe(false);
  });

  it('leaves the system untouched on failure', () => {
    const system = apply(pair(), { kind: 'admit', pid: 1 }).system;
    const outcome = applyAction(system, { kind: 'dispatch', pid: 1 });
    // dispatch is legal here; use a genuinely illegal action instead
    expect(outcome.ok).toBe(true);
    const bad = applyAction(system, { kind: 'terminate', pid: 1 });
    expect(bad.ok).toBe(false);
    expect(bad.system).toBe(system);
  });
});

describe('ticking the clock', () => {
  it('accrues CPU time for the runner and waiting time for the rest', () => {
    let { system } = apply(createSystem(), { kind: 'create', name: 'P1', burstTime: 5 });
    ({ system } = apply(system, { kind: 'create', name: 'P2', burstTime: 5 }));
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'admit', pid: 2 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;

    const result = apply(system, { kind: 'tick', units: 2 });
    system = result.system;
    expect(system.clock).toBe(2);
    expect(findProcess(system, 1)?.cpuTime).toBe(2);
    expect(findProcess(system, 1)?.remainingTime).toBe(3);
    expect(findProcess(system, 2)?.cpuTime).toBe(0);
    expect(findProcess(system, 2)?.waitingTime).toBe(2);
    expect(result.event.kind).toBe('tick');
  });

  it('auto-terminates a process when its burst is exhausted', () => {
    let { system } = apply(createSystem(), { kind: 'create', name: 'P1', burstTime: 2 });
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    const result = apply(system, { kind: 'tick', units: 2 });
    expect(stateOf(result.system, 'P1')).toBe('terminated');
    expect(result.event.kind).toBe('terminate');
    expect(findProcess(result.system, 1)?.completionTime).toBe(2);
  });

  it('advances an idle clock without a running process', () => {
    const result = apply(createSystem(), { kind: 'tick', units: 3 });
    expect(result.system.clock).toBe(3);
    expect(result.event.label).toBe('CPU idle');
  });
});

describe('context switching', () => {
  function twoRunnable(): ProcessSystem {
    let { system } = apply(createSystem(), { kind: 'create', name: 'P1', priority: 1 });
    ({ system } = apply(system, { kind: 'create', name: 'P2', priority: 2 }));
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'admit', pid: 2 }).system;
    return system;
  }

  it('does not count the very first dispatch as a switch', () => {
    const result = apply(twoRunnable(), { kind: 'dispatch', pid: 1 });
    expect(result.system.contextSwitches).toBe(0);
    expect(result.event.contextSwitch).toBe(false);
  });

  it('counts a switch when the CPU changes hands after a preemption', () => {
    let system = twoRunnable();
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    system = apply(system, { kind: 'preempt', pid: 1 }).system;
    const result = apply(system, { kind: 'dispatch', pid: 2 });
    expect(result.system.contextSwitches).toBe(1);
    expect(result.event.contextSwitch).toBe(true);
    expect(result.event.highlights).toEqual(['P1', 'P2']);
  });

  it('does not count re-dispatching the same process', () => {
    let system = twoRunnable();
    system = apply(system, { kind: 'dispatch', pid: 1 }).system;
    system = apply(system, { kind: 'preempt', pid: 1 }).system;
    const result = apply(system, { kind: 'dispatch', pid: 1 });
    expect(result.system.contextSwitches).toBe(0);
  });
});

describe('the scheduler', () => {
  function runnable(): ProcessSystem {
    let { system } = apply(createSystem(), { kind: 'create', name: 'low', priority: 8 });
    ({ system } = apply(system, { kind: 'create', name: 'high', priority: 2 }));
    ({ system } = apply(system, { kind: 'create', name: 'mid', priority: 5 }));
    system = apply(system, { kind: 'admit', pid: 1 }).system;
    system = apply(system, { kind: 'admit', pid: 2 }).system;
    system = apply(system, { kind: 'admit', pid: 3 }).system;
    return system;
  }

  it('dispatches the highest-priority ready process', () => {
    const result = apply(runnable(), { kind: 'schedule' });
    expect(findProcessByName(result.system, 'high')?.state).toBe('running');
    expect(result.event.pid).toBe(2);
  });

  it('preempts a running process to run a better candidate, counting one switch', () => {
    let system = runnable();
    system = apply(system, { kind: 'dispatch', pid: 1 }).system; // the low-priority one
    const result = apply(system, { kind: 'schedule' });
    expect(findProcessByName(result.system, 'low')?.state).toBe('ready');
    expect(findProcessByName(result.system, 'high')?.state).toBe('running');
    expect(result.system.contextSwitches).toBe(1);
    expect(result.event.contextSwitch).toBe(true);
  });

  it('counts a switch and names the outgoing process when dispatching after a block', () => {
    let system = runnable();
    system = apply(system, { kind: 'dispatch', pid: 1 }).system; // 'low'
    system = apply(system, { kind: 'block', pid: 1 }).system; // CPU now idle
    const result = apply(system, { kind: 'schedule' });
    expect(result.event.pid).toBe(2); // 'high' has the best priority
    expect(result.system.contextSwitches).toBe(1);
    expect(result.event.contextSwitch).toBe(true);
    expect(result.event.highlights).toEqual(['low', 'high']);
    expect(result.event.description).toContain('low');
  });

  it('leaves an already-best running process alone', () => {
    let system = runnable();
    system = apply(system, { kind: 'dispatch', pid: 2 }).system; // 'high'
    const result = apply(system, { kind: 'schedule' });
    expect(findProcessByName(result.system, 'high')?.state).toBe('running');
    expect(result.system.contextSwitches).toBe(0);
    expect(result.event.label).toContain('keeps the CPU');
  });

  it('fails cleanly when nothing is ready', () => {
    const outcome = applyAction(createSystem(), { kind: 'schedule' });
    expect(outcome.ok).toBe(false);
  });
});

describe('reset', () => {
  it('clears every process and the clock', () => {
    let system = apply(createSystem(), { kind: 'create', name: 'P1' }).system;
    system = apply(system, { kind: 'tick', units: 4 }).system;
    const result = apply(system, { kind: 'reset' });
    expect(result.system.processes).toHaveLength(0);
    expect(result.system.clock).toBe(0);
    expect(result.system.contextSwitches).toBe(0);
    expect(result.event.kind).toBe('reset');
  });
});

describe('seeding and snapshots', () => {
  it('seeds parents and initial states', () => {
    const system = seedSystem({
      seeds: [
        { name: 'init', state: 'ready' },
        { name: 'child', parent: 'init' },
      ],
    });
    expect(findProcessByName(system, 'init')?.state).toBe('ready');
    expect(findProcessByName(system, 'child')?.parentPid).toBe(1);
  });

  it('snapshots the running PID and context switches', () => {
    let system = seedSystem({ seeds: [{ name: 'P1', state: 'running' }] });
    system = { ...system, contextSwitches: 3 };
    const data = snapshot(system);
    expect(data.runningPid).toBe(1);
    expect(data.contextSwitches).toBe(3);
    expect(data.processes).toHaveLength(1);
  });
});

describe('system metrics', () => {
  it('counts processes per state', () => {
    let system = seedSystem({
      seeds: [
        { name: 'a', state: 'ready' },
        { name: 'b', state: 'running' },
        { name: 'c', state: 'waiting' },
        { name: 'd', state: 'terminated' },
        { name: 'e', state: 'new' },
      ],
    });
    system = { ...system, contextSwitches: 2 };
    const metrics = systemMetrics(system);
    expect(metrics).toMatchObject({
      created: 5,
      ready: 1,
      running: 1,
      waiting: 1,
      terminated: 1,
      contextSwitches: 2,
    });
  });

  it('exposes every state', () => {
    expect(PROCESS_STATES).toEqual(['new', 'ready', 'running', 'waiting', 'terminated']);
  });
});

describe('runLifecycle', () => {
  it('replays a scripted scenario into ordered steps', () => {
    const run = runLifecycle(PROCESS_SCENE_PRESETS[0]!.input);
    expect(run.algorithmId).toBe('process-state-machine');
    expect(run.labId).toBe('lab-process-lifecycle');
    expect(run.steps.length).toBeGreaterThan(1);
    expect(run.steps[0]?.label).toBe('System initialised');
    expect(run.state.steps).toHaveLength(run.steps.length);
    expect(run.summary.created).toBe(1);
    expect(run.summary.terminated).toBe(1);
  });

  it('records a context switch in the I/O scenario summary', () => {
    const run = runLifecycle(PROCESS_SCENE_PRESETS[1]!.input);
    expect(run.summary.contextSwitches).toBeGreaterThan(0);
  });

  it('rejects invalid input', () => {
    expect(() => runLifecycle({ seeds: [] })).toThrow();
  });
});

describe('presets', () => {
  it('ships at least three distinct scenarios', () => {
    expect(PROCESS_SCENE_PRESETS.length).toBeGreaterThanOrEqual(3);
    const ids = PROCESS_SCENE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('runs every preset without error', () => {
    for (const preset of PROCESS_SCENE_PRESETS) {
      const run = runLifecycle(preset.input);
      expect(run.steps.length).toBeGreaterThan(0);
    }
  });
});
