import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEED,
  MAX_SPEED,
  MIN_SPEED,
  clampSpeed,
  createSimulationState,
  createStep,
  createSteps,
  currentStep,
  finalMetrics,
  goToStep,
  isAtEnd,
  isAtStart,
  nextStep,
  pause,
  play,
  previousStep,
  progress,
  resetSimulation,
  setError,
  setParameters,
  stepDurationMs,
} from '@/engine';

interface Dummy {
  readonly value: number;
}

function buildState(stepCount = 3) {
  const steps = createSteps<Dummy>(
    Array.from({ length: stepCount }, (_, index) => ({
      label: `Step ${index}`,
      description: `Description ${index}`,
      clock: index,
      data: { value: index },
      metrics: { clock: index },
    })),
  );
  return createSimulationState<Dummy>({
    labId: 'lab-test',
    algorithmId: 'test',
    steps,
  });
}

describe('createStep', () => {
  it('produces deterministic ids and copies the draft', () => {
    const step = createStep<Dummy>(
      { label: 'Init', description: 'Starting', clock: 0, data: { value: 1 } },
      0,
    );
    expect(step.id).toBe('init-0');
    expect(step.index).toBe(0);
    expect(step.highlights).toEqual([]);
    expect(step.metrics).toBeUndefined();
  });

  it('rounds metric values', () => {
    const step = createStep<Dummy>(
      {
        label: 'Metrics',
        description: 'With numbers',
        clock: 0,
        data: { value: 1 },
        metrics: { ratio: 1 / 3 },
      },
      1,
    );
    expect(step.metrics?.ratio).toBe(0.33);
  });
});

describe('createSimulationState', () => {
  it('starts idle at the first step', () => {
    const state = buildState();
    expect(state.status).toBe('idle');
    expect(state.currentStepIndex).toBe(0);
    expect(state.speed).toBe(DEFAULT_SPEED);
    expect(state.error).toBeNull();
    expect(state.steps).toHaveLength(3);
  });

  it('clamps an out-of-range speed', () => {
    const state = createSimulationState<Dummy>({
      labId: 'lab',
      algorithmId: 'a',
      steps: [],
      speed: 99,
    });
    expect(state.speed).toBe(MAX_SPEED);
  });
});

describe('speed helpers', () => {
  it('clamps and recovers from non-finite values', () => {
    expect(clampSpeed(0.01)).toBe(MIN_SPEED);
    expect(clampSpeed(99)).toBe(MAX_SPEED);
    expect(clampSpeed(Number.NaN)).toBe(DEFAULT_SPEED);
  });

  it('shortens the delay at higher speeds', () => {
    const slow = createSimulationState<Dummy>({ labId: 'l', algorithmId: 'a', steps: [], speed: 1 });
    const fast = createSimulationState<Dummy>({ labId: 'l', algorithmId: 'a', steps: [], speed: 2 });
    expect(stepDurationMs(fast, 1000)).toBeLessThan(stepDurationMs(slow, 1000));
  });
});

describe('step navigation', () => {
  it('advances and marks the final step complete', () => {
    let state = play(buildState());
    expect(state.status).toBe('running');

    state = nextStep(state);
    expect(state.currentStepIndex).toBe(1);
    expect(state.status).toBe('running');

    state = nextStep(state);
    expect(state.currentStepIndex).toBe(2);
    expect(state.status).toBe('completed');
    expect(isAtEnd(state)).toBe(true);
  });

  it('stays put once completed', () => {
    let state = buildState(2);
    state = nextStep(state);
    state = nextStep(state);
    const after = nextStep(state);
    expect(after.currentStepIndex).toBe(1);
    expect(after.status).toBe('completed');
  });

  it('rewinds and pauses', () => {
    let state = play(buildState());
    state = nextStep(state);
    state = previousStep(state);
    expect(state.currentStepIndex).toBe(0);
    expect(state.status).toBe('paused');
    expect(isAtStart(state)).toBe(true);
  });

  it('clamps direct jumps', () => {
    const state = buildState(3);
    expect(goToStep(state, 99).currentStepIndex).toBe(2);
    expect(goToStep(state, -5).currentStepIndex).toBe(0);
  });

  it('is a no-op for an empty run', () => {
    const empty = createSimulationState<Dummy>({ labId: 'l', algorithmId: 'a', steps: [] });
    expect(nextStep(empty)).toBe(empty);
    expect(previousStep(empty)).toBe(empty);
    expect(goToStep(empty, 2)).toBe(empty);
    expect(play(empty)).toBe(empty);
    expect(isAtEnd(empty)).toBe(true);
  });

  it('does not resume a completed run when paused', () => {
    let state = buildState(1);
    state = nextStep(state);
    expect(state.status).toBe('completed');
    expect(pause(state).status).toBe('completed');
  });
});

describe('reset, parameters and errors', () => {
  it('rewinds to the first step and clears the error', () => {
    let state = setError(buildState(), 'boom');
    state = nextStep(state);
    const reset = resetSimulation(state);
    expect(reset.currentStepIndex).toBe(0);
    expect(reset.status).toBe('idle');
    expect(reset.error).toBeNull();
  });

  it('transitions to the error status', () => {
    const state = setError(buildState(), 'invalid input');
    expect(state.status).toBe('error');
    expect(state.error).toBe('invalid input');
  });

  it('merges parameters', () => {
    const state = setParameters(buildState(), { quantum: 4 });
    expect(state.parameters).toEqual({ quantum: 4 });
  });
});

describe('derived selectors', () => {
  it('exposes the current step', () => {
    const state = goToStep(buildState(), 1);
    expect(currentStep(state)?.index).toBe(1);
  });

  it('computes progress in [0, 1]', () => {
    expect(progress(buildState(3))).toBe(0);
    expect(progress(goToStep(buildState(3), 2))).toBe(1);
    expect(progress(goToStep(buildState(3), 1))).toBe(0.5);
    expect(progress(createSimulationState<Dummy>({ labId: 'l', algorithmId: 'a', steps: [] }))).toBe(0);
  });

  it('reads metrics from the last step that has them', () => {
    const steps = createSteps<Dummy>([
      { label: 'A', description: 'a', clock: 0, data: { value: 0 }, metrics: { score: 1 } },
      { label: 'B', description: 'b', clock: 1, data: { value: 1 } },
    ]);
    expect(finalMetrics(steps)).toEqual({ score: 1 });
    expect(finalMetrics([])).toEqual({});
  });
});
