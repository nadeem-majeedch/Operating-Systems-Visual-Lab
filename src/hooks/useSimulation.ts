import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SimulationState, SimulationStep } from '@/types';
import {
  clampSpeed,
  currentStep as currentStepOf,
  goToStep,
  isAtEnd,
  isAtStart,
  nextStep as nextStepOf,
  pause as pauseState,
  play as playState,
  previousStep as previousStepOf,
  progress as progressOf,
  resetSimulation,
  setStatus,
} from '@/engine';

export interface UseSimulationOptions<TData> {
  /** Initial state; usually `run.state` produced by an engine. */
  readonly initialState: SimulationState<TData>;
  /** Base delay between automatic steps, in milliseconds. */
  readonly baseStepMs?: number;
}

export interface UseSimulationResult<TData> {
  readonly state: SimulationState<TData>;
  readonly step: SimulationStep<TData> | undefined;
  readonly isPlaying: boolean;
  readonly canStepForward: boolean;
  readonly canStepBackward: boolean;
  readonly progress: number;
  readonly speed: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  goToStep: (index: number) => void;
  setSpeed: (speed: number) => void;
  /** Replace the whole run (the input changed) and rewind playback. */
  load: (state: SimulationState<TData>) => void;
}

/**
 * Playback controller for any engine's `SimulationState`. Every transition comes
 * from the pure helpers in `src/engine/core/state.ts`; this hook only owns
 * timing and React state.
 */
export function useSimulation<TData>({
  initialState,
  baseStepMs = 900,
}: UseSimulationOptions<TData>): UseSimulationResult<TData> {
  const [state, setState] = useState<SimulationState<TData>>(initialState);

  const load = useCallback((next: SimulationState<TData>) => {
    setState({ ...next, status: 'idle', currentStepIndex: 0, error: null });
  }, []);

  const play = useCallback(() => setState((previous) => playState(previous)), []);
  const pause = useCallback(() => setState((previous) => pauseState(previous)), []);
  const stepForward = useCallback(() => setState((previous) => nextStepOf(previous)), []);
  const stepBackward = useCallback(() => setState((previous) => previousStepOf(previous)), []);
  const reset = useCallback(() => setState((previous) => resetSimulation(previous)), []);
  const setSpeed = useCallback(
    (speed: number) => setState((previous) => ({ ...previous, speed: clampSpeed(speed) })),
    [],
  );
  const jumpTo = useCallback(
    (index: number) => setState((previous) => setStatus(goToStep(previous, index), 'paused')),
    [],
  );
  const togglePlay = useCallback(() => {
    setState((previous) =>
      previous.status === 'running' ? pauseState(previous) : playState(previous),
    );
  }, []);

  const { status, speed } = state;

  // Auto-advance while running. Recreated only when playback rate changes.
  useEffect(() => {
    if (status !== 'running') return undefined;
    const duration = Math.max(60, Math.round(baseStepMs / speed));
    const timer = window.setInterval(() => {
      setState((previous) => nextStepOf(previous));
    }, duration);
    return () => window.clearInterval(timer);
  }, [status, speed, baseStepMs]);

  const step = currentStepOf(state);

  return useMemo<UseSimulationResult<TData>>(
    () => ({
      state,
      step,
      isPlaying: state.status === 'running',
      canStepForward: !isAtEnd(state),
      canStepBackward: !isAtStart(state),
      progress: progressOf(state),
      speed: state.speed,
      play,
      pause,
      togglePlay,
      stepForward,
      stepBackward,
      reset,
      goToStep: jumpTo,
      setSpeed,
      load,
    }),
    [state, step, play, pause, togglePlay, stepForward, stepBackward, reset, jumpTo, setSpeed, load],
  );
}
