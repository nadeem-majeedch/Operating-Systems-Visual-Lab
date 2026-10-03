import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  DeadlockTone,
  RagEdgeView,
  RagInput,
  RagNodeView,
  RagStage,
  RagStepData,
} from './types';
import {
  MAX_MATRIX_VALUE,
  MAX_RAG_INSTANCES,
  MAX_RAG_PROCESSES,
  MAX_RAG_RESOURCES,
  MIN_RAG_INSTANCES,
  MIN_RAG_PROCESSES,
  MIN_RAG_RESOURCES,
} from './types';
import { cell, cloneVector, computeAvailable, findCycle, rowOf, runReduction } from './matrices';

export const RAG_ALGORITHM_ID = 'wait-for-graph';
export const RAG_ENGINE_ID = 'wait-for-graph-engine';
export const RAG_LAB_ID = 'lab-wait-for-graph';

function validMatrix(matrix: readonly (readonly number[])[], rows: number, columns: number): boolean {
  if (matrix.length !== rows) return false;
  return matrix.every(
    (row) =>
      row.length === columns &&
      row.every((value) => Number.isInteger(value) && value >= 0 && value <= MAX_MATRIX_VALUE),
  );
}

export function validateRagInput(input: RagInput): ValidationResult {
  const collector = new ValidationCollector();
  const processCount = input.processes.length;
  const resourceCount = input.resources.length;

  collector
    .addIf(
      processCount < MIN_RAG_PROCESSES || processCount > MAX_RAG_PROCESSES,
      'processes',
      `processes must contain between ${MIN_RAG_PROCESSES} and ${MAX_RAG_PROCESSES} names`,
    )
    .addIf(
      resourceCount < MIN_RAG_RESOURCES || resourceCount > MAX_RAG_RESOURCES,
      'resources',
      `resources must contain between ${MIN_RAG_RESOURCES} and ${MAX_RAG_RESOURCES} names`,
    );

  if (processCount >= MIN_RAG_PROCESSES && resourceCount >= MIN_RAG_RESOURCES) {
    if (input.instances.length !== resourceCount) {
      collector.add('instances', `instances must have ${resourceCount} entries`);
    } else if (
      !input.instances.every(
        (value) =>
          Number.isInteger(value) && value >= MIN_RAG_INSTANCES && value <= MAX_RAG_INSTANCES,
      )
    ) {
      collector.add('instances', `each resource owns between ${MIN_RAG_INSTANCES} and ${MAX_RAG_INSTANCES} instances`);
    }

    collector
      .addIf(!validMatrix(input.allocation, processCount, resourceCount), 'allocation', 'allocation must be a process×resource matrix of non-negative integers')
      .addIf(!validMatrix(input.requests, processCount, resourceCount), 'requests', 'requests must be a process×resource matrix of non-negative integers');

    // Nobody may hold or request more units of a resource than exist.
    if (validMatrix(input.allocation, processCount, resourceCount) && input.instances.length === resourceCount) {
      for (let resource = 0; resource < resourceCount; resource += 1) {
        let held = 0;
        for (let process = 0; process < processCount; process += 1) held += cell(input.allocation, process, resource);
        const total = input.instances[resource] ?? 0;
        if (held > total) {
          collector.add('allocation', `resource ${resource} has ${held} units allocated but only ${total} instances`);
        }
      }
    }
  }

  return collector.toResult();
}

export function ragStepMetrics(data: RagStepData): Record<string, number> {
  return {
    nodes: data.nodes.length,
    edges: data.edges.length,
    waitForEdges: data.waitForEdges.length,
    cycle: data.cycle.length,
    deadlocked: data.deadlocked === null ? -1 : data.deadlocked ? 1 : 0,
    waiting: data.nodes.filter((node) => node.tone === 'warning').length,
  };
}

/**
 * Build the wait-for edges implied by the current requests and allocations.
 *
 * This is the textbook collapse: a request for a resource held by another
 * process becomes a process → process edge, regardless of whether a spare
 * instance exists. That is exactly why the collapse can over-approximate when
 * resources have several instances, which the reduction algorithm then settles.
 */
export function buildWaitForEdges(input: RagInput): {
  readonly edges: readonly (readonly [number, number])[];
  readonly free: readonly number[];
} {
  const processCount = input.processes.length;
  const resourceCount = input.resources.length;
  const free = computeAvailable(input.instances, input.allocation);
  const edges: [number, number][] = [];
  for (let process = 0; process < processCount; process += 1) {
    for (let resource = 0; resource < resourceCount; resource += 1) {
      const wanted = cell(input.requests, process, resource);
      if (wanted <= 0) continue;
      for (let holder = 0; holder < processCount; holder += 1) {
        if (holder === process) continue;
        if (cell(input.allocation, holder, resource) > 0) edges.push([process, holder]);
      }
    }
  }
  // De-duplicate while keeping deterministic order.
  const seen = new Set<string>();
  const unique: [number, number][] = [];
  for (const [from, to] of edges) {
    const key = `${from}->${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push([from, to]);
  }
  return { edges: unique, free };
}

interface RagView {
  nodes: RagNodeView[];
  edges: RagEdgeView[];
  waitForEdges: RagEdgeView[];
  cycle: string[];
  deadlocked: boolean | null;
  work: number[];
  finished: boolean[];
  finishedOrder: string[];
  stage: RagStage;
  tone: DeadlockTone;
}

/**
 * Resource-allocation graph + deadlock detection.
 *
 * The graph is revealed edge by edge, then collapsed into a wait-for graph. For
 * single-instance resources a cycle *is* a deadlock; when resources have several
 * instances the engine instead runs the reduction algorithm and explains that a
 * cycle is only a necessary condition — the free instances may allow the cycle
 * to unwind.
 */
export function runRag(input: RagInput, config: SimulationConfig = {}): SimulationRun<RagStepData> {
  assertValid(validateRagInput(input), 'Resource-allocation graph');

  const processes = [...input.processes];
  const resources = [...input.resources];
  const processCount = processes.length;
  const resourceCount = resources.length;
  const processName = (index: number): string => processes[index] ?? `P${index + 1}`;
  const resourceName = (index: number): string => resources[index] ?? `R${index + 1}`;
  const processId = (index: number): string => `p${index}`;
  const resourceId = (index: number): string => `r${index}`;

  const singleInstance = input.instances.every((value) => value === 1);
  const { edges: waitEdges, free } = buildWaitForEdges(input);
  const cycle = findCycle(processCount, waitEdges);
  const cycleSet = new Set((cycle ?? []).map(processId));

  const cycleTone: DeadlockTone = singleInstance ? 'danger' : 'warning';
  const nodes: RagNodeView[] = [
    ...processes.map((name, index): RagNodeView => ({
      id: processId(index),
      name,
      kind: 'process',
      ...(cycleSet.has(processId(index)) ? { tone: cycleTone } : {}),
    })),
    ...resources.map((name, index): RagNodeView => ({
      id: resourceId(index),
      name,
      kind: 'resource',
      instances: input.instances[index] ?? 0,
      free: free[index] ?? 0,
    })),
  ];

  const allocationEdges: RagEdgeView[] = [];
  const requestEdges: RagEdgeView[] = [];
  for (let process = 0; process < processCount; process += 1) {
    for (let resource = 0; resource < resourceCount; resource += 1) {
      const held = cell(input.allocation, process, resource);
      const wanted = cell(input.requests, process, resource);
      if (held > 0) {
        allocationEdges.push({
          id: `a${process}-${resource}`,
          from: resourceId(resource),
          to: processId(process),
          kind: 'allocation',
          label: `${held}×${resourceName(resource)}`,
          highlight: false,
          cycle: false,
        });
      }
      if (wanted > 0) {
        requestEdges.push({
          id: `q${process}-${resource}`,
          from: processId(process),
          to: resourceId(resource),
          kind: 'request',
          label: `${wanted}×${resourceName(resource)}`,
          highlight: false,
          cycle: false,
        });
      }
    }
  }

  const cycleEdgeIds = new Set<string>();
  if (cycle) {
    for (let index = 0; index < cycle.length; index += 1) {
      const from = cycle[index] ?? 0;
      const to = cycle[(index + 1) % cycle.length] ?? 0;
      for (let resource = 0; resource < resourceCount; resource += 1) {
        if (
          cell(input.requests, from, resource) > 0 &&
          cell(input.allocation, to, resource) > 0
        ) {
          cycleEdgeIds.add(`q${from}-${resource}`);
          cycleEdgeIds.add(`a${to}-${resource}`);
        }
      }
    }
  }

  const markCycle = (edges: readonly RagEdgeView[]): RagEdgeView[] =>
    edges.map((edge) => ({
      ...edge,
      cycle: cycleEdgeIds.has(edge.id),
      highlight: cycleEdgeIds.has(edge.id),
    }));

  const baseWaitEdges: RagEdgeView[] = waitEdges.map(([from, to]) => {
    const id = `w${from}-${to}`;
    const inCycle =
      cycle !== null &&
      cycle.some((node, index) => node === from && (cycle[(index + 1) % cycle.length] ?? -1) === to);
    return {
      id,
      from: processId(from),
      to: processId(to),
      kind: 'wait' as const,
      label: `${processName(from)} waits for ${processName(to)}`,
      highlight: inCycle,
      cycle: inCycle,
    };
  });

  const view: RagView = {
    nodes,
    edges: [],
    waitForEdges: [],
    cycle: [],
    deadlocked: null,
    work: cloneVector(free),
    finished: Array.from({ length: processCount }, () => false),
    finishedOrder: [],
    stage: 'nodes',
    tone: 'default',
  };

  const drafts: StepDraft<RagStepData>[] = [];

  const snapshot = (summary: string): RagStepData => ({
    kind: 'rag',
    stage: view.stage,
    summary,
    nodes: view.nodes.map((node) => ({ ...node })),
    edges: view.edges.map((edge) => ({ ...edge })),
    waitForEdges: view.waitForEdges.map((edge) => ({ ...edge })),
    cycle: [...view.cycle],
    deadlocked: view.deadlocked,
    singleInstance,
    work: [...view.work],
    finished: [...view.finished],
    available: [...free],
    finishedOrder: [...view.finishedOrder],
    tone: view.tone,
  });

  const draft = (
    label: string,
    description: string,
    explanation: string,
    highlights: readonly string[],
  ): void => {
    const data = snapshot(label);
    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights,
      metrics: ragStepMetrics(data),
    });
  };

  /* ----------------------------------------------------------------- nodes -- */
  view.stage = 'nodes';
  view.edges = [];
  view.waitForEdges = [];
  draft(
    'Build the resource-allocation graph',
    `${processCount} process node${processCount === 1 ? '' : 's'} and ${resourceCount} resource node${
      resourceCount === 1 ? '' : 's'
    }${singleInstance ? ', one instance each' : ''}.`,
    'The graph has two kinds of node: processes (circles) and resource types (rectangles). A resource node with several instances is drawn with one dot per instance, which is what makes the multi-instance case different.',
    processes,
  );

  /* ----------------------------------------------------------- allocations -- */
  view.stage = 'allocations';
  view.edges = markCycle(allocationEdges);
  draft(
    'Record the allocation edges',
    allocationEdges.length === 0
      ? 'No resources are currently held — the graph has no allocation edges yet.'
      : `${allocationEdges.length} allocation edge${allocationEdges.length === 1 ? '' : 's'} point from resources to the processes holding them.`,
    'An allocation edge always points resource → process: it says "this instance is currently in that process’s hands." Every allocated instance leaves the resource node with one fewer free dot.',
    processes,
  );

  /* -------------------------------------------------------------- requests -- */
  view.stage = 'requests';
  view.edges = markCycle([...allocationEdges, ...requestEdges]);
  const waitingProcesses = processes.filter((_, process) =>
    requestEdges.some((edge) => edge.from === processId(process)),
  );
  draft(
    'Record the request edges',
    requestEdges.length === 0
      ? 'No process is currently requesting a resource.'
      : `${requestEdges.length} request edge${requestEdges.length === 1 ? '' : 's'} point from processes to the resources they want.`,
    'A request edge points process → resource: "this process is asking for an instance." A process with an incoming allocation edge and an outgoing request edge is holding one resource while waiting for another — the shape of hold-and-wait.',
    waitingProcesses,
  );

  /* --------------------------------------------------------------- collapse -- */
  view.stage = 'collapse';
  view.edges = markCycle([...allocationEdges, ...requestEdges]);
  view.waitForEdges = baseWaitEdges.map((edge) => ({ ...edge }));
  draft(
    singleInstance
      ? 'Collapse to a wait-for graph'
      : 'A wait-for graph alone is not enough here',
    singleInstance
      ? `${baseWaitEdges.length} process→process wait edge${baseWaitEdges.length === 1 ? '' : 's'}.`
      : `The collapse suggests ${baseWaitEdges.length} wait edge${baseWaitEdges.length === 1 ? '' : 's'}, but resources have multiple instances, so those edges are only a hint.`,
    singleInstance
      ? 'With exactly one instance per resource, a request edge process → resource followed by an allocation edge resource → holder can be collapsed into a single process → process wait edge. A cycle in this collapsed graph is necessary and sufficient for deadlock.'
      : 'When a resource type has several instances a process may be satisfiable from the free instances without waiting for any holder, so collapsing the graph can invent edges that are not real waits. The reduction algorithm is the reliable test.',
    processes,
  );

  /* ---------------------------------------------------------------- detect -- */
  view.stage = 'detect';

  if (singleInstance) {
    view.cycle = (cycle ?? []).map(processId);
    view.deadlocked = cycle !== null;
    view.tone = cycle ? 'danger' : 'positive';
    view.waitForEdges = baseWaitEdges.map((edge) => ({ ...edge }));
    view.finished = Array.from({ length: processCount }, () => cycle === null);
    draft(
      cycle ? 'A cycle closes — deadlock' : 'No cycle — no deadlock',
      cycle
        ? `${cycle.map(processName).join(' → ')} → ${processName(cycle[0] ?? 0)} forms a circular wait.`
        : 'Every wait chain ends at a process that is not waiting, so the graph is acyclic.',
      cycle
        ? 'With one instance per resource, a cycle in the wait-for graph is both necessary and sufficient for deadlock: every process on the cycle holds what the next one wants, and none can proceed. This is a genuine deadlock, not merely a risk of one.'
        : 'An acyclic wait-for graph proves the system is not deadlocked. Every process can eventually be satisfied because no chain of waits loops back on itself.',
      cycle ? cycle.map(processName) : processes,
    );
  } else {
    view.cycle = (cycle ?? []).map(processId);
    const outcome = runReduction(input.allocation, input.requests, free, processCount);
    view.work = cloneVector(free);
    view.finished = Array.from({ length: processCount }, (_, process) =>
      rowOf(input.requests, process).every((value) => value === 0),
    );
    view.finishedOrder = [];
    view.deadlocked = outcome.deadlocked;
    view.tone = outcome.deadlocked ? 'danger' : 'positive';
    draft(
      'Run the reduction algorithm',
      `Work starts at [${free.join(', ')}]; a process with no outstanding request already counts as finished.`,
      'The reduction algorithm is the correct test for multiple instances. Repeatedly, a process whose whole request vector fits in the available work is finished and its holdings returned; if some process can never be finished it is deadlocked.',
      processes,
    );

    for (const process of outcome.sequence) {
      const before = view.work;
      view.work = cloneVector(reductionWorkStep(view.work, input.allocation, process, resourceCount));
      view.finished[process] = true;
      view.finishedOrder.push(processName(process));
      draft(
        `${processName(process)} can finish`,
        `${processName(process)} requested [${rowOf(input.requests, process).join(', ')}] which fits work [${before.join(
          ', ',
        )}], so it completes and releases [${rowOf(input.allocation, process).join(', ')}].`,
        `Work rises to [${view.work.join(', ')}]. Releasing a process’s holdings is exactly how a real system would recover — the resource is returned and a blocked process can be woken.`,
        [processName(process)],
      );
    }

    if (outcome.deadlocked) {
      view.tone = 'danger';
      draft(
        'Some processes cannot finish — deadlock',
        `${outcome.remaining.map(processName).join(', ')} can never have their requests satisfied by work [${view.work.join(', ')}].`,
        'These processes are deadlocked: with every satisfiable process finished and their resources returned, their requests still cannot be met. Unlike the single-instance case this conclusion comes from the reduction, not from a cycle.',
        outcome.remaining.map(processName),
      );
    } else {
      view.tone = 'positive';
      view.cycle = [];
      view.waitForEdges = baseWaitEdges.map((edge) => ({ ...edge, cycle: false, highlight: false }));
      draft(
        'All processes can finish',
        `Every process completes in the order ${outcome.sequence.map(processName).join(' → ')}.`,
        cycle
          ? 'Even though the collapsed graph showed what looks like a cycle, the extra instances let the requests be satisfied — a cycle is only a necessary condition for deadlock when resources are single-instance. The reduction proves the system is not deadlocked.'
          : 'The reduction finishes every process, so the system is not deadlocked.',
        processes,
      );
    }
  }

  /* --------------------------------------------------------------- verdict -- */
  view.stage = 'verdict';
  const deadlocked = view.deadlocked === true;
  draft(
    deadlocked ? 'Deadlock confirmed' : 'No deadlock',
    deadlocked
      ? 'At least one process can never have its request satisfied, so the system is deadlocked.'
      : 'Every blocked process can eventually be satisfied, so the system is deadlock-free.',
    deadlocked
      ? 'Deadlock is a real, permanent condition here: the waits form a closed chain (single-instance resources) or the reduction cannot finish every process (multiple instances). Detection runs the test; only prevention or avoidance avoids reaching this state in the first place.'
      : 'No deadlock exists in the current state. Detection is periodic and reactive — it finds a deadlock after it happens — whereas prevention removes one of the four Coffman conditions up front and avoidance (the banker’s algorithm) refuses unsafe allocations.',
    processes,
  );

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? snapshot('')) as RagStepData;

  return {
    algorithmId: RAG_ALGORITHM_ID,
    labId: RAG_LAB_ID,
    input: {
      processes: processCount,
      resources: resourceCount,
      singleInstance: singleInstance ? 1 : 0,
      deadlocked: finalData.deadlocked === true ? 1 : 0,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<RagStepData>({
      labId: RAG_LAB_ID,
      algorithmId: RAG_ALGORITHM_ID,
      steps,
      parameters: { processes: processCount, resources: resourceCount },
      speed: config.speed,
    }),
    summary: {
      processes: processCount,
      resources: resourceCount,
      singleInstance: singleInstance ? 1 : 0,
      deadlocked: finalData.deadlocked === true ? 1 : 0,
      cycleLength: finalData.cycle.length,
      steps: steps.length,
    },
  };
}

function reductionWorkStep(
  work: readonly number[],
  allocation: readonly (readonly number[])[],
  process: number,
  resourceCount: number,
): number[] {
  const next = [...work];
  for (let resource = 0; resource < resourceCount; resource += 1) {
    next[resource] = (next[resource] ?? 0) + cell(allocation, process, resource);
  }
  return next;
}

export const ragEngine: SimulationEngine<RagInput, RagStepData> = {
  id: RAG_ENGINE_ID,
  algorithmId: RAG_ALGORITHM_ID,
  labId: RAG_LAB_ID,
  name: 'Resource & Wait-for Graphs',
  description:
    'Draw a resource-allocation graph, collapse it into a wait-for graph, and detect deadlock by cycle — or by the reduction algorithm when resources have several instances.',
  validate: validateRagInput,
  run: runRag,
};
