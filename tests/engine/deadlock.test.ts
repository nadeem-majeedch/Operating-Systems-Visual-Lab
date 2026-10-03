import { describe, expect, it } from 'vitest';
import {
  BANKERS_PRESETS,
  RAG_PRESETS,
  bankersEngine,
  buildDeadlockChallenges,
  cell,
  findCycle,
  needMatrix,
  ragEngine,
  runBankers,
  runRag,
  runReduction,
  runSafety,
  validateBankersInput,
  validateRagInput,
  type BankersInput,
  type BankersStepData,
  type RagStepData,
  type SimulationRun,
} from '@/engine';

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

describe('matrix helpers', () => {
  it('computes Need = Max − Allocation cell by cell', () => {
    const need = needMatrix(
      [
        [0, 1, 0],
        [2, 0, 0],
      ],
      [
        [7, 5, 3],
        [3, 2, 2],
      ],
    );
    expect(need).toEqual([
      [7, 4, 3],
      [1, 2, 2],
    ]);
  });
});

describe('safety algorithm', () => {
  it('finds a safe sequence when one exists', () => {
    const result = runSafety([[1, 0]], [[1, 0]], [1, 0], 1);
    expect(result.safe).toBe(true);
    expect(result.sequence).toEqual([0]);
    expect(result.remaining).toEqual([]);
  });

  it('reports an unsafe state with the processes that cannot finish', () => {
    const result = runSafety(
      [
        [2, 0],
        [2, 0],
      ],
      [
        [1, 0],
        [1, 0],
      ],
      [1, 0],
      2,
    );
    expect(result.safe).toBe(false);
    expect(result.remaining).toEqual([0, 1]);
  });

  it('returns the actual work trace for each iteration', () => {
    const result = runSafety(
      [
        [0, 0],
        [1, 1],
      ],
      [
        [1, 0],
        [0, 1],
      ],
      [0, 1],
      2,
    );
    expect(result.safe).toBe(true);
    expect(result.iterations[0]?.workBefore).toEqual([0, 1]);
    expect(result.iterations[0]?.workAfter).toEqual([1, 1]);
  });

  it('is deterministic (lowest-index-first)', () => {
    const args: [number[][], number[][], number[], number] = [
      [
        [1, 0],
        [1, 0],
      ],
      [
        [0, 1],
        [1, 0],
      ],
      [1, 0],
      2,
    ];
    expect(runSafety(...args).sequence).toEqual(runSafety(...args).sequence);
  });
});

describe('cycle detection', () => {
  it('finds a directed cycle', () => {
    expect(findCycle(3, [
      [0, 1],
      [1, 2],
      [2, 0],
    ])).toEqual([0, 1, 2]);
  });

  it('returns null for an acyclic graph', () => {
    expect(
      findCycle(3, [
        [0, 1],
        [1, 2],
      ]),
    ).toBeNull();
  });

  it('finds a two-cycle', () => {
    expect(
      findCycle(2, [
        [0, 1],
        [1, 0],
      ]),
    ).toEqual([0, 1]);
  });
});

describe('reduction algorithm', () => {
  it('finishes every process when requests can be satisfied', () => {
    const result = runReduction(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [1, 0],
      ],
      [1, 0],
      2,
    );
    expect(result.deadlocked).toBe(false);
    expect(result.sequence).toEqual([1, 0]);
  });

  it('reports a deadlock when no process fits', () => {
    const result = runReduction(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [1, 0],
      ],
      [0, 0],
      2,
    );
    expect(result.deadlocked).toBe(true);
    expect(result.remaining).toEqual([0, 1]);
  });
});

/* -------------------------------------------------------------------------- */
/* Banker's algorithm                                                         */
/* -------------------------------------------------------------------------- */

function assertValidSequence(run: SimulationRun<BankersStepData>): void {
  const data = run.steps[run.steps.length - 1]?.data;
  expect(data?.kind).toBe('bankers');
  if (!data || data.kind !== 'bankers') return;
  const need = needMatrix(data.rows.map((row) => row.allocation), data.rows.map((row) => row.max));
  const sequence = data.safeSequence;
  const work = [...data.available];
  expect(sequence.length).toBe(data.rows.length);
  for (const name of sequence) {
    const index = data.rows.findIndex((row) => row.name === name);
    expect(index).toBeGreaterThanOrEqual(0);
    const needRow = data.rows[index]?.need ?? need[index] ?? [];
    expect(needRow.every((value, resource) => value <= (work[resource] ?? 0))).toBe(true);
    for (let resource = 0; resource < work.length; resource += 1) {
      work[resource] = (work[resource] ?? 0) + (data.rows[index]?.allocation[resource] ?? 0);
    }
  }
}

describe('banker’s algorithm', () => {
  it('finds the classic state safe with a valid sequence', () => {
    const run = runBankers(BANKERS_PRESETS[0]!.input);
    expect(run.summary.safe).toBe(1);
    const last = run.steps[run.steps.length - 1]?.data as BankersStepData;
    expect(last.safe).toBe(true);
    expect(last.safeSequence).toHaveLength(5);
    assertValidSequence(run);
  });

  it('derives need with one explanation step per process', () => {
    const run = runBankers(BANKERS_PRESETS[0]!.input);
    const needSteps = run.steps.filter((step) => step.label.startsWith('Compute'));
    expect(needSteps).toHaveLength(5);
    const first = needSteps[0]?.data as BankersStepData;
    expect(first.rows[0]?.need).toEqual([7, 4, 3]);
  });

  it('grants a request that keeps the state safe', () => {
    const run = runBankers(BANKERS_PRESETS[1]!.input);
    const last = run.steps[run.steps.length - 1]?.data as BankersStepData;
    expect(last.request?.status).toBe('granted');
    expect(run.summary.requestStatus).toBe(1);
    expect(run.summary.safe).toBe(1);
  });

  it('rolls back a request that would make the state unsafe', () => {
    const input = BANKERS_PRESETS[2]!.input;
    const run = runBankers(input);
    const last = run.steps[run.steps.length - 1]?.data as BankersStepData;
    expect(last.request?.status).toBe('deferred');
    // The allocation must be exactly what it was before the request.
    expect(last.rows.map((row) => row.allocation)).toEqual(input.allocation.map((row) => [...row]));
    expect(last.available).toEqual([...input.available]);
    expect(run.steps.some((step) => step.label.includes('Roll back'))).toBe(true);
  });

  it('rejects a request that exceeds the declared maximum', () => {
    const input: BankersInput = {
      ...BANKERS_PRESETS[0]!.input,
      request: { process: 0, resources: [9, 0, 0] },
    };
    const run = runBankers(input);
    const last = run.steps[run.steps.length - 1]?.data as BankersStepData;
    expect(last.request?.status).toBe('rejected');
    expect(last.rows.map((row) => row.allocation)).toEqual(input.allocation.map((row) => [...row]));
  });

  it('defers a request when the resources are not free', () => {
    const input: BankersInput = {
      ...BANKERS_PRESETS[0]!.input,
      request: { process: 0, resources: [9, 4, 3] },
    };
    const run = runBankers(input);
    const last = run.steps[run.steps.length - 1]?.data as BankersStepData;
    // [9,4,3] exceeds P0's need, so it is rejected before availability matters.
    expect(last.request?.status).toBe('rejected');

    const waiting = runBankers({
      ...BANKERS_PRESETS[0]!.input,
      available: [0, 0, 0],
      request: { process: 0, resources: [1, 0, 0] },
    });
    const waitingLast = waiting.steps[waiting.steps.length - 1]?.data as BankersStepData;
    expect(waitingLast.request?.status).toBe('must-wait');
  });

  it('reports an unsafe state without calling it deadlocked', () => {
    const run = runBankers(BANKERS_PRESETS[3]!.input);
    expect(run.summary.safe).toBe(0);
    const verdict = run.steps[run.steps.length - 1]!;
    expect(verdict.label).toBe('Unsafe state');
    expect(verdict.explanation?.toLowerCase()).toContain('unsafe does not mean deadlocked');
  });

  it('is deterministic', () => {
    const first = runBankers(BANKERS_PRESETS[0]!.input);
    const second = runBankers(BANKERS_PRESETS[0]!.input);
    expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
    expect(second.summary).toEqual(first.summary);
  });

  it('validates its input', () => {
    expect(validateBankersInput(BANKERS_PRESETS[0]!.input)).toEqual({ valid: true });
    const base = BANKERS_PRESETS[0]!.input;
    expect(validateBankersInput({ ...base, allocation: [[0, 0]] }).valid).toBe(false);
    expect(validateBankersInput({ ...base, available: [1] }).valid).toBe(false);
    expect(
      validateBankersInput({
        ...base,
        allocation: [
          [9, 1, 0],
          ...base.allocation.slice(1),
        ],
        max: [[1, 1, 0], ...base.max.slice(1)],
      }).valid,
    ).toBe(false);
    expect(
      validateBankersInput({ ...base, request: { process: 99, resources: [1, 0, 0] } }).valid,
    ).toBe(false);
    expect(validateBankersInput({ ...base, processes: [] }).valid).toBe(false);
    expect(() => runBankers({ ...base, processes: [] })).toThrow(/invalid input/i);
  });

  it('exposes an engine object that delegates to the simulation', () => {
    expect(bankersEngine.algorithmId).toBe('bankers-algorithm');
    expect(bankersEngine.run(BANKERS_PRESETS[0]!.input).steps.length).toBeGreaterThan(3);
    expect(bankersEngine.validate(BANKERS_PRESETS[0]!.input)).toEqual({ valid: true });
  });
});

/* -------------------------------------------------------------------------- */
/* Resource-allocation graph                                                  */
/* -------------------------------------------------------------------------- */

describe('resource-allocation graph', () => {
  it('confirms deadlock when the single-instance graph has a cycle', () => {
    const run = runRag(RAG_PRESETS[0]!.input);
    expect(run.summary.deadlocked).toBe(1);
    const last = run.steps[run.steps.length - 1]?.data as RagStepData;
    expect(last.deadlocked).toBe(true);
    expect(last.cycle.length).toBeGreaterThanOrEqual(3);
  });

  it('confirms no deadlock for an acyclic graph', () => {
    const run = runRag(RAG_PRESETS[1]!.input);
    expect(run.summary.deadlocked).toBe(0);
    const last = run.steps[run.steps.length - 1]?.data as RagStepData;
    expect(last.deadlocked).toBe(false);
  });

  it('shows a cycle that the reduction still resolves with multiple instances', () => {
    const run = runRag(RAG_PRESETS[2]!.input);
    expect(run.summary.singleInstance).toBe(0);
    expect(run.summary.deadlocked).toBe(0);
    const detect = run.steps.find((step) => step.label === 'Run the reduction algorithm');
    const detectData = detect?.data as RagStepData | undefined;
    expect(detectData?.cycle.length).toBeGreaterThan(0);
    const last = run.steps[run.steps.length - 1]?.data as RagStepData;
    expect(last.deadlocked).toBe(false);
    expect(last.finished.every(Boolean)).toBe(true);
  });

  it('builds allocation and request edges with the right orientation', () => {
    const run = runRag(RAG_PRESETS[0]!.input);
    const last = run.steps[run.steps.length - 1]?.data as RagStepData;
    const allocation = last.edges.filter((edge) => edge.kind === 'allocation');
    const request = last.edges.filter((edge) => edge.kind === 'request');
    expect(allocation.length).toBe(3);
    expect(request.length).toBe(3);
    for (const edge of allocation) expect(edge.from.startsWith('r')).toBe(true);
    for (const edge of request) expect(edge.from.startsWith('p')).toBe(true);
  });

  it('is deterministic', () => {
    const first = runRag(RAG_PRESETS[0]!.input);
    const second = runRag(RAG_PRESETS[0]!.input);
    expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
  });

  it('validates its input', () => {
    expect(validateRagInput(RAG_PRESETS[0]!.input)).toEqual({ valid: true });
    const base = RAG_PRESETS[0]!.input;
    expect(validateRagInput({ ...base, instances: [] }).valid).toBe(false);
    expect(
      validateRagInput({
        ...base,
        allocation: [
          [2, 0, 0],
          ...base.allocation.slice(1),
        ],
      }).valid,
    ).toBe(false);
    expect(validateRagInput({ ...base, requests: [[0]] }).valid).toBe(false);
  });

  it('exposes an engine object', () => {
    expect(ragEngine.algorithmId).toBe('wait-for-graph');
    expect(ragEngine.run(RAG_PRESETS[0]!.input).steps.length).toBeGreaterThan(3);
  });
});

/* -------------------------------------------------------------------------- */
/* Presets and challenges                                                     */
/* -------------------------------------------------------------------------- */

describe('deadlock presets and challenges', () => {
  it('runs every banker preset without error', () => {
    for (const preset of BANKERS_PRESETS) {
      expect(runBankers(preset.input).steps.length).toBeGreaterThan(1);
    }
  });

  it('runs every graph preset without error', () => {
    for (const preset of RAG_PRESETS) {
      expect(runRag(preset.input).steps.length).toBeGreaterThan(1);
    }
  });

  it('ships unique preset ids', () => {
    const ids = [...BANKERS_PRESETS, ...RAG_PRESETS].map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces well-formed challenge questions', () => {
    const challenges = buildDeadlockChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(10);
    for (const challenge of challenges) {
      expect(challenge.options.length).toBeGreaterThanOrEqual(2);
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(challenge.explanation.length).toBeGreaterThan(10);
      expect(new Set(challenge.options).size).toBe(challenge.options.length);
    }
  });

  it('builds deterministic challenge questions', () => {
    const first = buildDeadlockChallenges();
    const second = buildDeadlockChallenges();
    expect(second.map((challenge) => challenge.id)).toEqual(first.map((challenge) => challenge.id));
    expect(second.map((challenge) => challenge.correctIndex)).toEqual(
      first.map((challenge) => challenge.correctIndex),
    );
  });

  it('marks the classic need cell correctly', () => {
    const challenge = buildDeadlockChallenges().find((item) => item.id === 'deadlock-need-cell');
    expect(challenge).toBeDefined();
    const answer = challenge ? challenge.options[challenge.correctIndex] : undefined;
    // Classical P2 row: Need = Max − Allocation = 9 − 3 = 6 on resource A.
    expect(answer).toBe('6');
  });

  it('concludes the multi-instance challenge is not a deadlock', () => {
    const challenge = buildDeadlockChallenges().find((item) => item.id === 'deadlock-rag-instances');
    expect(challenge?.options[challenge.correctIndex]).toBe('No deadlock');
  });

  it('reads a specific cell from the RAG preset', () => {
    expect(cell(RAG_PRESETS[0]!.input.allocation, 0, 0)).toBe(1);
  });
});
