import type {
  Id,
  SimulationConfig,
  SimulationState,
  SimulationStep,
  ValidationResult,
} from '@/types';

/**
 * A simulation engine turns a validated input into an ordered list of
 * explainable steps. Engines are pure: same input in, same steps out. They know
 * nothing about React, CSS or content authoring.
 *
 * @typeParam TInput - The problem instance (process list, page references, ...)
 * @typeParam TData  - The per-step snapshot the visualisation renders
 */
export interface SimulationEngine<TInput, TData> {
  /** Stable engine identifier, e.g. `fcfs-engine`. */
  readonly id: Id;
  /** Algorithm this engine implements (matches `Algorithm.id`). */
  readonly algorithmId: Id;
  /** Lab that exposes the algorithm. */
  readonly labId: Id;
  /** Human-readable name shown in debug/architecture views. */
  readonly name: string;
  readonly description: string;
  /** Reject invalid inputs before any simulation is attempted. */
  validate(input: TInput): ValidationResult;
  /** Produce the full run: steps plus the ready-to-play initial state. */
  run(input: TInput, config?: SimulationConfig): SimulationRun<TData>;
}

/** The complete output of a single engine invocation. */
export interface SimulationRun<TData> {
  readonly algorithmId: Id;
  readonly labId: Id;
  readonly input: Record<string, number | string | boolean>;
  readonly steps: readonly SimulationStep<TData>[];
  readonly state: SimulationState<TData>;
  /** Wall-clock-independent summary used by tests and the results panel. */
  readonly summary: Readonly<Record<string, number>>;
}

/** Contract every registry entry satisfies so discovery stays type-safe. */
export interface EngineDescriptor {
  readonly engineId: Id;
  readonly algorithmId: Id;
  readonly labId: Id;
  readonly name: string;
  readonly description: string;
  /** `true` once the engine can actually produce steps. */
  readonly implemented: boolean;
}
