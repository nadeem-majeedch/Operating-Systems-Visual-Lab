import type {
  PhilosophersInput,
  ProducerConsumerInput,
  RaceInput,
  ReadersWritersInput,
} from './types';

export interface SyncPreset<TInput> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: TInput;
}

/** The three ways to run the shared-counter race. */
export const RACE_PRESETS: readonly SyncPreset<RaceInput>[] = [
  {
    id: 'race-unsafe',
    name: 'Unsafe',
    description: 'No lock: two processes lose updates to each other.',
    input: { mode: 'unsafe', iterations: 2, processCount: 2 },
  },
  {
    id: 'race-mutex',
    name: 'Mutex',
    description: 'A mutex makes the increment atomic.',
    input: { mode: 'mutex', iterations: 2, processCount: 2 },
  },
  {
    id: 'race-semaphore',
    name: 'Semaphore',
    description: 'A binary semaphore used as a lock.',
    input: { mode: 'semaphore', iterations: 2, processCount: 2 },
  },
  {
    id: 'race-unsafe-three',
    name: 'Three racers',
    description: 'Three processes interleave and lose more updates.',
    input: { mode: 'unsafe', iterations: 2, processCount: 3 },
  },
];

export const PRODUCER_CONSUMER_PRESETS: readonly SyncPreset<ProducerConsumerInput>[] = [
  {
    id: 'pc-steady',
    name: 'Steady pair',
    description: 'One producer and one consumer, two-slot buffer.',
    input: { capacity: 2, producers: 1, consumers: 1, itemsPerProducer: 4, itemsPerConsumer: 4 },
  },
  {
    id: 'pc-balanced',
    name: 'Balanced',
    description: 'Two producers, two consumers, three-slot buffer.',
    input: { capacity: 3, producers: 2, consumers: 2, itemsPerProducer: 3, itemsPerConsumer: 3 },
  },
  {
    id: 'pc-full-buffer',
    name: 'Full buffer',
    description: 'Two producers outrun one consumer until the buffer fills.',
    input: { capacity: 2, producers: 2, consumers: 1, itemsPerProducer: 4, itemsPerConsumer: 4 },
  },
];

export const PHILOSOPHERS_PRESETS: readonly SyncPreset<PhilosophersInput>[] = [
  {
    id: 'phil-deadlock',
    name: 'Deadlock',
    description: 'Everyone grabs the left fork first — the circular wait closes.',
    input: { philosophers: 5, meals: 2, strategy: 'naive' },
  },
  {
    id: 'phil-ordered',
    name: 'Ordered forks',
    description: 'The last philosopher takes the right fork first, breaking the cycle.',
    input: { philosophers: 5, meals: 2, strategy: 'ordered' },
  },
  {
    id: 'phil-waiter',
    name: 'Waiter',
    description: 'At most n − 1 philosophers may reach for forks at once.',
    input: { philosophers: 5, meals: 2, strategy: 'limited' },
  },
];

export const READERS_WRITERS_PRESETS: readonly SyncPreset<ReadersWritersInput>[] = [
  {
    id: 'rw-mixed',
    name: 'Readers and a writer',
    description: 'Two readers and one writer share the data.',
    input: { readers: 2, writers: 1, reads: 2, writes: 1 },
  },
  {
    id: 'rw-contention',
    name: 'Contention',
    description: 'Three readers and two writers compete for the lock.',
    input: { readers: 3, writers: 2, reads: 2, writes: 2 },
  },
  {
    id: 'rw-starvation',
    name: 'Writer starvation',
    description: 'A steady stream of readers keeps the writer waiting.',
    input: { readers: 3, writers: 1, reads: 3, writes: 2 },
  },
];
