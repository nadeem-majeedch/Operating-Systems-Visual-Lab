import { describe, expect, it } from 'vitest';
import type {
  Algorithm,
  EducationalExample,
  Lab,
  SimulationState,
  SimulationStep,
  Topic,
} from '@/types';
import { DIFFICULTY_ORDER } from '@/types';
import {
  clampSpeed,
  computeMetrics,
  createSimulationState,
  createStep,
  nextStep,
  progress,
  type ProcessResult,
  type ScheduleMetrics,
  type ScheduleStepData,
} from '@/engine';

/**
 * These fixtures are typed with the real domain models, so a change to a model
 * that breaks the schema also breaks this file at compile time, and the
 * assertions below pin the runtime shape the rest of the app relies on.
 */
const example: EducationalExample<readonly number[]> = {
  id: 'example-1',
  title: 'Minimal example',
  scenario: 'A tiny scenario used to pin the model contract.',
  difficulty: 'beginner',
  input: [1, 2, 3],
  expectedOutcome: 'The schedule completes in three time units.',
  discussion: ['Why does order matter here?'],
  hints: ['Start from arrival time zero.'],
};

const lab: Lab<readonly number[]> = {
  id: 'lab-contract',
  topicId: 'cpu-scheduling',
  title: 'Model contract lab',
  summary: 'Exercises the Lab model.',
  description: 'A lab whose only purpose is to keep the domain model stable.',
  difficulty: 'intermediate',
  status: 'planned',
  estimatedMinutes: 10,
  algorithmIds: ['fcfs'],
  objectives: ['Keep the model honest'],
  examples: [example],
};

const topic: Topic = {
  id: 'cpu-scheduling',
  title: 'CPU Scheduling',
  tagline: 'Who runs next?',
  description: 'Scheduling policy decides how a CPU is shared.',
  glyph: '⏱️',
  accent: '#6366f1',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  prerequisites: [],
  objectives: ['Compute waiting time'],
  labs: [lab],
};

const algorithm: Algorithm = {
  id: 'fcfs',
  name: 'First Come, First Served',
  abbreviation: 'FCFS',
  topicId: 'cpu-scheduling',
  summary: 'Run in arrival order.',
  description: 'Non-preemptive scheduling in strict arrival order.',
  difficulty: 'beginner',
  status: 'available',
  parameters: [
    {
      id: 'quantum',
      name: 'Quantum',
      description: 'Unused by FCFS but declared for the contract test.',
      kind: 'number',
      defaultValue: 4,
      min: 1,
      max: 10,
      step: 1,
    },
  ],
  properties: { preemptive: false, optimal: false, online: true, timeComplexity: 'O(n log n)' },
  tags: ['non-preemptive'],
};

describe('domain model contracts', () => {
  it('models a topic that owns labs that own examples', () => {
    expect(topic.labs[0]?.id).toBe(lab.id);
    expect(topic.labs[0]?.examples[0]?.id).toBe(example.id);
    expect(topic.labs[0]?.topicId).toBe(topic.id);
  });

  it('keeps nested content read-only by convention', () => {
    // Types are `readonly`; mutating through a cast would be a bug, so the test
    // documents that the published shapes are the ones authored above.
    expect(Object.keys(lab)).toContain('algorithmIds');
    expect(lab.status).toBe('planned');
  });

  it('orders difficulty levels from easiest to hardest', () => {
    expect(DIFFICULTY_ORDER).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(DIFFICULTY_ORDER.indexOf(example.difficulty)).toBeLessThan(
      DIFFICULTY_ORDER.indexOf(lab.difficulty),
    );
  });

  it('describes an algorithm with parameters and properties', () => {
    expect(algorithm.parameters[0]?.kind).toBe('number');
    expect(algorithm.properties.preemptive).toBe(false);
    expect(algorithm.topicId).toBe('cpu-scheduling');
  });

  it('treats the example input as optional for conceptual labs', () => {
    const conceptual: EducationalExample = {
      id: 'conceptual',
      title: 'Conceptual',
      scenario: 'No simulator yet, so no loadable input.',
      difficulty: 'intermediate',
      expectedOutcome: 'Reason it out on paper.',
      discussion: ['What would change with more frames?'],
      hints: [],
    };
    expect(conceptual.input).toBeUndefined();
  });
});

const result: ProcessResult = {
  processId: 'p1',
  processName: 'P1',
  arrivalTime: 0,
  burstTime: 4,
  startTime: 0,
  completionTime: 4,
  turnaroundTime: 4,
  waitingTime: 0,
  responseTime: 0,
};

const metrics: ScheduleMetrics = computeMetrics({
  timeline: [{ id: 's1', processId: 'p1', label: 'P1', start: 0, end: 4 }],
  results: [result],
});

const step: SimulationStep<ScheduleStepData> = createStep<ScheduleStepData>(
  {
    label: 'P1 completes',
    description: 'P1 runs from t=0 to t=4.',
    clock: 4,
    data: {
      timeline: [{ id: 's1', processId: 'p1', label: 'P1', start: 0, end: 4 }],
      results: [result],
      readyQueue: [],
      runningProcessId: 'p1',
      clock: 4,
      metrics,
    },
    highlights: ['P1'],
    metrics: { makespan: 4 },
  },
  0,
);

describe('simulation models', () => {
  it('builds a step with a stable id, index and clock', () => {
    expect(step.id).toBe('p1-completes-0');
    expect(step.index).toBe(0);
    expect(step.clock).toBe(4);
    expect(step.highlights).toEqual(['P1']);
  });

  it('carries a typed data snapshot', () => {
    expect(step.data.results[0]?.processName).toBe('P1');
    expect(step.data.metrics.makespan).toBe(4);
    expect(step.data.readyQueue).toEqual([]);
  });

  it('creates a state that references the step list', () => {
    const state: SimulationState<ScheduleStepData> = createSimulationState<ScheduleStepData>({
      labId: 'lab-fcfs',
      algorithmId: 'fcfs',
      steps: [step],
      parameters: { speed: 1 },
    });

    expect(state.steps).toHaveLength(1);
    expect(state.parameters.speed).toBe(1);
    expect(state.error).toBeNull();
    expect(clampSpeed(state.speed)).toBe(1);
  });

  it('moves through steps and reports progress', () => {
    const steps = [step, { ...step, id: 'p1-completes-1', index: 1 }];
    const state = createSimulationState<ScheduleStepData>({
      labId: 'lab-fcfs',
      algorithmId: 'fcfs',
      steps,
    });

    expect(progress(state)).toBe(0);
    const advanced = nextStep(state);
    expect(advanced.currentStepIndex).toBe(1);
    expect(advanced.status).toBe('completed');
    expect(progress(advanced)).toBe(1);
  });
});
