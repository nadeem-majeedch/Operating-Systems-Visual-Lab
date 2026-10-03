import type { SimulationConfig, SimulationStep } from '@/types';
import { assertValid, createSimulationState, createStep } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import { applyScriptStep } from './actions';
import { seedSystem, systemMetrics, runningPid } from './system';
import type {
  ProcessEvent,
  ProcessLifecycleInput,
  ProcessStepData,
  ProcessSystem,
} from './types';
import { validateLifecycleInput } from './validate';

export const PROCESS_ALGORITHM_ID = 'process-state-machine';
export const PROCESS_LAB_ID = 'lab-process-lifecycle';
export const PROCESS_ENGINE_ID = 'process-state-engine';

/** Numeric readouts attached to every lifecycle step. */
export function processStepMetrics(system: ProcessSystem): Record<string, number> {
  const metrics = systemMetrics(system);
  return {
    created: metrics.created,
    ready: metrics.ready,
    running: metrics.running,
    waiting: metrics.waiting,
    terminated: metrics.terminated,
    contextSwitches: metrics.contextSwitches,
    clock: system.clock,
  };
}

/**
 * The per-step snapshot the visualisation renders.
 *
 * Kept as a pure function of the system so the interactive UI can render any
 * historical snapshot without re-running the engine.
 */
export function snapshot(system: ProcessSystem, event?: ProcessEvent | null): ProcessStepData {
  return {
    processes: system.processes.map((process) => ({ ...process })),
    clock: system.clock,
    runningPid: runningPid(system),
    contextSwitches: system.contextSwitches,
    transition: event?.transition ?? null,
    fromState: event?.fromState ?? null,
    toState: event?.toState ?? null,
    contextSwitch: event?.contextSwitch ?? false,
  };
}

function eventStepData(system: ProcessSystem, event: ProcessEvent): ProcessStepData {
  return snapshot(system, event);
}

function eventToDraft(system: ProcessSystem, event: ProcessEvent) {
  return {
    label: event.label,
    description: event.description,
    explanation: event.explanation,
    clock: event.clock,
    data: eventStepData(system, event),
    highlights: event.highlights,
    metrics: processStepMetrics(system),
  };
}

/**
 * Replay an authored scenario into an ordered list of explainable steps.
 *
 * The engine is deterministic: the same input and script always produce the
 * same steps. Each step carries the state of every PCB, so the UI can scrub
 * forwards and backwards without re-simulating.
 */
export function runLifecycle(
  input: ProcessLifecycleInput,
  config: SimulationConfig = {},
): SimulationRun<ProcessStepData> {
  assertValid(validateLifecycleInput(input), 'Process lifecycle');

  let system = seedSystem(input);
  const steps: SimulationStep<ProcessStepData>[] = [];

  // Step 0 always describes the freshly seeded system.
  steps.push(
    createStep<ProcessStepData>(
      {
        label: 'System initialised',
        description:
          system.processes.length === 0
            ? 'An empty system: no processes and a clock at zero.'
            : `${system.processes.length} process${
                system.processes.length === 1 ? '' : 'es'
              } created; all start in the new state.`,
        explanation:
          'Every process begins life in the new state with a PCB that records its PID, parent, priority and a zeroed CPU-time counter. Nothing can run until it is admitted to the ready queue.',
        clock: 0,
        data: snapshot(system),
        highlights: system.processes.map((process) => process.name),
        metrics: processStepMetrics(system),
      },
      0,
    ),
  );
  system = { ...system, sequence: 1 };

  for (const scriptStep of input.script ?? []) {
    const outcome = applyScriptStep(system, scriptStep);
    if (!outcome.ok) {
      throw new Error(`Process lifecycle script step failed: ${outcome.error}`);
    }
    system = outcome.system;
    steps.push(createStep<ProcessStepData>(eventToDraft(system, outcome.event), steps.length));
  }

  const metrics = systemMetrics(system);

  return {
    algorithmId: PROCESS_ALGORITHM_ID,
    labId: PROCESS_LAB_ID,
    input: {
      seeds: system.processes.length,
      steps: input.script?.length ?? 0,
    },
    steps,
    state: createSimulationState<ProcessStepData>({
      labId: PROCESS_LAB_ID,
      algorithmId: PROCESS_ALGORITHM_ID,
      steps,
      speed: config.speed,
    }),
    summary: {
      created: metrics.created,
      terminated: metrics.terminated,
      contextSwitches: metrics.contextSwitches,
      clock: system.clock,
    },
  };
}

/** The engine object consumed by the registry and generic lab tooling. */
export const processLifecycleEngine: SimulationEngine<ProcessLifecycleInput, ProcessStepData> = {
  id: PROCESS_ENGINE_ID,
  algorithmId: PROCESS_ALGORITHM_ID,
  labId: PROCESS_LAB_ID,
  name: 'Process State Machine',
  description:
    'Drives a process through new, ready, running, waiting and terminated while recording the PCB bookkeeping each transition implies.',
  validate: validateLifecycleInput,
  run: runLifecycle,
};
