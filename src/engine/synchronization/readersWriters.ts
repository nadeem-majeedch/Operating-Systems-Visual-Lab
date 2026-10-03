import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  ReadersWritersInput,
  ReadersWritersStepData,
  SyncActorView,
  SyncResourceView,
  SyncTone,
} from './types';
import {
  MAX_OPS,
  MAX_READERS,
  MAX_SYNC_STEPS,
  MAX_WRITERS,
  MIN_OPS,
  MIN_READERS,
  MIN_WRITERS,
} from './types';

export const READERS_WRITERS_ALGORITHM_ID = 'readers-writers';
export const READERS_WRITERS_ENGINE_ID = 'readers-writers-engine';
export const READERS_WRITERS_LAB_ID = 'lab-readers-writers';

type OpKind = 'enter' | 'read' | 'write' | 'exit';

interface Op {
  readonly kind: OpKind;
  readonly round: number;
}

interface Actor {
  readonly name: string;
  readonly role: 'reader' | 'writer';
  readonly program: readonly Op[];
  pc: number;
  state: 'ready' | 'reading' | 'writing' | 'blocked' | 'done';
  lastRun: number;
  waitingFor: string | null;
}

export function validateReadersWritersInput(input: ReadersWritersInput): ValidationResult {
  const collector = new ValidationCollector();
  collector
    .addIf(
      !Number.isInteger(input.readers) || input.readers < MIN_READERS || input.readers > MAX_READERS,
      'readers',
      `readers must be an integer between ${MIN_READERS} and ${MAX_READERS}`,
    )
    .addIf(
      !Number.isInteger(input.writers) || input.writers < MIN_WRITERS || input.writers > MAX_WRITERS,
      'writers',
      `writers must be an integer between ${MIN_WRITERS} and ${MAX_WRITERS}`,
    )
    .addIf(
      !Number.isInteger(input.reads) || input.reads < MIN_OPS || input.reads > MAX_OPS,
      'reads',
      `reads must be an integer between ${MIN_OPS} and ${MAX_OPS}`,
    )
    .addIf(
      !Number.isInteger(input.writes) || input.writes < MIN_OPS || input.writes > MAX_OPS,
      'writes',
      `writes must be an integer between ${MIN_OPS} and ${MAX_OPS}`,
    );
  return collector.toResult();
}

function readerProgram(reads: number): Op[] {
  const ops: Op[] = [];
  for (let round = 1; round <= reads; round += 1) {
    ops.push({ kind: 'enter', round }, { kind: 'read', round }, { kind: 'exit', round });
  }
  return ops;
}

function writerProgram(writes: number): Op[] {
  const ops: Op[] = [];
  for (let round = 1; round <= writes; round += 1) {
    ops.push({ kind: 'enter', round }, { kind: 'write', round }, { kind: 'exit', round });
  }
  return ops;
}

function opLabel(op: Op, role: Actor['role']): string {
  if (op.kind === 'enter') return 'enter';
  if (op.kind === 'exit') return 'exit';
  return role === 'reader' ? 'read' : 'write';
}

function stateLabel(state: Actor['state']): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'reading':
      return 'Reading';
    case 'writing':
      return 'Writing';
    case 'blocked':
      return 'Waiting';
    case 'done':
      return 'Finished';
  }
}

function tone(state: Actor['state']): SyncTone {
  if (state === 'reading' || state === 'writing') return 'positive';
  if (state === 'blocked') return 'warning';
  return 'default';
}

export function readersWritersStepMetrics(data: ReadersWritersStepData): Record<string, number> {
  return {
    readers: data.readers,
    readCount: data.readCount,
    readersWaiting: data.readersWaiting,
    writersWaiting: data.writersWaiting,
    writerActive: data.writer === null ? 0 : 1,
  };
}

/**
 * Deterministic readers-writers simulation (readers preference).
 *
 * Any number of readers may hold the data at once, but a writer needs exclusive
 * access. Readers share a `readCount` guarded by a mutex; the first reader in
 * locks the write lock and the last one out releases it. The trade-off is
 * visible directly: writers wait for readers, so a steady stream of readers can
 * starve a writer.
 */
export function runReadersWriters(
  input: ReadersWritersInput,
  config: SimulationConfig = {},
): SimulationRun<ReadersWritersStepData> {
  assertValid(validateReadersWritersInput(input), 'Readers / writers');

  const { readers: readerCount, writers: writerCount, reads, writes } = input;

  const actors: Actor[] = [
    ...Array.from({ length: readerCount }, (_, index): Actor => ({
      name: `R${index + 1}`,
      role: 'reader',
      program: readerProgram(reads),
      pc: 0,
      state: 'ready',
      lastRun: -1,
      waitingFor: null,
    })),
    ...Array.from({ length: writerCount }, (_, index): Actor => ({
      name: `W${index + 1}`,
      role: 'writer',
      program: writerProgram(writes),
      pc: 0,
      state: 'ready',
      lastRun: -1,
      waitingFor: null,
    })),
  ];

  let readCount = 0;
  let activeReaders = 0;
  let activeWriter: string | null = null;
  let clock = 0;
  let completedReads = 0;
  let completedWrites = 0;

  const drafts: StepDraft<ReadersWritersStepData>[] = [];

  const waiting = (role: Actor['role']): Actor[] =>
    actors.filter((actor) => actor.state === 'blocked' && actor.role === role);

  const snapshot = (activeActor: string | null, summary: string): ReadersWritersStepData => {
    const writerWaiting = waiting('writer').length;
    const readerWaiting = waiting('reader').length;
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
    const resources: SyncResourceView[] = [
      {
        name: 'readCount',
        value: `${readCount}`,
        hint: 'readers currently inside',
        tone: readCount > 0 ? 'positive' : 'default',
      },
      {
        name: 'writeLock',
        value: activeWriter === null ? (readCount > 0 ? 'held by readers' : 'free') : `held by ${activeWriter}`,
        hint: 'writers need it exclusively',
        tone: activeWriter === null ? 'default' : 'warning',
      },
      {
        name: 'writers waiting',
        value: `${writerWaiting}`,
        hint: writerWaiting > 0 ? 'readers can starve writers' : 'none queued',
        tone: writerWaiting > 0 ? 'warning' : 'default',
      },
    ];
    return {
      kind: 'readers-writers',
      clock,
      activeActor,
      actors: actorViews,
      resources,
      summary,
      correct: activeWriter === null || (activeReaders === 0 && readCount === 0),
      deadlocked: false,
      readers: activeReaders,
      writer: activeWriter,
      readCount,
      readersWaiting: readerWaiting,
      writersWaiting: writerWaiting,
    };
  };

  const draft = (
    actor: Actor | null,
    label: string,
    description: string,
    explanation: string,
    highlights: readonly string[],
  ): StepDraft<ReadersWritersStepData> => {
    const data = snapshot(actor?.name ?? null, label);
    return { label, description, explanation, clock, data, highlights, metrics: readersWritersStepMetrics(data) };
  };

  drafts.push(
    draft(
      null,
      'Shared data initialised',
      `${readerCount} reader${readerCount === 1 ? '' : 's'} and ${writerCount} writer${
        writerCount === 1 ? '' : 's'
      } compete for one shared resource.`,
      'Readers only inspect the data, so they may all hold it at once; a writer changes it, so it needs exclusive access. The rules encode that asymmetry: readers share, writers exclude everyone.',
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

  const wakeWriters = (): void => {
    const writer = actors.find((actor) => actor.state === 'blocked' && actor.role === 'writer');
    if (writer) {
      writer.state = 'ready';
      writer.waitingFor = null;
    }
  };

  const wakeReaders = (): void => {
    actors.forEach((actor) => {
      if (actor.state === 'blocked' && actor.role === 'reader') {
        actor.state = 'ready';
        actor.waitingFor = null;
      }
    });
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
      case 'enter': {
        if (actor.role === 'reader') {
          if (activeWriter === null) {
            readCount += 1;
            activeReaders += 1;
            actor.state = 'reading';
            actor.pc += 1;
            clock += 1;
            drafts.push(
              draft(
                actor,
                `${actor.name} starts reading`,
                `${actor.name} reads the data; ${activeReaders} reader${
                  activeReaders === 1 ? '' : 's'
                } inside, readCount ${readCount}.`,
                'A reader may enter whenever no writer holds the lock, so readers overlap freely. The first reader in also acquires the write lock on behalf of all readers; the last one out will release it.',
                [actor.name],
              ),
            );
          } else {
            actor.state = 'blocked';
            actor.waitingFor = 'writeLock';
            drafts.push(
              draft(
                actor,
                `${actor.name} waits for the writer`,
                `${activeWriter} is writing, so ${actor.name} blocks until the data is consistent again.`,
                'While a writer holds the lock nobody may read, because a read could observe a half-finished update. Readers queue on the write lock until the writer releases it.',
                [actor.name, activeWriter],
              ),
            );
          }
        } else if (activeWriter === null && readCount === 0) {
          activeWriter = actor.name;
          actor.state = 'writing';
          actor.pc += 1;
          clock += 1;
          drafts.push(
            draft(
              actor,
              `${actor.name} starts writing`,
              `${actor.name} takes the write lock and begins writing exclusively.`,
              'A writer enters only when no writer and no reader are inside. Holding the write lock means every other actor is excluded, which is the price of a consistent update: reads and writes cannot observe a half-finished change.',
              [actor.name],
            ),
          );
        } else {
          actor.state = 'blocked';
          actor.waitingFor = readCount > 0 ? 'readers' : 'writer';
          drafts.push(
            draft(
              actor,
              `${actor.name} waits to write`,
              readCount > 0
                ? `${readCount} reader${readCount === 1 ? '' : 's'} are inside, so ${actor.name} must wait.`
                : `Another writer holds the lock, so ${actor.name} must wait.`,
              'Writers-preference is the flip side of this design: a stream of readers can keep a writer waiting for a long time, which is the classic readers-preference starvation problem.',
              [actor.name],
            ),
          );
        }
        break;
      }
      case 'read': {
        completedReads += 1;
        actor.state = 'reading';
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} reads`,
            `${actor.name} performs read ${op.round} of ${reads}.`,
            'Reading is safe to share: any number of readers can observe the data at the same time because none of them changes it. That is exactly why mutual exclusion is not required between readers.',
            [actor.name],
          ),
        );
        break;
      }
      case 'write': {
        completedWrites += 1;
        actor.state = 'writing';
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} writes`,
            `${actor.name} performs write ${op.round} of ${writes} while holding the lock.`,
            'The writer is the only actor inside, so its update cannot interleave with another read or write. This is mutual exclusion applied to the whole shared object rather than a single critical section.',
            [actor.name],
          ),
        );
        break;
      }
      case 'exit': {
        const wasReader = actor.role === 'reader';
        if (wasReader) {
          activeReaders -= 1;
          readCount -= 1;
          actor.state = 'ready';
          if (readCount === 0) {
            // Last reader out releases the lock for a waiting writer.
            wakeWriters();
          }
        } else {
          activeWriter = null;
          actor.state = 'ready';
          wakeWriters();
          wakeReaders();
        }
        actor.pc += 1;
        clock += 1;
        drafts.push(
          draft(
            actor,
            `${actor.name} leaves`,
            wasReader
              ? `${actor.name} finishes reading; ${Math.max(0, readCount)} reader${
                  readCount === 1 ? '' : 's'
                } ${readCount === 1 ? 'remains' : 'remain'} inside.`
              : `${actor.name} releases the write lock.`,
            wasReader
              ? 'When the last reader leaves, the shared count drops to zero and the write lock is freed — that is the moment a waiting writer may finally enter.'
              : 'Releasing the write lock wakes a queued writer if there is one; otherwise all waiting readers may proceed together.',
            [actor.name],
          ),
        );
        break;
      }
    }

    if (actor.pc >= actor.program.length) actor.state = 'done';
  }

  const finalData = snapshot(null, 'run complete');
  const starvingWriters = waiting('writer').length;
  drafts.push({
    label: 'Run complete',
    description: `Completed ${completedReads} read${completedReads === 1 ? '' : 's'} and ${completedWrites} write${
      completedWrites === 1 ? '' : 's'
    }.`,
    explanation:
      starvingWriters > 0
        ? 'Writers were still queued when the run ended — the visible cost of readers preference. A fair or writer-preferring policy would hand the lock to the longest-waiting writer instead of letting new readers barge in.'
        : 'Every read and write completed. Readers overlapped with each other, writers always had the data to themselves, and no read ever observed a half-written value.',
    clock,
    data: finalData,
    highlights: actors.map((actor) => actor.name),
    metrics: readersWritersStepMetrics(finalData),
  });

  const steps = createSteps(drafts);

  return {
    algorithmId: READERS_WRITERS_ALGORITHM_ID,
    labId: READERS_WRITERS_LAB_ID,
    input: {
      readers: readerCount,
      writers: writerCount,
      completedReads,
      completedWrites,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<ReadersWritersStepData>({
      labId: READERS_WRITERS_LAB_ID,
      algorithmId: READERS_WRITERS_ALGORITHM_ID,
      steps,
      parameters: { readers: readerCount, writers: writerCount },
      speed: config.speed,
    }),
    summary: {
      completedReads,
      completedWrites,
      readers: readerCount,
      writers: writerCount,
      steps: steps.length,
    },
  };
}

export const readersWritersEngine: SimulationEngine<ReadersWritersInput, ReadersWritersStepData> = {
  id: READERS_WRITERS_ENGINE_ID,
  algorithmId: READERS_WRITERS_ALGORITHM_ID,
  labId: READERS_WRITERS_LAB_ID,
  name: 'Readers / Writers',
  description:
    'Many readers share the data while writers need exclusive access, exposing the fairness trade-off.',
  validate: validateReadersWritersInput,
  run: runReadersWriters,
};
