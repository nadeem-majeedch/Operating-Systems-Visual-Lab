import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  ForkView,
  PhilosopherState,
  PhilosopherView,
  PhilosophersInput,
  PhilosophersStepData,
  PhilosophersStrategy,
  SyncActorView,
  SyncResourceView,
  SyncTone,
} from './types';
import {
  MAX_MEALS,
  MAX_PHILOSOPHERS,
  MAX_SYNC_STEPS,
  MIN_MEALS,
  MIN_PHILOSOPHERS,
} from './types';

export const PHILOSOPHERS_ALGORITHM_ID = 'dining-philosophers';
export const PHILOSOPHERS_ENGINE_ID = 'dining-philosophers-engine';
export const PHILOSOPHERS_LAB_ID = 'lab-dining-philosophers';

const NAMES = ['A', 'B', 'C', 'D', 'E'] as const;
const STRATEGIES: readonly PhilosophersStrategy[] = ['naive', 'ordered', 'limited'];

type OpKind =
  | 'think'
  | 'acquireLeft'
  | 'acquireRight'
  | 'eat'
  | 'releaseLeft'
  | 'releaseRight'
  | 'acquireSeat'
  | 'releaseSeat';

interface Op {
  readonly kind: OpKind;
  readonly meal: number;
}

interface Actor {
  readonly index: number;
  readonly name: string;
  readonly program: readonly Op[];
  pc: number;
  state: PhilosopherState;
  lastRun: number;
  holds: string[];
  waitingFor: string | null;
}

interface Fork {
  readonly id: string;
  readonly index: number;
  holder: string | null;
}

export function validatePhilosophersInput(input: PhilosophersInput): ValidationResult {
  const collector = new ValidationCollector();
  collector
    .addIf(
      !Number.isInteger(input.philosophers) ||
        input.philosophers < MIN_PHILOSOPHERS ||
        input.philosophers > MAX_PHILOSOPHERS,
      'philosophers',
      `philosophers must be an integer between ${MIN_PHILOSOPHERS} and ${MAX_PHILOSOPHERS}`,
    )
    .addIf(
      !Number.isInteger(input.meals) || input.meals < MIN_MEALS || input.meals > MAX_MEALS,
      'meals',
      `meals must be an integer between ${MIN_MEALS} and ${MAX_MEALS}`,
    )
    .addIf(
      !STRATEGIES.includes(input.strategy),
      'strategy',
      `strategy must be one of ${STRATEGIES.join(', ')}`,
    );
  return collector.toResult();
}

function programFor(strategy: PhilosophersStrategy, index: number, philosopherCount: number, meals: number): Op[] {
  const ops: Op[] = [];
  const lastPicksRightFirst = strategy === 'ordered' && index === philosopherCount - 1;
  for (let meal = 1; meal <= meals; meal += 1) {
    ops.push({ kind: 'think', meal });
    if (strategy === 'limited') ops.push({ kind: 'acquireSeat', meal });
    if (lastPicksRightFirst) {
      ops.push({ kind: 'acquireRight', meal }, { kind: 'acquireLeft', meal });
    } else {
      ops.push({ kind: 'acquireLeft', meal }, { kind: 'acquireRight', meal });
    }
    ops.push({ kind: 'eat', meal }, { kind: 'releaseLeft', meal }, { kind: 'releaseRight', meal });
    if (strategy === 'limited') ops.push({ kind: 'releaseSeat', meal });
  }
  return ops;
}

function stateLabel(state: PhilosopherState): string {
  switch (state) {
    case 'thinking':
      return 'Thinking';
    case 'hungry':
      return 'Hungry';
    case 'eating':
      return 'Eating';
    case 'waiting':
      return 'Waiting for a fork';
    case 'done':
      return 'Finished';
  }
}

function stateTone(state: PhilosopherState): SyncTone {
  if (state === 'eating') return 'positive';
  if (state === 'waiting') return 'danger';
  if (state === 'hungry') return 'warning';
  return 'default';
}

function opLabel(op: Op, actor: Actor, forkRight: string): string {
  switch (op.kind) {
    case 'think':
      return 'think';
    case 'acquireLeft':
      return `pick up left fork ${`F${actor.index}`}`;
    case 'acquireRight':
      return `pick up right fork ${forkRight}`;
    case 'eat':
      return 'eat';
    case 'releaseLeft':
      return `put down left fork F${actor.index}`;
    case 'releaseRight':
      return `put down right fork ${forkRight}`;
    case 'acquireSeat':
      return 'take a seat';
    case 'releaseSeat':
      return 'leave the table';
  }
}

export function philosophersStepMetrics(data: PhilosophersStepData): Record<string, number> {
  return {
    meals: data.meals,
    eating: data.philosophers.filter((item) => item.state === 'eating').length,
    waiting: data.philosophers.filter((item) => item.state === 'waiting').length,
    forksHeld: data.forks.filter((fork) => fork.holder !== null).length,
  };
}

/**
 * Deterministic dining philosophers simulation.
 *
 * Philosophers alternate between thinking and eating, but eating needs two
 * forks. `naive` has everyone grab their left fork first, which lets the whole
 * table deadlock; `ordered` makes the last philosopher grab the right fork
 * first, breaking the circular wait; `limited` admits at most n − 1
 * philosophers to the table so one can always make progress.
 */
export function runPhilosophers(
  input: PhilosophersInput,
  config: SimulationConfig = {},
): SimulationRun<PhilosophersStepData> {
  assertValid(validatePhilosophersInput(input), 'Dining philosophers');

  const { philosophers: count, meals, strategy } = input;
  const seat = { value: strategy === 'limited' ? count - 1 : count };

  const forks: Fork[] = Array.from({ length: count }, (_, index) => ({
    id: `F${index}`,
    index,
    holder: null,
  }));

  const actors: Actor[] = Array.from({ length: count }, (_, index) => ({
    index,
    name: NAMES[index] ?? `P${index + 1}`,
    program: programFor(strategy, index, count, meals),
    pc: 0,
    state: 'thinking',
    lastRun: -1,
    holds: [],
    waitingFor: null,
  }));

  let mealsEaten = 0;
  let clock = 0;
  let deadlocked = false;

  const drafts: StepDraft<PhilosophersStepData>[] = [];

  const rightFork = (actor: Actor): string => forks[(actor.index + 1) % count]?.id ?? 'F?';

  const snapshot = (activeActor: string | null, summary: string): PhilosophersStepData => {
    const actorViews: SyncActorView[] = actors.map((actor) => {
      const op = actor.program[actor.pc];
      const next = op ? opLabel(op, actor, rightFork(actor)) : undefined;
      return {
        name: actor.name,
        state: actor.state,
        status: stateLabel(actor.state),
        ...(next ? { detail: next } : {}),
        tone: stateTone(actor.state),
      };
    });
    const philosopherViews: PhilosopherView[] = actors.map((actor) => ({
      name: actor.name,
      state: actor.state,
      holds: [...actor.holds],
    }));
    const forkViews: ForkView[] = forks.map((fork) => ({ id: fork.id, holder: fork.holder }));
    const resources: SyncResourceView[] = [
      {
        name: 'meals eaten',
        value: `${mealsEaten}`,
        hint: `target ${count * meals}`,
        tone: mealsEaten >= count * meals ? 'positive' : 'default',
      },
      {
        name: 'forks held',
        value: `${forks.filter((fork) => fork.holder !== null).length} / ${count}`,
        hint: 'a fork has one owner',
      },
      {
        name: 'seats',
        value: strategy === 'limited' ? String(seat.value) : 'unlimited',
        hint: strategy === 'limited' ? 'at most n − 1 at the table' : 'no admission limit',
      },
    ];
    return {
      kind: 'philosophers',
      clock,
      activeActor,
      actors: actorViews,
      resources,
      summary,
      correct: !deadlocked,
      deadlocked,
      philosophers: philosopherViews,
      forks: forkViews,
      meals: mealsEaten,
      strategy,
    };
  };

  const draft = (
    actor: Actor | null,
    label: string,
    description: string,
    explanation: string,
    highlights: readonly string[],
  ): StepDraft<PhilosophersStepData> => {
    const data = snapshot(actor?.name ?? null, label);
    return { label, description, explanation, clock, data, highlights, metrics: philosophersStepMetrics(data) };
  };

  drafts.push(
    draft(
      null,
      'Philosophers begin',
      `${count} philosophers sit around a table with exactly ${count} forks, one between each pair. Each needs both neighbours’ forks to eat.`,
      strategy === 'naive'
        ? 'Every philosopher will reach first for the fork on their left. When they all get hungry at once, each ends up holding one fork and waiting forever for the other — a deadlock that comes purely from the order in which resources are requested.'
        : strategy === 'ordered'
          ? 'The last philosopher reaches for their right fork first. That one difference means the circular wait cannot close, so at least one philosopher can always get two forks and eat.'
          : `At most ${count - 1} philosophers may try to pick up forks at once. With a spare seat, someone at the table can always find a free second fork, so the table cannot deadlock.`,
      actors.map((actor) => actor.name),
    ),
  );

  const pickActor = (): Actor | undefined => {
    let best: Actor | undefined;
    for (const actor of actors) {
      if (actor.state === 'waiting' || actor.state === 'done' || actor.pc >= actor.program.length) continue;
      if (!best || actor.lastRun < best.lastRun) best = actor;
    }
    return best;
  };

  const wakeForkWaiter = (forkId: string): void => {
    const waiter = actors.find((actor) => actor.state === 'waiting' && actor.waitingFor === forkId);
    if (waiter) {
      waiter.state = 'hungry';
      waiter.waitingFor = null;
    }
  };

  let guard = 0;
  while (guard < MAX_SYNC_STEPS) {
    guard += 1;
    const actor = pickActor();
    if (!actor) break;

    const op = actor.program[actor.pc];
    if (!op) break;

    actor.lastRun = clock;

    switch (op.kind) {
      case 'think': {
        actor.pc += 1;
        clock += 1;
        actor.state = 'hungry';
        drafts.push(
          draft(
            actor,
            `${actor.name} finishes thinking`,
            `${actor.name} stops thinking and becomes hungry.`,
            'Thinking requires no shared resources, so any number of philosophers can think at once. Hunger is the point at which a philosopher starts competing for forks.',
            [actor.name],
          ),
        );
        break;
      }
      case 'acquireSeat': {
        if (seat.value > 0) {
          seat.value -= 1;
          actor.pc += 1;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} takes a seat`,
              `${actor.name} joins the table; ${seat.value} seat${seat.value === 1 ? '' : 's'} still free.`,
              'Limiting the table to n − 1 philosophers is the “waiter” solution to the dining problem: with one seat permanently free, the circular wait can never close.',
              [actor.name],
            ),
          );
        } else {
          actor.state = 'waiting';
          actor.waitingFor = 'seat';
          // A released seat is handed straight to the waiter, so skip past the
          // acquire when it is woken rather than decrementing an empty counter.
          actor.pc += 1;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} waits for a seat`,
              `All seats are taken, so ${actor.name} must wait before touching any fork.`,
              'Waiting for a seat before reaching for any fork is what prevents the philosopher from holding one fork while waiting for another — no hold-and-wait, no deadlock.',
              [actor.name],
            ),
          );
        }
        break;
      }
      case 'acquireLeft':
      case 'acquireRight': {
        const forkIndex = op.kind === 'acquireLeft' ? actor.index : (actor.index + 1) % count;
        const fork = forks[forkIndex];
        if (!fork) break;
        if (fork.holder === null) {
          fork.holder = actor.name;
          actor.holds = [...actor.holds, fork.id];
          actor.pc += 1;
          clock += 1;
          if (actor.holds.length === 2) actor.state = 'eating';
          else actor.state = 'hungry';
          drafts.push(
            draft(
              actor,
              `${actor.name} picks up ${fork.id}`,
              `${actor.name} takes fork ${fork.id}${actor.holds.length === 2 ? ' and now has both forks' : ' and reaches for the other'}.`,
              actor.holds.length === 2
                ? `${actor.name} holds two forks and can eat. A fork has exactly one owner at a time, which is why it is a shared resource and not something two philosophers can hold at once.`
                : 'Holding one fork and reaching for the second is the dangerous half-state: if everyone does this, each philosopher holds a different fork and every request waits on someone else.',
              [actor.name],
            ),
          );
        } else {
          actor.state = 'waiting';
          actor.waitingFor = fork.id;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} waits for ${fork.id}`,
              `Fork ${fork.id} is held by ${fork.holder}, so ${actor.name} blocks — still holding ${actor.holds.length > 0 ? actor.holds.join(', ') : 'no fork'}.`,
              'Blocking here is the hold-and-wait that makes deadlock possible. When every philosopher holds one fork and waits for another, the cycle closes and no one can proceed.',
              [actor.name, fork.holder],
            ),
          );
        }
        break;
      }
      case 'eat': {
        mealsEaten += 1;
        actor.state = 'eating';
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} eats`,
            `${actor.name} eats meal ${op.meal} of ${meals} using both forks.`,
            'Eating is the critical section: it needs both shared forks exclusively. Progress means every hungry philosopher eventually gets there.',
            [actor.name],
          ),
        );
        break;
      }
      case 'releaseLeft':
      case 'releaseRight': {
        const forkIndex = op.kind === 'releaseLeft' ? actor.index : (actor.index + 1) % count;
        const fork = forks[forkIndex];
        if (!fork) break;
        fork.holder = null;
        actor.holds = actor.holds.filter((id) => id !== fork.id);
        actor.pc += 1;
        clock += 1;
        wakeForkWaiter(fork.id);
        if (actor.holds.length === 0) actor.state = 'thinking';
        drafts.push(
          draft(
            actor,
            `${actor.name} puts down ${fork.id}`,
            `${actor.name} releases fork ${fork.id}${actor.holds.length === 0 ? ' and returns to thinking' : ''}.`,
            'Releasing a fork wakes a blocked neighbour if one was waiting. Putting forks down promptly is what lets the table keep making progress instead of idling on held resources.',
            [actor.name],
          ),
        );
        break;
      }
      case 'releaseSeat': {
        // Hand the seat straight to a waiter if there is one; otherwise it is free again.
        const queued = actors.find((item) => item.state === 'waiting' && item.waitingFor === 'seat');
        if (queued) {
          queued.state = 'hungry';
          queued.waitingFor = null;
        } else {
          seat.value += 1;
        }
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} leaves the table`,
            `${actor.name} gives up its seat so another philosopher may try.`,
            'Releasing the seat restores the invariant that keeps the table deadlock-free: there is always at least one philosopher who is not competing for forks at this moment.',
            [actor.name],
          ),
        );
        break;
      }
    }

    if (actor.state !== 'waiting' && actor.pc >= actor.program.length) actor.state = 'done';

    // Deadlock: every philosopher is blocked and nobody holds a pair of forks.
    const anyEating = actors.some((item) => item.state === 'eating');
    const allBlocked = actors.every((item) => item.state === 'waiting' || item.state === 'done');
    if (!anyEating && allBlocked && actors.some((item) => item.state === 'waiting')) {
      deadlocked = true;
      drafts.push(
        draft(
          null,
          'Deadlock',
          'Every philosopher is waiting for a fork that a neighbour is holding, so no one can eat and the system is stuck.',
          'This is a deadlock: a cycle of processes each holding one resource and requesting another. It satisfies all four Coffman conditions at once — mutual exclusion (forks are single-owner), hold-and-wait, no preemption (a fork cannot be taken away), and circular wait. Breaking any one of them, such as by ordering the forks or limiting the table, prevents it.',
          actors.map((actor) => actor.name),
        ),
      );
      break;
    }
  }

  const finalData = snapshot(null, 'run complete');
  drafts.push({
    label: deadlocked ? 'Run ended in deadlock' : 'Run complete',
    description: deadlocked
      ? `The table deadlocked after ${mealsEaten} meal${mealsEaten === 1 ? '' : 's'}.`
      : `All philosophers finished; ${mealsEaten} meal${mealsEaten === 1 ? '' : 's'} eaten in total.`,
    explanation: deadlocked
      ? 'A deadlock is not a crash — every philosopher is simply blocked forever. The fix is structural: change the resource-acquisition order, add a seat limit, or make one philosopher pick forks up in the opposite order.'
      : 'With the acquisition order (or the seat limit) enforced, the circular wait could not close, so every hungry philosopher eventually got both forks. That is the difference between a system that merely runs and one that guarantees progress.',
    clock,
    data: finalData,
    highlights: actors.map((actor) => actor.name),
    metrics: philosophersStepMetrics(finalData),
  });

  const steps = createSteps(drafts);

  return {
    algorithmId: PHILOSOPHERS_ALGORITHM_ID,
    labId: PHILOSOPHERS_LAB_ID,
    input: { philosophers: count, meals, mealsEaten, deadlocked: deadlocked ? 1 : 0, steps: steps.length },
    steps,
    state: createSimulationState<PhilosophersStepData>({
      labId: PHILOSOPHERS_LAB_ID,
      algorithmId: PHILOSOPHERS_ALGORITHM_ID,
      steps,
      parameters: { philosophers: count, meals, strategy },
      speed: config.speed,
    }),
    summary: {
      meals: mealsEaten,
      target: count * meals,
      deadlocked: deadlocked ? 1 : 0,
      steps: steps.length,
    },
  };
}

export const philosophersEngine: SimulationEngine<PhilosophersInput, PhilosophersStepData> = {
  id: PHILOSOPHERS_ENGINE_ID,
  algorithmId: PHILOSOPHERS_ALGORITHM_ID,
  labId: PHILOSOPHERS_LAB_ID,
  name: 'Dining Philosophers',
  description:
    'Five philosophers, five forks, and the ordering that decides whether the table deadlocks or makes progress.',
  validate: validatePhilosophersInput,
  run: runPhilosophers,
};
