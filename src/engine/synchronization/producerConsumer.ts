import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  ProducerConsumerInput,
  ProducerConsumerStepData,
  SyncActorView,
  SyncResourceView,
  SyncTone,
} from './types';
import {
  MAX_ACTORS,
  MAX_BUFFER_CAPACITY,
  MAX_ITEMS,
  MAX_SYNC_STEPS,
  MIN_ACTORS,
  MIN_BUFFER_CAPACITY,
  MIN_ITEMS,
} from './types';

export const PRODUCER_CONSUMER_ALGORITHM_ID = 'bounded-buffer';
export const PRODUCER_CONSUMER_ENGINE_ID = 'bounded-buffer-engine';
export const PRODUCER_CONSUMER_LAB_ID = 'lab-bounded-buffer';

type OpKind = 'waitEmpty' | 'waitFull' | 'waitMutex' | 'produce' | 'consume' | 'signalMutex' | 'signalFull' | 'signalEmpty';

interface Op {
  readonly kind: OpKind;
  readonly slot: number;
}

interface Actor {
  readonly name: string;
  readonly role: 'producer' | 'consumer';
  readonly program: readonly Op[];
  pc: number;
  state: 'ready' | 'running' | 'blocked' | 'done';
  lastRun: number;
  waitingFor: string | null;
}

interface Semaphore {
  readonly name: string;
  value: number;
  readonly label: string;
}

export function validateProducerConsumerInput(input: ProducerConsumerInput): ValidationResult {
  const collector = new ValidationCollector();
  collector
    .addIf(
      !Number.isInteger(input.capacity) ||
        input.capacity < MIN_BUFFER_CAPACITY ||
        input.capacity > MAX_BUFFER_CAPACITY,
      'capacity',
      `capacity must be an integer between ${MIN_BUFFER_CAPACITY} and ${MAX_BUFFER_CAPACITY}`,
    )
    .addIf(
      !Number.isInteger(input.producers) ||
        input.producers < MIN_ACTORS ||
        input.producers > MAX_ACTORS,
      'producers',
      `producers must be an integer between ${MIN_ACTORS} and ${MAX_ACTORS}`,
    )
    .addIf(
      !Number.isInteger(input.consumers) ||
        input.consumers < MIN_ACTORS ||
        input.consumers > MAX_ACTORS,
      'consumers',
      `consumers must be an integer between ${MIN_ACTORS} and ${MAX_ACTORS}`,
    )
    .addIf(
      !Number.isInteger(input.itemsPerProducer) ||
        input.itemsPerProducer < MIN_ITEMS ||
        input.itemsPerProducer > MAX_ITEMS,
      'itemsPerProducer',
      `itemsPerProducer must be an integer between ${MIN_ITEMS} and ${MAX_ITEMS}`,
    )
    .addIf(
      !Number.isInteger(input.itemsPerConsumer) ||
        input.itemsPerConsumer < MIN_ITEMS ||
        input.itemsPerConsumer > MAX_ITEMS,
      'itemsPerConsumer',
      `itemsPerConsumer must be an integer between ${MIN_ITEMS} and ${MAX_ITEMS}`,
    );
  return collector.toResult();
}

function producerProgram(items: number): Op[] {
  const ops: Op[] = [];
  for (let slot = 1; slot <= items; slot += 1) {
    ops.push(
      { kind: 'waitEmpty', slot },
      { kind: 'waitMutex', slot },
      { kind: 'produce', slot },
      { kind: 'signalMutex', slot },
      { kind: 'signalFull', slot },
    );
  }
  return ops;
}

function consumerProgram(items: number): Op[] {
  const ops: Op[] = [];
  for (let slot = 1; slot <= items; slot += 1) {
    ops.push(
      { kind: 'waitFull', slot },
      { kind: 'waitMutex', slot },
      { kind: 'consume', slot },
      { kind: 'signalMutex', slot },
      { kind: 'signalEmpty', slot },
    );
  }
  return ops;
}

function opLabel(op: Op, role: Actor['role']): string {
  switch (op.kind) {
    case 'waitEmpty':
      return 'wait(empty)';
    case 'waitFull':
      return 'wait(full)';
    case 'waitMutex':
      return 'wait(mutex)';
    case 'signalMutex':
      return 'signal(mutex)';
    case 'signalFull':
      return 'signal(full)';
    case 'signalEmpty':
      return 'signal(empty)';
    case 'produce':
      return role === 'producer' ? `put item #${op.slot}` : 'take item';
    case 'consume':
      return 'take item';
  }
}

function stateLabel(state: Actor['state']): string {
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

function tone(state: Actor['state']): SyncTone {
  if (state === 'running') return 'positive';
  if (state === 'blocked') return 'warning';
  return 'default';
}

export function producerConsumerStepMetrics(data: ProducerConsumerStepData): Record<string, number> {
  const empty = data.resources.find((resource) => resource.name === 'empty')?.value ?? '0';
  return {
    produced: data.produced,
    consumed: data.consumed,
    buffered: data.buffer.filter((item) => item !== null).length,
    capacity: data.capacity,
    empty: Number(empty),
  };
}

/**
 * Deterministic producer/consumer simulation.
 *
 * A fixed flock of producers and consumers races through the classic
 * bounded-buffer protocol. `empty` counts free slots, `full` counts buffered
 * items, and `mutex` serialises access to the buffer array itself. A plain
 * round-robin scheduler picks the runnable actor that has waited longest, so the
 * trace is reproducible and no real concurrency is involved.
 */
export function runProducerConsumer(
  input: ProducerConsumerInput,
  config: SimulationConfig = {},
): SimulationRun<ProducerConsumerStepData> {
  assertValid(validateProducerConsumerInput(input), 'Producer / consumer');

  const { capacity, producers, consumers, itemsPerProducer, itemsPerConsumer } = input;

  const semaphores: Record<'empty' | 'full' | 'mutex', Semaphore> = {
    empty: { name: 'empty', value: capacity, label: 'free slots' },
    full: { name: 'full', value: 0, label: 'buffered items' },
    mutex: { name: 'mutex', value: 1, label: 'buffer access' },
  };

  const actors: Actor[] = [
    ...Array.from({ length: producers }, (_, index): Actor => ({
      name: `P${index + 1}`,
      role: 'producer',
      program: producerProgram(itemsPerProducer),
      pc: 0,
      state: 'ready',
      lastRun: -1,
      waitingFor: null,
    })),
    ...Array.from({ length: consumers }, (_, index): Actor => ({
      name: `C${index + 1}`,
      role: 'consumer',
      program: consumerProgram(itemsPerConsumer),
      pc: 0,
      state: 'ready',
      lastRun: -1,
      waitingFor: null,
    })),
  ];

  const buffer: (string | null)[] = Array.from({ length: capacity }, () => null);
  let produced = 0;
  let consumed = 0;
  let clock = 0;

  const drafts: StepDraft<ProducerConsumerStepData>[] = [];

  const snapshot = (activeActor: string | null, summary: string): ProducerConsumerStepData => {
    const actorViews: SyncActorView[] = actors.map((actor) => {
      const op = actor.program[actor.pc];
      return {
        name: actor.name,
        state: actor.state,
        status: stateLabel(actor.state),
        ...(op ? { detail: opLabel(op, actor.role) } : {}),
        tone: tone(actor.state),
      };
    });
    const count = buffer.filter((item) => item !== null).length;
    const resources: SyncResourceView[] = [
      {
        name: 'empty',
        value: String(semaphores.empty.value),
        hint: 'free slots',
        tone: semaphores.empty.value < 0 ? 'danger' : semaphores.empty.value === 0 ? 'warning' : 'default',
      },
      {
        name: 'full',
        value: String(semaphores.full.value),
        hint: 'buffered items',
        tone: semaphores.full.value < 0 ? 'danger' : semaphores.full.value > 0 ? 'positive' : 'default',
      },
      {
        name: 'mutex',
        value: semaphores.mutex.value <= 0 ? 'held' : 'free',
        hint: 'buffer access',
        tone: semaphores.mutex.value < 0 ? 'warning' : 'default',
      },
    ];
    return {
      kind: 'producer-consumer',
      clock,
      activeActor,
      actors: actorViews,
      resources,
      summary,
      correct: produced - consumed === count && count <= capacity && count >= 0,
      deadlocked: false,
      buffer: [...buffer],
      capacity,
      produced,
      consumed,
    };
  };

  const draft = (
    actor: Actor | null,
    label: string,
    description: string,
    explanation: string,
    highlights: readonly string[],
  ): StepDraft<ProducerConsumerStepData> => {
    const data = snapshot(actor?.name ?? null, label);
    return { label, description, explanation, clock, data, highlights, metrics: producerConsumerStepMetrics(data) };
  };

  drafts.push(
    draft(
      null,
      'Buffer and semaphores initialised',
      `A buffer of ${capacity} slot${capacity === 1 ? '' : 's'}, ${producers} producer${
        producers === 1 ? '' : 's'
      } and ${consumers} consumer${consumers === 1 ? '' : 's'}.`,
      `empty starts at ${capacity} (every slot is free), full at 0 (nothing buffered) and mutex at 1 (the buffer itself is not being used). The three semaphores encode the whole protocol: empty guards space, full guards items, and mutex guards the shared array.`,
      actors.map((actor) => actor.name),
    ),
  );

  const pickActor = (): Actor | undefined => {
    let best: Actor | undefined;
    for (const actor of actors) {
      if (actor.state === 'blocked' || actor.state === 'done' || actor.pc >= actor.program.length) continue;
      if (!best || actor.lastRun < best.lastRun) best = actor;
    }
    return best;
  };

  const wakeOne = (semaphore: string): void => {
    const waiter = actors.find((actor) => actor.state === 'blocked' && actor.waitingFor === semaphore);
    if (waiter) {
      waiter.state = 'ready';
      waiter.waitingFor = null;
    }
  };

  const wait = (semaphore: Semaphore): boolean => {
    semaphore.value -= 1;
    return semaphore.value >= 0;
  };

  const signal = (semaphore: Semaphore): boolean => {
    semaphore.value += 1;
    const woke = semaphore.value <= 0;
    if (woke) wakeOne(semaphore.name);
    return woke;
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

    const label = opLabel(op, actor.role);

    switch (op.kind) {
      case 'waitEmpty':
      case 'waitFull': {
        const semaphore = op.kind === 'waitEmpty' ? semaphores.empty : semaphores.full;
        if (wait(semaphore)) {
          actor.pc += 1;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} passes ${label}`,
              `${actor.name} decrements ${semaphore.name} to ${semaphore.value} and continues.`,
              op.kind === 'waitEmpty'
                ? 'Decrementing empty reserves a slot before the item is produced. Doing this first means a producer can never overfill the buffer — it blocks when empty reaches zero.'
                : 'Decrementing full claims a buffered item before it is taken. A consumer that finds full at zero blocks instead of reading an empty slot.',
              [actor.name],
            ),
          );
        } else {
          actor.state = 'blocked';
          actor.waitingFor = semaphore.name;
          // The classic wait already consumed the token (value went negative);
          // the blocked actor resumes *past* the wait when it is woken.
          actor.pc += 1;
          clock += 1;
          actor.lastRun = clock;
          drafts.push(
            draft(
              actor,
              `${actor.name} blocks on ${semaphore.name}`,
              `${semaphore.name} is ${semaphore.value} (${semaphore.label}), so ${actor.name} cannot proceed and waits.`,
              op.kind === 'waitEmpty'
                ? 'empty has gone negative, which means the buffer is full and producers must wait. The semaphore count below zero is exactly the number of blocked producers.'
                : 'full has gone negative, which means the buffer is empty and consumers must wait. Blocking rather than spinning is what makes semaphores efficient.',
              [actor.name],
            ),
          );
        }
        break;
      }
      case 'waitMutex': {
        if (wait(semaphores.mutex)) {
          actor.pc += 1;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} locks the buffer`,
              `${actor.name} enters the critical section protecting the buffer array.`,
              'mutex is not about capacity — it is about the shared array itself. Reading or writing the buffer is not atomic, so only the lock holder may touch it at a time.',
              [actor.name],
            ),
          );
        } else {
          actor.state = 'blocked';
          actor.waitingFor = 'mutex';
          actor.pc += 1;
          clock += 1;
          actor.lastRun = clock;
          drafts.push(
            draft(
              actor,
              `${actor.name} blocks on mutex`,
              `Another actor is using the buffer, so ${actor.name} waits for the critical section.`,
              'Because the buffer section is short, this wait is normally brief — but it must exist, or two actors could write the same slot.',
              [actor.name],
            ),
          );
        }
        break;
      }
      case 'produce': {
        const free = buffer.indexOf(null);
        const item = `${actor.name}-${op.slot}`;
        if (free >= 0) buffer[free] = item;
        produced += 1;
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} produces`,
            `${actor.name} places ${item} in slot ${free < 0 ? '?' : free}${free < 0 ? ' (no free slot!)' : ''}.`,
            'Inside the critical section the producer writes into a free slot. Because it already reserved space with wait(empty), a free slot is guaranteed to exist here.',
            [actor.name],
          ),
        );
        break;
      }
      case 'consume': {
        const filled = buffer.findIndex((item) => item !== null);
        const taken = filled >= 0 ? buffer[filled] : null;
        if (filled >= 0) buffer[filled] = null;
        consumed += 1;
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} consumes`,
            taken ? `${actor.name} takes ${taken} from slot ${filled}.` : `${actor.name} found no item to take.`,
            'The consumer removes an item from the buffer while holding mutex. It reserved the item with wait(full) beforehand, so the slot cannot be empty here.',
            [actor.name],
          ),
        );
        break;
      }
      case 'signalMutex': {
        signal(semaphores.mutex);
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} unlocks the buffer`,
            `${actor.name} leaves the critical section, allowing the next actor in.`,
            'Releasing mutex hands the buffer to the next waiting actor. Lock and unlock must be paired on every path, or the buffer eventually wedges.',
            [actor.name],
          ),
        );
        break;
      }
      case 'signalFull':
      case 'signalEmpty': {
        const semaphore = op.kind === 'signalFull' ? semaphores.full : semaphores.empty;
        const woke = signal(semaphore);
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} signals ${semaphore.name}`,
            woke
              ? `${actor.name} signals ${semaphore.name}, waking a blocked consumer.`
              : `${actor.name} signals ${semaphore.name}, now ${semaphore.value}.`,
            op.kind === 'signalFull'
              ? 'Signalling full announces one more item. If a consumer was blocked waiting for it, this signal moves that consumer from blocked to ready.'
              : 'Signalling empty announces one more free slot, releasing a producer that had been blocked on a full buffer.',
            [actor.name],
          ),
        );
        break;
      }
    }

    if (actor.pc >= actor.program.length) actor.state = 'done';
  }

  const finalData = snapshot(null, 'run complete');
  const buffered = buffer.filter((item) => item !== null).length;
  drafts.push({
    label: 'Run complete',
    description: `Produced ${produced}, consumed ${consumed}, ${buffered} item${
      buffered === 1 ? '' : 's'
    } left in the buffer.`,
    explanation:
      produced === consumed
        ? 'Every item that was produced was consumed, and the semaphores kept the buffer within its bounds throughout — no producer ever wrote into a full buffer and no consumer ever read an empty one.'
        : 'The run stopped with items still buffered, which is exactly what a bounded buffer permits: producers can stay ahead of consumers until the buffer fills, and then wait(empty) throttles them.',
    clock,
    data: finalData,
    highlights: actors.map((actor) => actor.name),
    metrics: producerConsumerStepMetrics(finalData),
  });

  const steps = createSteps(drafts);

  return {
    algorithmId: PRODUCER_CONSUMER_ALGORITHM_ID,
    labId: PRODUCER_CONSUMER_LAB_ID,
    input: { capacity, producers, consumers, produced, consumed, steps: steps.length },
    steps,
    state: createSimulationState<ProducerConsumerStepData>({
      labId: PRODUCER_CONSUMER_LAB_ID,
      algorithmId: PRODUCER_CONSUMER_ALGORITHM_ID,
      steps,
      parameters: { capacity, producers, consumers },
      speed: config.speed,
    }),
    summary: {
      produced,
      consumed,
      buffered,
      capacity,
      steps: steps.length,
    },
  };
}

export const producerConsumerEngine: SimulationEngine<ProducerConsumerInput, ProducerConsumerStepData> = {
  id: PRODUCER_CONSUMER_ENGINE_ID,
  algorithmId: PRODUCER_CONSUMER_ALGORITHM_ID,
  labId: PRODUCER_CONSUMER_LAB_ID,
  name: 'Producer / Consumer',
  description:
    'Bounded buffer guarded by empty, full and mutex semaphores, driven by a deterministic scheduler.',
  validate: validateProducerConsumerInput,
  run: runProducerConsumer,
};
