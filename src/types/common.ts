/**
 * Shared primitives used across the whole domain model.
 *
 * Keeping these in one place means the content layer, the simulation engines
 * and the UI all speak the same vocabulary.
 */

/** Stable identifier for a domain entity (topic, lab, algorithm, step, ...). */
export type Id = string;

/** How demanding a piece of learning material is. */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/** Lifecycle of a lab or an individual simulator inside a lab. */
export type ContentStatus = 'planned' | 'beta' | 'available';

/** Lifecycle of a running simulation. */
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/** Identifier of one of the eight major learning areas. */
export type TopicId =
  | 'cpu-scheduling'
  | 'process-management'
  | 'synchronization'
  | 'deadlocks'
  | 'memory-management'
  | 'virtual-memory'
  | 'disk-scheduling'
  | 'file-systems';

/** Concrete colour scheme applied to the document. */
export type Theme = 'light' | 'dark';

/** What the user chose: a fixed theme, or follow the operating system. */
export type ThemePreference = Theme | 'system';

/** Locale-independent ordering guard for difficulty levels. */
export const DIFFICULTY_ORDER: readonly DifficultyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;
