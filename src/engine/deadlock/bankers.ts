import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  BankersComparison,
  BankersInput,
  BankersPhase,
  BankersRequestView,
  BankersRowState,
  BankersRowView,
  BankersStepData,
  DeadlockTone,
} from './types';
import {
  MAX_BANKER_PROCESSES,
  MAX_BANKER_RESOURCES,
  MAX_MATRIX_VALUE,
  MIN_BANKER_PROCESSES,
  MIN_BANKER_RESOURCES,
} from './types';
import { cloneMatrix, cloneVector, needMatrix, runSafety, sumOf } from './matrices';

export const BANKERS_ALGORITHM_ID = 'bankers-algorithm';
export const BANKERS_ENGINE_ID = 'bankers-engine';
export const BANKERS_LAB_ID = 'lab-bankers';

function validMatrix(matrix: readonly (readonly number[])[], rows: number, columns: number): boolean {
  if (matrix.length !== rows) return false;
  return matrix.every(
    (row) =>
      row.length === columns &&
      row.every((value) => Number.isInteger(value) && value >= 0 && value <= MAX_MATRIX_VALUE),
  );
}

export function validateBankersInput(input: BankersInput): ValidationResult {
  const collector = new ValidationCollector();
  const processCount = input.processes.length;
  const resourceCount = input.resources.length;

  collector
    .addIf(
      processCount < MIN_BANKER_PROCESSES || processCount > MAX_BANKER_PROCESSES,
      'processes',
      `processes must contain between ${MIN_BANKER_PROCESSES} and ${MAX_BANKER_PROCESSES} names`,
    )
    .addIf(
      resourceCount < MIN_BANKER_RESOURCES || resourceCount > MAX_BANKER_RESOURCES,
      'resources',
      `resources must contain between ${MIN_BANKER_RESOURCES} and ${MAX_BANKER_RESOURCES} names`,
    );

  if (processCount >= MIN_BANKER_PROCESSES && resourceCount >= MIN_BANKER_RESOURCES) {
    collector
      .addIf(
        !validMatrix(input.allocation, processCount, resourceCount),
        'allocation',
        'allocation must be a process×resource matrix of non-negative integers',
      )
      .addIf(
        !validMatrix(input.max, processCount, resourceCount),
        'max',
        'max must be a process×resource matrix of non-negative integers',
      );

    if (input.available.length !== resourceCount) {
      collector.add('available', `available must have ${resourceCount} entries`);
    } else if (
      !input.available.every(
        (value) => Number.isInteger(value) && value >= 0 && value <= MAX_MATRIX_VALUE,
      )
    ) {
      collector.add('available', 'available entries must be non-negative integers');
    }

    // Every maximum must dominate its allocation, otherwise the need is negative.
    if (
      validMatrix(input.allocation, processCount, resourceCount) &&
      validMatrix(input.max, processCount, resourceCount)
    ) {
      for (let process = 0; process < processCount; process += 1) {
        for (let resource = 0; resource < resourceCount; resource += 1) {
          const allocated = input.allocation[process]?.[resource] ?? 0;
          const maximum = input.max[process]?.[resource] ?? 0;
          if (allocated > maximum) {
            collector.add(
              `max[${process}][${resource}]`,
              'maximum must be at least the amount already allocated',
            );
          }
        }
      }
    }

    if (input.request) {
      const { process, resources } = input.request;
      collector
        .addIf(
          !Number.isInteger(process) || process < 0 || process >= processCount,
          'request.process',
          'request process must be a valid index',
        )
        .addIf(
          resources.length !== resourceCount ||
            !resources.every(
              (value) => Number.isInteger(value) && value >= 0 && value <= MAX_MATRIX_VALUE,
            ),
          'request.resources',
          'request must be a vector of non-negative integers, one per resource',
        );
    }
  }

  return collector.toResult();
}

export function bankersStepMetrics(data: BankersStepData): Record<string, number> {
  return {
    processes: data.rows.length,
    resources: data.resources.length,
    available: sumOf(data.available),
    work: sumOf(data.work),
    safe: data.safe === null ? -1 : data.safe ? 1 : 0,
  };
}

interface ViewState {
  allocation: number[][];
  need: number[][];
  available: number[];
  work: number[];
  finished: boolean[];
  rowStates: BankersRowState[];
  activeProcess: number | null;
  activeResource: number | null;
  comparisons: BankersComparison[];
  safeSequence: number[];
  safe: boolean | null;
  request: BankersRequestView | null;
  phase: BankersPhase;
  tone: DeadlockTone;
}

/**
 * Banker's algorithm — avoidance, step by step.
 *
 * The engine derives the need matrix (`Need = Max − Allocation`), evaluates at
 * most one resource request, and runs the safety algorithm. Every arithmetic
 * decision becomes its own step: the per-process subtraction, the
 * `request <= need` and `request <= available` tests, each "this process can
 * finish" iteration, and the verdict.
 *
 * A state with no safe sequence is reported as **unsafe**, never as
 * "deadlocked": avoidance reasons about the worst case in which every process
 * asks for its maximum at once, so an unsafe state is one the algorithm must
 * refuse to enter, not proof that a deadlock exists.
 */
export function runBankers(
  input: BankersInput,
  config: SimulationConfig = {},
): SimulationRun<BankersStepData> {
  assertValid(validateBankersInput(input), 'Banker’s algorithm');

  const processes = [...input.processes];
  const resources = [...input.resources];
  const processCount = processes.length;
  const resourceCount = resources.length;
  const processName = (index: number): string => processes[index] ?? `P${index + 1}`;

  const original = {
    allocation: cloneMatrix(input.allocation),
    need: needMatrix(input.allocation, input.max),
    available: cloneVector(input.available),
  };

  const view: ViewState = {
    allocation: cloneMatrix(input.allocation),
    need: cloneMatrix(original.need),
    available: cloneVector(input.available),
    work: cloneVector(input.available),
    finished: Array.from({ length: processCount }, () => false),
    rowStates: Array.from({ length: processCount }, () => 'idle' as BankersRowState),
    activeProcess: null,
    activeResource: null,
    comparisons: [],
    safeSequence: [],
    safe: null,
    request: null,
    phase: 'need',
    tone: 'default',
  };

  const drafts: StepDraft<BankersStepData>[] = [];

  const snapshot = (summary: string): BankersStepData => {
    const rows: BankersRowView[] = processes.map((name, process) => ({
      name,
      allocation: [...(view.allocation[process] ?? [])],
      max: [...(input.max[process] ?? [])],
      need: [...(view.need[process] ?? [])],
      state: view.rowStates[process] ?? 'idle',
      finished: view.finished[process] ?? false,
    }));
    return {
      kind: 'bankers',
      phase: view.phase,
      summary,
      processes,
      resources,
      rows,
      available: [...view.available],
      work: [...view.work],
      finished: [...view.finished],
      safeSequence: view.safeSequence.map(processName),
      activeProcess: view.activeProcess,
      activeResource: view.activeResource,
      comparisons: [...view.comparisons],
      request: view.request ? { ...view.request, resources: [...view.request.resources] } : null,
      safe: view.safe,
      tone: view.tone,
    };
  };

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
      metrics: bankersStepMetrics(data),
    });
  };

  const resetRowStates = (): void => {
    view.rowStates = Array.from({ length: processCount }, () => 'idle' as BankersRowState);
    view.activeProcess = null;
    view.activeResource = null;
    view.comparisons = [];
  };

  /* ---------------------------------------------------------------- intro -- */
  view.phase = 'need';
  resetRowStates();
  draft(
    'Banker’s algorithm starts',
    `${processCount} process${processCount === 1 ? '' : 'es'} share ${resourceCount} resource type${
      resourceCount === 1 ? '' : 's'
    }`, 
    'Avoidance is prospective: instead of reacting to a deadlock, the banker only grants a request when the resulting state still lets every process finish. It needs each process to declare its maximum demand in advance — the trade-off is conservative admission, which can lower utilisation.',
    processes,
  );

  /* ----------------------------------------------------------------- need -- */
  for (let process = 0; process < processCount; process += 1) {
    const parts: string[] = [];
    for (let resource = 0; resource < resourceCount; resource += 1) {
      const maximum = input.max[process]?.[resource] ?? 0;
      const allocated = view.allocation[process]?.[resource] ?? 0;
      parts.push(`${resources[resource]} ${maximum} − ${allocated} = ${maximum - allocated}`);
    }
    resetRowStates();
    view.activeProcess = process;
    view.comparisons = Array.from({ length: resourceCount }, (_, resource) => ({
      row: process,
      resource,
      ok: true,
    }));
    draft(
      `Compute ${processName(process)}’s need`,
      `Need = Max − Allocation for ${processName(process)}: ${parts.join(', ')}.`,
      'The need vector is the remaining claim a process can still make. The safety algorithm only ever compares this worst-case need to the resources in hand, which is what makes it a sufficient condition for safety.',
      [processName(process)],
    );
  }
  resetRowStates();

  /* -------------------------------------------------------------- request -- */
  let tentativeApplied = false;
  let requestDecidedEarly = false;
  const request = input.request;

  if (request) {
    const requester = request.process;
    const vector = [...request.resources];
    view.phase = 'request';
    view.activeProcess = requester;
    const base: BankersRequestView = {
      process: processName(requester),
      resources: vector,
      withinNeed: null,
      withinAvailable: null,
      status: 'pending',
    };
    view.request = base;
    draft(
      `${processName(requester)} requests resources`,
      `${processName(requester)} asks for [${vector.join(', ')}].`,
      'A request is evaluated against two ceilings before any state is touched: it must not exceed what the process said it might need, and it must not exceed what is actually free right now.',
      [processName(requester)],
    );

    const withinNeed = vector.every(
      (value, resource) => value <= (view.need[requester]?.[resource] ?? 0),
    );
    view.comparisons = vector.map((_, resource) => ({
      row: requester,
      resource,
      ok: (vector[resource] ?? 0) <= (view.need[requester]?.[resource] ?? 0),
    }));
    const afterNeed: BankersRequestView = { ...base, withinNeed };
    view.request = afterNeed;
    draft(
      withinNeed ? 'Request fits the declared maximum' : 'Request exceeds the declared maximum',
      withinNeed
        ? 'Every unit requested is within the need vector, so the process is not asking for more than it promised.'
        : 'At least one unit exceeds the process’s remaining need, so the request is malformed and rejected outright.',
      'This test keeps Banker’s algorithm honest: a process may never inflate its claim beyond the maximum it declared at admission time.',
      [processName(requester)],
    );

    if (!withinNeed) {
      view.request = { ...afterNeed, status: 'rejected' };
      view.tone = 'danger';
      requestDecidedEarly = true;
    } else {
      const withinAvailable = vector.every(
        (value, resource) => value <= (view.available[resource] ?? 0),
      );
      view.comparisons = [];
      const afterAvailable: BankersRequestView = { ...afterNeed, withinAvailable };
      view.request = afterAvailable;
      draft(
        withinAvailable
          ? 'Request fits the currently free resources'
          : 'Request must wait for more resources',
        withinAvailable
          ? 'Every unit requested is free right now, so the process does not have to block.'
          : 'At least one resource is not free right now, so the request cannot be considered — the process would wait.',
        'Failing this test is not an error: the process simply blocks until other processes release what it needs. No allocation is simulated.',
        [processName(requester)],
      );

      if (!withinAvailable) {
        view.request = { ...afterAvailable, status: 'must-wait' };
        requestDecidedEarly = true;
      } else {
        for (let resource = 0; resource < resourceCount; resource += 1) {
          view.available[resource] = (view.available[resource] ?? 0) - (vector[resource] ?? 0);
          view.allocation[requester]![resource] =
            (view.allocation[requester]?.[resource] ?? 0) + (vector[resource] ?? 0);
          view.need[requester]![resource] =
            (view.need[requester]?.[resource] ?? 0) - (vector[resource] ?? 0);
        }
        tentativeApplied = true;
        draft(
          'Tentatively allocate the request',
          'The request is applied to a copy of the state so the safety algorithm can inspect the result.',
          'The allocation is provisional. If the safety check still finds a safe sequence the grant becomes real; if it does not, the algorithm rolls the state back and the process waits.',
          [processName(requester)],
        );
      }
    }
  }

  /* --------------------------------------------------------------- safety -- */
  resetRowStates();
  view.phase = 'safety';
  view.work = cloneVector(view.available);
  view.finished = Array.from({ length: processCount }, () => false);
  view.safeSequence = [];
  view.safe = null;
  draft(
    'Begin the safety check',
    `Work starts as the available vector [${view.available.join(', ')}] and no process has finished.`,
    'The safety algorithm asks one question over and over: is there a process whose entire remaining need fits in the resources in hand? If one exists, assume it finishes and returns everything it holds; repeat; if every process can finish, the state is safe.',
    [],
  );

  const safety = runSafety(view.need, view.allocation, view.available, processCount);

  for (const iteration of safety.iterations) {
    const process = iteration.process;
    resetRowStates();
    view.activeProcess = process;
    view.comparisons = Array.from({ length: resourceCount }, (_, resource) => ({
      row: process,
      resource,
      ok: (view.need[process]?.[resource] ?? 0) <= (iteration.workBefore[resource] ?? 0),
    }));
    view.rowStates[process] = 'finished';
    view.work = cloneVector(iteration.workAfter);
    view.finished[process] = true;
    view.safeSequence.push(process);
    draft(
      `${processName(process)} can finish`,
      `${processName(process)}’s need [${(view.need[process] ?? []).join(', ')}] fits in work [${iteration.workBefore.join(
        ', ',
      )}], so it is assumed to run to completion and release its allocation.`,
      `Work grows from [${iteration.workBefore.join(', ')}] to [${iteration.workAfter.join(
        ', ',
      )}]. The assumption is worst case for everyone else — the finishing process returns everything it holds, making more room for the processes still to be checked.`,
      [processName(process)],
    );
  }

  if (safety.remaining.length > 0) {
    resetRowStates();
    view.safe = false;
    view.tone = 'warning';
    for (const process of safety.remaining) {
      view.rowStates[process] = 'blocked';
      for (let resource = 0; resource < resourceCount; resource += 1) {
        view.comparisons.push({
          row: process,
          resource,
          ok: (view.need[process]?.[resource] ?? 0) <= (view.work[resource] ?? 0),
        });
      }
    }
    draft(
      'No remaining process fits',
      `${safety.remaining.map(processName).join(', ')} can never have a need satisfied by work [${view.work.join(
        ', ',
      )}].`,
      'Every unfinished process needs more than the system can currently supply, even after allowing the others to finish. There is no safe sequence, so the state is unsafe. This is not the same as a deadlock: it means the banker must refuse to let the system enter this state, because some future maximal request could leave no way out.',
      safety.remaining.map(processName),
    );
  } else {
    view.safe = true;
    view.tone = 'positive';
    view.finished = Array.from({ length: processCount }, () => true);
    view.rowStates = Array.from({ length: processCount }, () => 'finished' as BankersRowState);
  }

  /* -------------------------------------------------------------- verdict -- */
  resetRowStates();

  if (view.request && tentativeApplied) {
    if (safety.safe) {
      const requester = view.request.process;
      view.request = { ...view.request, status: 'granted' };
      view.tone = 'positive';
      view.safe = true;
      draft(
        'Request granted',
        `The tentative allocation still leaves a safe sequence, so ${requester}’s request is granted.`,
        'The provisional allocation becomes permanent. Granting is safe precisely because a completion order still exists after the request is accounted for.',
        [requester],
      );
    } else {
      const requester = view.request.process;
      view.allocation = cloneMatrix(original.allocation);
      view.need = cloneMatrix(original.need);
      view.available = cloneVector(original.available);
      view.work = cloneVector(original.available);
      const baseSafety = runSafety(
        original.need,
        original.allocation,
        original.available,
        processCount,
      );
      view.safe = baseSafety.safe;
      view.safeSequence = [...baseSafety.sequence];
      view.finished = original.allocation.map((_, index) =>
        baseSafety.sequence.includes(index),
      );
      view.tone = baseSafety.safe ? 'warning' : 'danger';
      view.request = { ...view.request, status: 'deferred' };
      draft(
        'Roll back the tentative allocation',
        `${requester}’s request is refused: with it applied the system would be unsafe, so the provisional allocation is undone.`,
        'This is the heart of avoidance. The request is not impossible — it would simply make the state unsafe, so the banker makes the process wait and retries the request once other processes release resources. The system is left exactly as it was.',
        [requester],
      );
    }
  }

  if (requestDecidedEarly && view.request) {
    const status = view.request.status;
    const requester = view.request.process;
    view.tone = status === 'rejected' ? 'danger' : 'warning';
    draft(
      status === 'rejected' ? 'Request rejected' : 'Request deferred',
      status === 'rejected'
        ? `${requester} asked for more than its declared need, so the request is invalid and rejected.`
        : `${requester} must wait because the resources are not free right now. The state is unchanged.`,
      'Neither outcome touches the allocation: a request that fails a pre-check never reaches the safety algorithm. A rejected request is a programming error; a deferred one is ordinary blocking.',
      [requester],
    );
  }

  const finalSafe = view.safe;
  const sequence = view.safeSequence.map(processName);
  draft(
    finalSafe === true ? 'Safe state' : 'Unsafe state',
    finalSafe === true
      ? `A completion order exists: ${sequence.join(' → ')}.`
      : 'No process can be completed with the resources in hand, so no safe sequence exists.',
    finalSafe === true
      ? 'Because at least one order lets every process finish even if each asks for its maximum, the banker may continue to grant requests from this state. Safety is a statement about a hypothetical worst case, not about the requests made so far.'
      : 'Unsafe does not mean deadlocked. It means there is no completion sequence under the worst-case assumption that every process eventually asks for its full declared maximum — the banker must avoid entering this state, but a deadlock has not necessarily happened and may never happen if the processes do not actually make those maximal requests.',
    processes,
  );

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? snapshot('')) as BankersStepData;

  return {
    algorithmId: BANKERS_ALGORITHM_ID,
    labId: BANKERS_LAB_ID,
    input: {
      processes: processCount,
      resources: resourceCount,
      available: sumOf(input.available),
      requested: request ? 1 : 0,
      granted: finalData.request?.status === 'granted' ? 1 : 0,
      safe: finalData.safe === true ? 1 : 0,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<BankersStepData>({
      labId: BANKERS_LAB_ID,
      algorithmId: BANKERS_ALGORITHM_ID,
      steps,
      parameters: { processes: processCount, resources: resourceCount },
      speed: config.speed,
    }),
    summary: {
      processes: processCount,
      resources: resourceCount,
      safe: finalData.safe === true ? 1 : 0,
      safeSequenceLength: finalData.safeSequence.length,
      requestStatus: finalData.request?.status === 'granted' ? 1 : 0,
      steps: steps.length,
    },
  };
}

export const bankersEngine: SimulationEngine<BankersInput, BankersStepData> = {
  id: BANKERS_ENGINE_ID,
  algorithmId: BANKERS_ALGORITHM_ID,
  labId: BANKERS_LAB_ID,
  name: 'Banker’s Algorithm',
  description:
    'Evaluate a resource request and run the safety algorithm step by step, distinguishing a safe state from an unsafe one — and both from an actual deadlock.',
  validate: validateBankersInput,
  run: runBankers,
};
