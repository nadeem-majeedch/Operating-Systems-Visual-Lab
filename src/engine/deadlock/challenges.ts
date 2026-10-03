import type { BankersInput, RagInput } from './types';
import { BANKERS_PRESETS, RAG_PRESETS } from './presets';
import { needMatrix, runSafety } from './matrices';
import { runRag } from './waitForGraph';

export type DeadlockChallengeKind =
  | 'need'
  | 'safe-verdict'
  | 'safe-first'
  | 'request'
  | 'rag-verdict'
  | 'rag-resource';

export interface DeadlockChallenge {
  readonly id: string;
  readonly kind: DeadlockChallengeKind;
  readonly title: string;
  readonly prompt: string;
  readonly labId: string;
  readonly matrices?: BankersInput;
  readonly rag?: RagInput;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

/** Distinct numeric candidates in ascending order, with the answer located. */
function numericOptions(correct: number): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, correct + 1, Math.max(0, correct - 1), correct + 2])].sort(
    (a, b) => a - b,
  );
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

function bankersPreset(id: string): BankersInput {
  return BANKERS_PRESETS.find((preset) => preset.id === id)!.input;
}

function ragPreset(id: string): RagInput {
  return RAG_PRESETS.find((preset) => preset.id === id)!.input;
}

/** Run the safety check as if the preset's request had been tentatively applied. */
function requestIsSafe(input: BankersInput): boolean {
  const request = input.request;
  if (!request) return runSafety(needMatrix(input.allocation, input.max), input.allocation, input.available, input.processes.length).safe;
  const allocation = input.allocation.map((row) => [...row]);
  const need = needMatrix(input.allocation, input.max);
  const available = [...input.available];
  for (let resource = 0; resource < input.resources.length; resource += 1) {
    const amount = request.resources[resource] ?? 0;
    available[resource] = (available[resource] ?? 0) - amount;
    allocation[request.process]![resource] = (allocation[request.process]?.[resource] ?? 0) + amount;
    need[request.process]![resource] = (need[request.process]?.[resource] ?? 0) - amount;
  }
  return runSafety(need, allocation, available, input.processes.length).safe;
}

/**
 * The deadlock challenge set.
 *
 * Every answer is computed from the same engines the labs run, so the questions
 * cannot drift away from the simulations — change a preset and the questions
 * change with it.
 */
export function buildDeadlockChallenges(): DeadlockChallenge[] {
  const challenges: DeadlockChallenge[] = [];

  const classic = bankersPreset('bankers-classic');
  const classicNeed = needMatrix(classic.allocation, classic.max);
  const classicSafety = runSafety(classicNeed, classic.allocation, classic.available, classic.processes.length);

  // 1 — a need-matrix cell.
  {
    const process = 2;
    const resource = 0;
    const correct = classicNeed[process]?.[resource] ?? 0;
    const { options, correctIndex } = numericOptions(correct);
    challenges.push({
      id: 'deadlock-need-cell',
      kind: 'need',
      title: 'Compute a need cell',
      prompt: `In the classic 5×3 state, what is Need for ${classic.processes[process]} on resource ${classic.resources[resource]}?`,
      labId: 'lab-bankers',
      matrices: classic,
      options,
      correctIndex,
      explanation: `Need = Max − Allocation = ${classic.max[process]?.[resource]} − ${classic.allocation[process]?.[resource]} = ${correct}. The need vector is the process's remaining worst-case claim.`,
    });
  }

  // 2 — safe or unsafe.
  challenges.push({
    id: 'deadlock-classic-verdict',
    kind: 'safe-verdict',
    title: 'Is the classic state safe?',
    prompt: 'Does the textbook 5×3 state have a safe sequence?',
    labId: 'lab-bankers',
    matrices: classic,
    options: ['Safe', 'Unsafe'],
    correctIndex: classicSafety.safe ? 0 : 1,
    explanation: classicSafety.safe
      ? 'A safe sequence exists, so the state is safe — even though that does not promise deadlock can never happen, only that this worst-case state can be completed.'
      : 'No safe sequence exists.',
  });

  // 3 — first process of the safe sequence.
  {
    const first = classicSafety.sequence[0] ?? 1;
    challenges.push({
      id: 'deadlock-safe-first',
      kind: 'safe-first',
      title: 'First in the safe sequence',
      prompt: 'Which process can be the first to finish in the classic state?',
      labId: 'lab-bankers',
      matrices: classic,
      options: [...classic.processes],
      correctIndex: first,
      explanation: `Scanning from the lowest index, ${classic.processes[first]} is the first whose entire need vector fits in the available resources, so it may complete first.`,
    });
  }

  // 4 — a grantable request.
  {
    const input = bankersPreset('bankers-request-granted');
    const safe = requestIsSafe(input);
    challenges.push({
      id: 'deadlock-request-granted',
      kind: 'request',
      title: 'Grant or postpone?',
      prompt: 'P1 requests [1, 0, 2]. What does Banker’s algorithm do?',
      labId: 'lab-bankers',
      matrices: input,
      options: ['Granted', 'Deferred (rolled back)', 'Rejected as invalid'],
      correctIndex: safe ? 0 : 1,
      explanation: safe
        ? 'The request is within P1’s need and within the available resources, and the resulting state still has a safe sequence — so it is granted.'
        : 'Applying the request would leave no safe sequence, so it is rolled back.',
    });
  }

  // 5 — a request that must wait.
  {
    const input = bankersPreset('bankers-request-deferred');
    const safe = requestIsSafe(input);
    challenges.push({
      id: 'deadlock-request-deferred',
      kind: 'request',
      title: 'Grant or postpone?',
      prompt: 'P4 requests [3, 3, 0]. What does Banker’s algorithm do?',
      labId: 'lab-bankers',
      matrices: input,
      options: ['Granted', 'Deferred (rolled back)', 'Rejected as invalid'],
      correctIndex: safe ? 0 : 1,
      explanation: safe
        ? 'A safe sequence still exists, so the request is granted.'
        : 'Applying the request would leave no safe sequence, so the allocation is rolled back and P4 waits. The state stays safe — the request is not impossible, just unsafe to grant now.',
    });
  }

  // 6 — an unsafe state.
  {
    const input = bankersPreset('bankers-unsafe');
    const need = needMatrix(input.allocation, input.max);
    const safety = runSafety(need, input.allocation, input.available, input.processes.length);
    challenges.push({
      id: 'deadlock-unsafe-verdict',
      kind: 'safe-verdict',
      title: 'Safe or unsafe?',
      prompt: 'Three processes share two resources. Is this state safe?',
      labId: 'lab-bankers',
      matrices: input,
      options: ['Safe', 'Unsafe'],
      correctIndex: safety.safe ? 0 : 1,
      explanation: safety.safe
        ? 'A safe sequence exists.'
        : 'No process can complete, so there is no safe sequence. Unsafe is not the same as deadlocked, though — it means the banker must not let the system enter this state.',
    });
  }

  // 7 — deadlock in a single-instance graph.
  {
    const input = ragPreset('rag-cycle');
    const run = runRag(input);
    challenges.push({
      id: 'deadlock-rag-cycle',
      kind: 'rag-verdict',
      title: 'Is the system deadlocked?',
      prompt: 'Three processes each hold one resource and wait for the next. Deadlocked?',
      labId: 'lab-wait-for-graph',
      rag: input,
      options: ['Deadlock', 'No deadlock'],
      correctIndex: run.summary.deadlocked === 1 ? 0 : 1,
      explanation:
        'The wait-for graph contains a cycle — a circular wait. With one instance per resource a cycle is necessary and sufficient for deadlock, so the system is deadlocked.',
    });
  }

  // 8 — which resource a process waits for.
  {
    const input = ragPreset('rag-cycle');
    const process = 2;
    const requested = input.requests[process] ?? [];
    let resourceIndex = -1;
    for (let resource = 0; resource < requested.length; resource += 1) {
      if ((requested[resource] ?? 0) > 0) {
        resourceIndex = resource;
        break;
      }
    }
    challenges.push({
      id: 'deadlock-rag-resource',
      kind: 'rag-resource',
      title: 'What is P3 waiting for?',
      prompt: 'In the cycle scenario, which resource is P3 requesting?',
      labId: 'lab-wait-for-graph',
      rag: input,
      options: [...input.resources],
      correctIndex: Math.max(0, resourceIndex),
      explanation: `P3's request edge points at ${input.resources[Math.max(0, resourceIndex)]} — the resource held by P1, which is what closes the cycle.`,
    });
  }

  // 9 — a cycle that is not a deadlock.
  {
    const input = ragPreset('rag-instances');
    const run = runRag(input);
    challenges.push({
      id: 'deadlock-rag-instances',
      kind: 'rag-verdict',
      title: 'Cycle but no deadlock',
      prompt: 'Two processes, two resource types where A has two instances. Deadlocked?',
      labId: 'lab-wait-for-graph',
      rag: input,
      options: ['Deadlock', 'No deadlock'],
      correctIndex: run.summary.deadlocked === 1 ? 0 : 1,
      explanation:
        'The collapsed wait-for graph shows a cycle, but A has a spare instance, so the reduction algorithm finishes every process. A cycle is only necessary and sufficient for deadlock when resources are single-instance.',
    });
  }

  // 10 — acyclic graph.
  {
    const input = ragPreset('rag-acyclic');
    const run = runRag(input);
    challenges.push({
      id: 'deadlock-rag-acyclic',
      kind: 'rag-verdict',
      title: 'A chain, not a cycle',
      prompt: 'P1 waits for P2, who waits for P3, who is not waiting. Deadlocked?',
      labId: 'lab-wait-for-graph',
      rag: input,
      options: ['Deadlock', 'No deadlock'],
      correctIndex: run.summary.deadlocked === 1 ? 0 : 1,
      explanation: 'The wait chain ends at a process that is not waiting, so the graph is acyclic and there is no deadlock.',
    });
  }

  return challenges;
}

/** Stable count used by tests and the UI's progress copy. */
export const DEADLOCK_CHALLENGE_COUNT = buildDeadlockChallenges().length;
