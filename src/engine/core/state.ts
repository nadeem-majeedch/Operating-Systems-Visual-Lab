import type {
  Id,
  ParameterValue,
  SimulationState,
  SimulationStatus,
  SimulationStep,
} from '@/types';
import { clamp } from '@/utils';

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;
export const DEFAULT_SPEED = 1;

/** Clamp a playback multiplier into the supported range. */
export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return DEFAULT_SPEED;
  return clamp(speed, MIN_SPEED, MAX_SPEED);
}

export interface CreateStateOptions<TData> {
  readonly labId: Id;
  readonly algorithmId: Id;
  readonly steps: readonly SimulationStep<TData>[];
  readonly parameters?: Readonly<Record<string, ParameterValue>>;
  readonly speed?: number;
}

/** Build the initial `idle` state for a run. */
export function createSimulationState<TData>({
  labId,
  algorithmId,
  steps,
  parameters = {},
  speed = DEFAULT_SPEED,
}: CreateStateOptions<TData>): SimulationState<TData> {
  return {
    labId,
    algorithmId,
    status: 'idle',
    speed: clampSpeed(speed),
    currentStepIndex: 0,
    steps,
    parameters,
    error: null,
  };
}

export function setStatus<TData>(
  state: SimulationState<TData>,
  status: SimulationStatus,
): SimulationState<TData> {
  if (state.status === status) return state;
  return { ...state, status };
}

export function play<TData>(state: SimulationState<TData>): SimulationState<TData> {
  if (state.steps.length === 0) return state;
  return setStatus(state, 'running');
}

export function pause<TData>(state: SimulationState<TData>): SimulationState<TData> {
  return setStatus(state, state.status === 'completed' ? 'completed' : 'paused');
}

/** Jump to an exact step, clamping out-of-range indices. */
export function goToStep<TData>(
  state: SimulationState<TData>,
  index: number,
): SimulationState<TData> {
  if (state.steps.length === 0) return state;
  const currentStepIndex = clamp(Math.trunc(index), 0, state.steps.length - 1);
  if (currentStepIndex === state.currentStepIndex) return state;
  return { ...state, currentStepIndex };
}

/**
 * Advance one step. Reaching the final step marks the run as `completed`;
 * a manual step always leaves playback paused.
 */
export function nextStep<TData>(state: SimulationState<TData>): SimulationState<TData> {
  const lastIndex = state.steps.length - 1;
  if (state.steps.length === 0) return state;
  if (state.currentStepIndex >= lastIndex) {
    return setStatus({ ...state, currentStepIndex: lastIndex }, 'completed');
  }
  const currentStepIndex = state.currentStepIndex + 1;
  const status: SimulationStatus =
    currentStepIndex === lastIndex ? 'completed' : state.status === 'idle' ? 'paused' : state.status;
  return { ...state, currentStepIndex, status };
}

/** Step backwards, always ending in a paused state. */
export function previousStep<TData>(state: SimulationState<TData>): SimulationState<TData> {
  if (state.steps.length === 0) return state;
  const currentStepIndex = clamp(state.currentStepIndex - 1, 0, state.steps.length - 1);
  return { ...state, currentStepIndex, status: 'paused' };
}

/** Rewind to the first step and clear any error. */
export function resetSimulation<TData>(state: SimulationState<TData>): SimulationState<TData> {
  return { ...state, status: 'idle', currentStepIndex: 0, error: null };
}

export function setParameters<TData>(
  state: SimulationState<TData>,
  parameters: Readonly<Record<string, ParameterValue>>,
): SimulationState<TData> {
  return { ...state, parameters: { ...state.parameters, ...parameters } };
}

export function setError<TData>(
  state: SimulationState<TData>,
  error: string | null,
): SimulationState<TData> {
  return { ...state, status: error === null ? 'paused' : 'error', error };
}

/** Current step, or `undefined` for an empty run. */
export function currentStep<TData>(
  state: SimulationState<TData>,
): SimulationStep<TData> | undefined {
  return state.steps[state.currentStepIndex];
}

export function lastStepIndex<TData>(state: SimulationState<TData>): number {
  return Math.max(0, state.steps.length - 1);
}

export function isAtStart<TData>(state: SimulationState<TData>): boolean {
  return state.currentStepIndex <= 0;
}

export function isAtEnd<TData>(state: SimulationState<TData>): boolean {
  return state.steps.length === 0 || state.currentStepIndex >= state.steps.length - 1;
}

/** Fraction of the run already played, in `[0, 1]`. */
export function progress<TData>(state: SimulationState<TData>): number {
  if (state.steps.length <= 1) return state.steps.length === 1 ? 1 : 0;
  return state.currentStepIndex / (state.steps.length - 1);
}

/** Milliseconds to wait between steps at the configured speed. */
export function stepDurationMs<TData>(state: SimulationState<TData>, baseMs = 900): number {
  return Math.round(baseMs / clampSpeed(state.speed));
}
