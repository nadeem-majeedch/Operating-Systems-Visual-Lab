import { SynchronizationWorkstation } from './SynchronizationWorkstation';

/** Critical Sections & Mutual Exclusion (race-condition simulator). */
export function MutexWorkstation() {
  return <SynchronizationWorkstation kind="race" />;
}

/** Bounded buffer producer/consumer simulator. */
export function ProducerConsumerWorkstation() {
  return <SynchronizationWorkstation kind="producer-consumer" />;
}

/** Dining philosophers simulator. */
export function PhilosophersWorkstation() {
  return <SynchronizationWorkstation kind="philosophers" />;
}

/** Readers/writers simulator. */
export function ReadersWritersWorkstation() {
  return <SynchronizationWorkstation kind="readers-writers" />;
}
