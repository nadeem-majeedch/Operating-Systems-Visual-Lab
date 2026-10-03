export {
  MAX_BUFFER_CAPACITY,
  MAX_ITEMS,
  MAX_MEALS,
  MAX_OPS,
  MAX_PHILOSOPHERS,
  MAX_RACE_ITERATIONS,
  MAX_RACE_PROCESSES,
  MAX_READERS,
  MAX_SYNC_STEPS,
  MAX_WRITERS,
  MIN_BUFFER_CAPACITY,
  MIN_ITEMS,
  MIN_MEALS,
  MIN_OPS,
  MIN_PHILOSOPHERS,
  MIN_RACE_ITERATIONS,
  MIN_RACE_PROCESSES,
  MIN_READERS,
  MIN_WRITERS,
} from './types';
export type {
  ForkView,
  PhilosopherState,
  PhilosopherView,
  PhilosophersInput,
  PhilosophersStepData,
  PhilosophersStrategy,
  ProducerConsumerInput,
  ProducerConsumerStepData,
  RaceInput,
  RaceMode,
  RaceRegisterView,
  RaceStepData,
  ReadersWritersInput,
  ReadersWritersStepData,
  SyncActorView,
  SyncKind,
  SyncResourceView,
  SyncStepCommon,
  SyncStepData,
  SyncTone,
  SynchronizationInput,
} from './types';

export {
  RACE_ALGORITHM_ID,
  RACE_ENGINE_ID,
  RACE_LAB_ID,
  raceEngine,
  raceStepMetrics,
  runRace,
  validateRaceInput,
} from './race';
export {
  PRODUCER_CONSUMER_ALGORITHM_ID,
  PRODUCER_CONSUMER_ENGINE_ID,
  PRODUCER_CONSUMER_LAB_ID,
  producerConsumerEngine,
  producerConsumerStepMetrics,
  runProducerConsumer,
  validateProducerConsumerInput,
} from './producerConsumer';
export {
  PHILOSOPHERS_ALGORITHM_ID,
  PHILOSOPHERS_ENGINE_ID,
  PHILOSOPHERS_LAB_ID,
  philosophersEngine,
  philosophersStepMetrics,
  runPhilosophers,
  validatePhilosophersInput,
} from './philosophers';
export {
  READERS_WRITERS_ALGORITHM_ID,
  READERS_WRITERS_ENGINE_ID,
  READERS_WRITERS_LAB_ID,
  readersWritersEngine,
  readersWritersStepMetrics,
  runReadersWriters,
  validateReadersWritersInput,
} from './readersWriters';

export {
  PHILOSOPHERS_PRESETS,
  PRODUCER_CONSUMER_PRESETS,
  RACE_PRESETS,
  READERS_WRITERS_PRESETS,
} from './presets';
export type { SyncPreset } from './presets';

/** Stable ids of the implemented synchronization algorithms, in teaching order. */
export const SYNCHRONIZATION_ALGORITHM_IDS: readonly string[] = [
  'mutex',
  'bounded-buffer',
  'dining-philosophers',
  'readers-writers',
];
