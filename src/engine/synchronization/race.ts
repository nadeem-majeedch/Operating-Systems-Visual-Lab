import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  RaceInput,
  RaceMode,
  RaceStepData,
  SyncActorView,
  SyncResourceView,
  SyncTone,
} from './types';
import {
  MAX_RACE_ITERATIONS,
  MAX_RACE_PROCESSES,
  MAX_SYNC_STEPS,
  MIN_RACE_ITERATIONS,
  MIN_RACE_PROCESSES,
} from './types';

export const RACE_ALGORITHM_ID = 'mutex';
export const RACE_ENGINE_ID = 'mutex-race-engine';
export const RACE_LAB_ID = 'lab-mutex';

const PROCESS_NAMES = ['A', 'B', 'C', 'D'] as const;
const RACE_MODES: readonly RaceMode[] = ['unsafe', 'mutex', 'semaphore'];

type OpKind = 'acquire' | 'load' | 'add' | 'store' | 'release';

interface Op {
  readonly kind: OpKind;
  readonly iteration: number;
}

interface Actor {
  readonly name: string;
  readonly program: readonly Op[];
  pc: number;
  register: number | null;
  state: 'ready' | 'running' | 'blocked' | 'done';
  lastRun: number;
  /** Store sequence observed when this actor last loaded. */
  loadSeq: number;
  /** Resource id this actor is blocked on, if any. */
  waitingFor: string | null;
}

export function validateRaceInput(input: RaceInput): ValidationResult {
  const collector = new ValidationCollector();
  collector.addIf(
    !RACE_MODES.includes(input.mode),
    'mode',
    `mode must be one of ${RACE_MODES.join(', ')}`,
  );
  collector.addIf(
    !Number.isInteger(input.iterations) ||
      input.iterations < MIN_RACE_ITERATIONS ||
      input.iterations > MAX_RACE_ITERATIONS,
    'iterations',
    `iterations must be an integer between ${MIN_RACE_ITERATIONS} and ${MAX_RACE_ITERATIONS}`,
  );
  collector.addIf(
    !Number.isInteger(input.processCount) ||
      input.processCount < MIN_RACE_PROCESSES ||
      input.processCount > MAX_RACE_PROCESSES,
    'processCount',
    `processCount must be an integer between ${MIN_RACE_PROCESSES} and ${MAX_RACE_PROCESSES}`,
  );
  return collector.toResult();
}

function programFor(mode: RaceMode, iterations: number): Op[] {
  const ops: Op[] = [];
  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    if (mode !== 'unsafe') ops.push({ kind: 'acquire', iteration });
    ops.push({ kind: 'load', iteration });
    ops.push({ kind: 'add', iteration });
    ops.push({ kind: 'store', iteration });
    if (mode !== 'unsafe') ops.push({ kind: 'release', iteration });
  }
  return ops;
}

function opLabel(op: Op): string {
  switch (op.kind) {
    case 'acquire':
      return 'acquire lock';
    case 'load':
      return 'LOAD counter';
    case 'add':
      return 'ADD 1';
    case 'store':
      return 'STORE counter';
    case 'release':
      return 'release lock';
  }
}

function actorStateLabel(state: Actor['state']): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'running':
      return 'Running';
    case 'blocked':
      return 'Blocked';
    case 'done':
      return 'Finished';
  }
}

function actorTone(state: Actor['state']): SyncTone {
  if (state === 'running') return 'positive';
  if (state === 'blocked') return 'warning';
  return 'default';
}

export function raceStepMetrics(data: RaceStepData): Record<string, number> {
  return {
    counter: data.counter,
    expected: data.expected,
    lostUpdates: data.lostUpdates,
  };
}

/**
 * Deterministic race-condition simulator.
 *
 * Each process runs the classic non-atomic increment — load, add, store — and a
 * round-robin scheduler interleaves their instructions one at a time. In
 * `unsafe` mode a load can be invalidated by another process's store before it
 * is written back, which loses an update; `mutex` and `semaphore` modes wrap the
 * increment in a critical section so only one process is ever inside it.
 *
 * The scheduler is a plain loop over a value — no threads, no timers — so the
 * same input always yields the same schedule.
 */
export function runRace(
  input: RaceInput,
  config: SimulationConfig = {},
): SimulationRun<RaceStepData> {
  assertValid(validateRaceInput(input), 'Race condition');

  const { mode, iterations, processCount } = input;
  const expected = iterations * processCount;
  const protectedMode = mode !== 'unsafe';
  const lockName = mode === 'semaphore' ? 'semaphore' : 'mutex';

  const actors: Actor[] = Array.from({ length: processCount }, (_, index) => ({
    name: PROCESS_NAMES[index] ?? `P${index + 1}`,
    program: programFor(mode, iterations),
    pc: 0,
    register: null,
    state: 'ready',
    lastRun: -1,
    loadSeq: 0,
    waitingFor: null,
  }));

  let counter = 0;
  let storeSeq = 0;
  let lostUpdates = 0;
  let lockHolder: string | null = null;
  let clock = 0;

  const drafts: StepDraft<RaceStepData>[] = [];

  const snapshot = (
    activeActor: string | null,
    summary: string,
  ): RaceStepData => {
    const actorViews: SyncActorView[] = actors.map((actor) => {
      const op = actor.program[actor.pc];
      return {
        name: actor.name,
        state: actor.state,
        status: actorStateLabel(actor.state),
        ...(op ? { detail: opLabel(op) } : {}),
        tone: actorTone(actor.state),
      };
    });
    const resources: SyncResourceView[] = [
      {
        name: 'Shared counter',
        value: `${counter} / ${expected}`,
        hint: 'expected if every increment survives',
        tone: counter === expected ? 'positive' : 'default',
      },
    ];
    if (protectedMode) {
      resources.push({
        name: lockName,
        value: lockHolder === null ? 'free' : `held by ${lockHolder}`,
        hint: 'only the holder may be inside the critical section',
        tone: lockHolder === null ? 'default' : 'warning',
      });
    } else {
      resources.push({
        name: 'critical section',
        value: 'unprotected',
        hint: 'any process may enter at any time',
        tone: 'danger',
      });
    }
    return {
      kind: 'race',
      mode,
      clock,
      activeActor,
      actors: actorViews,
      resources,
      summary,
      correct: lostUpdates === 0,
      deadlocked: false,
      counter,
      expected,
      registers: actors.map((actor) => ({ name: actor.name, value: actor.register })),
      criticalSectionOwner: lockHolder,
      lostUpdates,
    };
  };

  const draft = (
    actor: Actor | null,
    label: string,
    description: string,
    explanation: string,
    highlights: readonly string[],
  ): StepDraft<RaceStepData> => {
    const data = snapshot(actor?.name ?? null, label);
    return { label, description, explanation, clock, data, highlights, metrics: raceStepMetrics(data) };
  };

  drafts.push(
    draft(
      null,
      'Processes start',
      `${processCount} processes each increment a shared counter ${iterations} time${
        iterations === 1 ? '' : 's'
      }, so the correct final value is ${expected}.`,
      protectedMode
        ? `Each increment is three instructions — load the counter into a register, add one, store it back. In ${mode} mode the three instructions run inside a critical section guarded by a shared ${lockName}, so no two processes can be inside at once.`
        : 'Each increment is three instructions — load the counter into a register, add one, store it back. Nothing stops another process from running between this process’s load and its store, and if it does, whichever store happens last wins and the other increment is lost.',
      actors.map((actor) => actor.name),
    ),
  );

  /** The runnable actor that has waited longest (round-robin, deterministic). */
  const pickActor = (): Actor | undefined => {
    let best: Actor | undefined;
    for (const actor of actors) {
      if (actor.state === 'done' || actor.pc >= actor.program.length) continue;
      if (actor.state === 'blocked') continue;
      if (!best || actor.lastRun < best.lastRun) best = actor;
    }
    if (!best || best.lastRun === Number.POSITIVE_INFINITY) return undefined;
    return best;
  };

  let guard = 0;
  while (guard < MAX_SYNC_STEPS) {
    guard += 1;
    const actor = pickActor();
    if (!actor) break;

    const op = actor.program[actor.pc];
    if (!op) break;

    actors.forEach((item) => {
      if (item !== actor && item.state === 'running') item.state = 'ready';
    });
    actor.state = 'running';
    actor.lastRun = clock;

    switch (op.kind) {
      case 'acquire': {
        if (lockHolder === null) {
          lockHolder = actor.name;
          actor.pc += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} enters the critical section`,
              `${actor.name} acquires the ${lockName}; it is now the only process allowed to touch the counter.`,
              `Acquiring the ${lockName} is the gate of mutual exclusion. While ${actor.name} holds it, every other process that tries to enter blocks instead, so their load–add–store triples cannot weave into ${actor.name}’s.`,
              [actor.name],
            ),
          );
        } else {
          actor.state = 'blocked';
          actor.waitingFor = lockName;
          actor.lastRun = clock;
          drafts.push(
            draft(
              actor,
              `${actor.name} blocks`,
              `${actor.name} tries to acquire the ${lockName} but it is held by ${lockHolder}, so it must wait.`,
              'A blocked process is not runnable: the scheduler simply skips it. This is what makes the critical section work — without blocking, a second process would barge in and the interleaving would be unsafe again.',
              [actor.name, lockHolder],
            ),
          );
        }
        clock += 1;
        break;
      }
      case 'release': {
        const released = lockHolder;
        lockHolder = null;
        const waiter = actors.find((item) => item.state === 'blocked' && item.waitingFor === lockName);
        if (waiter) {
          waiter.state = 'ready';
          waiter.waitingFor = null;
        }
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} leaves the critical section`,
            `${actor.name} releases the ${lockName}${waiter ? ` and wakes ${waiter.name}` : ''}.`,
            `Releasing the lock is the other half of mutual exclusion: the counter is now consistent, and ${waiter ? `${waiter.name} is moved from blocked back to ready so it can take its turn` : 'the next process can enter'}.`,
            waiter ? [released ?? actor.name, waiter.name] : [released ?? actor.name],
          ),
        );
        break;
      }
      case 'load': {
        actor.register = counter;
        actor.loadSeq = storeSeq;
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} loads the counter`,
            `${actor.name} reads the shared counter into its own register: ${actor.register}.`,
            `The load is a copy. ${actor.name} now holds a private snapshot of ${actor.register}${
              protectedMode
                ? ', and because it is inside the critical section no other process can change the counter before it is written back'
                : '; if another process stores before this one does, that snapshot becomes stale'
            }.`,
            [actor.name],
          ),
        );
        break;
      }
      case 'add': {
        actor.register = (actor.register ?? 0) + 1;
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} increments its register`,
            `${actor.name} adds one in its register, giving ${actor.register}. The shared counter is untouched.`,
            'The add only ever changes a private register. Two processes can both have incremented without the shared counter moving at all — which is exactly how an update gets lost.',
            [actor.name],
          ),
        );
        break;
      }
      case 'store': {
        const stale = storeSeq !== actor.loadSeq;
        if (stale) lostUpdates += 1;
        counter = actor.register ?? counter;
        storeSeq += 1;
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            stale ? `${actor.name} overwrites an update` : `${actor.name} stores the counter`,
            stale
              ? `${actor.name} writes ${counter} back, discarding an increment another process had already stored.`
              : `${actor.name} writes ${counter} back to the shared counter.`,
            stale
              ? 'This is the lost update. The store does not merge with what is already there — it blindly overwrites it, so the other process’s earlier increment vanishes. That is the race condition made visible.'
              : 'The store publishes the register to shared memory. Because nothing interleaved since the load, the value written is exactly the value that was read plus one.',
            [actor.name],
          ),
        );
        break;
      }
    }

    if (actor.pc >= actor.program.length) actor.state = 'done';
  }

  const finalData = snapshot(null, 'run complete');
  const loopedOut = guard >= MAX_SYNC_STEPS;
  drafts.push({
    label: lostUpdates > 0 ? 'Result is incorrect' : 'Result is correct',
    description:
      lostUpdates > 0
        ? `The run ends with the counter at ${counter} instead of ${expected}; ${lostUpdates} update${
            lostUpdates === 1 ? '' : 's'
          } were lost.`
        : `The run ends with the counter at ${counter}, exactly the expected ${expected}.`,
    explanation:
      lostUpdates > 0
        ? 'Interleaving without mutual exclusion let two processes read the same value and both write back the same result, so one increment disappeared. The final number is not just “a bit off” — it is the arithmetic of how many updates were overwritten.'
        : `Mutual exclusion forced the three-statement increments to run one at a time, so every increment survived and the total is correct. The cost is that processes queue up for the lock, which is the price of correctness${
            loopedOut ? '. The run hit the simulation step cap.' : '.'
          }`,
    clock,
    data: finalData,
    highlights: actors.map((actor) => actor.name),
    metrics: raceStepMetrics(finalData),
  });

  const steps = createSteps(drafts);

  return {
    algorithmId: RACE_ALGORITHM_ID,
    labId: RACE_LAB_ID,
    input: {
      mode,
      iterations,
      processCount,
      expected,
      finalCounter: counter,
      lostUpdates,
    },
    steps,
    state: createSimulationState<RaceStepData>({
      labId: RACE_LAB_ID,
      algorithmId: RACE_ALGORITHM_ID,
      steps,
      parameters: { mode, iterations, processCount },
      speed: config.speed,
    }),
    summary: {
      expected,
      finalCounter: counter,
      lostUpdates,
      correct: lostUpdates === 0 ? 1 : 0,
      steps: steps.length,
    },
  };
}

/** Engine object consumed by the registry and by generic lab tooling. */
export const raceEngine: SimulationEngine<RaceInput, RaceStepData> = {
  id: RACE_ENGINE_ID,
  algorithmId: RACE_ALGORITHM_ID,
  labId: RACE_LAB_ID,
  name: 'Race Conditions & Mutual Exclusion',
  description:
    'Two or more processes increment a shared counter one instruction at a time, with and without a lock, showing how interleaving loses updates.',
  validate: validateRaceInput,
  run: runRace,
};
