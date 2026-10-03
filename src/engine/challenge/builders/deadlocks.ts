import type { BankersInput, BankersStepData, DeadlockPreset, RagInput } from '../../deadlock';
import { BANKERS_PRESETS, RAG_PRESETS, runBankers, runRag } from '../../deadlock';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer, sequenceAnswer, sequenceSet } from './helpers';

const TOPIC = 'deadlocks';
const BANK_LAB = 'lab-bankers';
const RAG_LAB = 'lab-wait-for-graph';

function bankersInput(id: string): BankersInput {
  const preset = BANKERS_PRESETS.find((entry: DeadlockPreset<BankersInput>) => entry.id === id);
  if (!preset) throw new Error(`missing bankers preset ${id}`);
  return preset.input;
}

function ragInput(id: string): RagInput {
  const preset = RAG_PRESETS.find((entry: DeadlockPreset<RagInput>) => entry.id === id);
  if (!preset) throw new Error(`missing rag preset ${id}`);
  return preset.input;
}

const PHASE_LABELS: Record<string, string> = {
  need: 'Compute the need matrix',
  request: 'Evaluate the pending request',
  safety: 'Run the safety algorithm',
  verdict: 'Announce the verdict',
};

/**
 * The deadlock bank.
 *
 * Safety verdicts, safe-sequence lengths, request outcomes and cycle lengths are
 * all read out of the banker's and wait-for-graph engines, so the questions can
 * be checked by stepping the matching lab preset.
 */
export function deadlocksChallenges(): Challenge[] {
  const challenges: Challenge[] = [];

  const classic = runBankers(bankersInput('bankers-classic'));
  const granted = runBankers(bankersInput('bankers-request-granted'));
  const deferred = runBankers(bankersInput('bankers-request-deferred'));
  const unsafe = runBankers(bankersInput('bankers-unsafe'));

  const cycle = runRag(ragInput('rag-cycle'));
  const acyclic = runRag(ragInput('rag-acyclic'));
  const instances = runRag(ragInput('rag-instances'));

  const lastRequestStatus = (run: typeof classic): string | null => {
    const step = run.steps[run.steps.length - 1];
    const data = step?.data as BankersStepData | undefined;
    return data?.request?.status ?? null;
  };

  /* --------------------------------------------------------------------- */
  /* Banker's algorithm                                                     */
  /* --------------------------------------------------------------------- */

  {
    const correct = classic.summary.safeSequenceLength ?? 0;
    challenges.push({
      id: 'deadlock-safe-sequence-length',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many processes appear in the safe sequence for the classic 5×3 state?',
      scenario: 'Five processes share three resource types with the textbook allocation and max matrices.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `Every one of the ${correct} processes can finish in some order, so the state is safe. The safety algorithm repeatedly finds a process whose need is covered by the current work vector, marks it finished and adds its allocation back to work — like settling debts in an order that never overdraws.`,
      relatedLab: BANK_LAB,
    });
  }

  {
    const safe = (classic.summary.safe ?? 0) === 1;
    const { options, correctId } = choiceSet(safe ? 'Safe' : 'Unsafe', [safe ? 'Unsafe' : 'Safe', 'Deadlocked'], 0);
    challenges.push({
      id: 'deadlock-classic-verdict',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'beginner',
      kind: 'prediction',
      question: 'Is the classic 5×3 state safe or unsafe?',
      scenario: 'Available = [3, 3, 2] with the standard allocation and max matrices.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `The safety algorithm completes all five processes, so the state is ${safe ? 'Safe' : 'Unsafe'}. Safe means a completion order exists; it does not mean the processes will actually ask for their maxima in that order, which is why the banker only avoids the worst case.`,
      relatedLab: BANK_LAB,
    });
  }

  {
    const status = lastRequestStatus(granted);
    const ok = status === 'granted';
    const { options, correctId } = choiceSet(ok ? 'Granted' : 'Deferred', [ok ? 'Deferred' : 'Granted', 'Rejected as a programming error'], 1);
    challenges.push({
      id: 'deadlock-request-granted',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'P1 requests [1, 0, 2] from the classic state. What is the outcome?',
      scenario: 'The request is within P1’s declared need and within the available vector.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `${ok ? 'The tentative allocation still leaves a safe sequence, so the request is granted.' : 'The request is refused.'} The banker pretends to grant it, re-runs the safety algorithm, and only keeps the allocation if the resulting state is still safe — otherwise it rolls back and the process waits.`,
      relatedLab: BANK_LAB,
    });
  }

  {
    const status = lastRequestStatus(deferred);
    const deferredOutcome = status === 'must-wait' || status === 'deferred';
    const { options, correctId } = choiceSet(
      deferredOutcome ? 'Deferred until resources free up' : 'Granted immediately',
      [deferredOutcome ? 'Granted immediately' : 'Deferred until resources free up', 'Rejected'],
      0,
    );
    challenges.push({
      id: 'deadlock-request-deferred',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'advanced',
      kind: 'decision',
      question: 'P4 requests [3, 3, 0] from the classic state. What is the outcome?',
      scenario: 'Granting the request would push the system into an unsafe state.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'The safety check fails after the tentative allocation, so the banker denies the request and P4 blocks. Denying a request is the price of avoidance: throughput drops so that deadlock can never form.',
      relatedLab: BANK_LAB,
    });
  }

  {
    const safe = (unsafe.summary.safe ?? 0) === 1;
    const { options, correctId } = choiceSet(safe ? 'Safe' : 'Unsafe', [safe ? 'Unsafe' : 'Safe', 'Deadlocked'], 2);
    challenges.push({
      id: 'deadlock-unsafe-state',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'Is the three-process, two-resource "Unsafe state" preset safe or unsafe?',
      scenario: 'Three processes share two resource types with no complete sequence available.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'No ordering lets every process finish, so the state is Unsafe. Unsafe is not the same as deadlocked: the processes might never make their maximum requests, so no deadlock need actually occur — but the banker must refuse to enter this state regardless.',
      relatedLab: BANK_LAB,
    });
  }

  {
    const phases: string[] = [];
    for (const step of classic.steps) {
      const phase = String(step.data.phase);
      if (!phases.includes(phase)) phases.push(phase);
    }
    const labels = phases.map((phase) => PHASE_LABELS[phase] ?? phase);
    const { options, order } = sequenceSet(labels, labels);
    challenges.push({
      id: 'deadlock-bankers-phases',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'intermediate',
      kind: 'sequence',
      question: 'Arrange the phases of a Banker’s-algorithm run in the order the engine performs them.',
      scenario: 'The classic state is checked without a pending request.',
      options,
      expectedAnswer: sequenceAnswer(order),
      explanation: `The engine records ${labels.length} phase${labels.length === 1 ? '' : 's'}: need first, then the safety algorithm. A pending request would insert an extra request phase before safety, where the request is checked against the process’s declared need and the available vector.`,
      relatedLab: BANK_LAB,
    });
  }

  {
    const correct = granted.summary.safeSequenceLength ?? 0;
    challenges.push({
      id: 'deadlock-granted-safe-length',
      topic: TOPIC,
      bank: 'bankers-algorithm',
      difficulty: 'advanced',
      kind: 'numerical',
      question:
        'After the grantable request is accepted, how many processes are in the safe sequence?',
      scenario: 'P1 requests [1, 0, 2]; the allocation is applied and safety re-checked.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `The post-allocation state still admits a full completion order of ${correct} processes. That the safe-sequence length is unchanged is the point: a good request consumes resources without making any process permanently unstoppable.`,
      relatedLab: BANK_LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Resource-allocation graphs                                             */
  /* --------------------------------------------------------------------- */

  {
    const correct = cycle.summary.cycleLength ?? 0;
    challenges.push({
      id: 'deadlock-cycle-length',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many processes lie on the cycle in the "Deadlock (cycle)" graph?',
      scenario: 'Three processes each hold one single-instance resource and request the next in a ring.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `The wait-for edges form a ring through all ${correct} processes, so the graph contains a cycle and the system is deadlocked. With single-instance resources a cycle is not merely possible — it proves deadlock.`,
      relatedLab: RAG_LAB,
    });
  }

  {
    const isDead = (cycle.summary.deadlocked ?? 0) === 1;
    const { options, correctId } = choiceSet(isDead ? 'Yes' : 'No', [isDead ? 'No' : 'Yes', 'Only after reduction'], 0);
    challenges.push({
      id: 'deadlock-cycle-deadlocked',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'beginner',
      kind: 'prediction',
      question: 'Is the "Deadlock (cycle)" graph deadlocked?',
      scenario: 'Three processes wait on each other in a closed ring of single-instance resources.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Every process holds one resource and waits for another with no free instances, so nobody can proceed — a circular wait, the fourth Coffman condition, made concrete.',
      relatedLab: RAG_LAB,
    });
  }

  {
    const isDead = (acyclic.summary.deadlocked ?? 0) === 1;
    const { options, correctId } = choiceSet(isDead ? 'Yes' : 'No', [isDead ? 'No' : 'Yes', 'Only with more instances'], 1);
    challenges.push({
      id: 'deadlock-acyclic',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Is the "No deadlock" graph deadlocked?',
      scenario: 'A chain of waits that never loops back on itself.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'The waits form a chain rather than a cycle, so at least one process can always proceed and release what it holds. A wait-for graph is deadlocked exactly when it contains a cycle.',
      relatedLab: RAG_LAB,
    });
  }

  {
    const isDead = (instances.summary.deadlocked ?? 0) === 1;
    const single = (instances.summary.singleInstance ?? 0) === 1;
    const { options, correctId } = choiceSet(
      isDead ? 'Yes' : 'No',
      ['Yes, because a cycle is always deadlock', 'No, because there are no requests', 'Only after all processes finish'],
      1,
    );
    challenges.push({
      id: 'deadlock-multi-instance',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'The multi-instance graph shows a cycle. Is it deadlocked?',
      scenario: 'Two processes, resource A with two instances and resource B with one, exchanging allocations and requests.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `The graph has a cycle yet the reduction algorithm still finishes every process, so it is ${isDead ? 'deadlocked' : 'not deadlocked'} (singleInstance=${single}). A cycle is sufficient to prove deadlock only when every resource in it has a single instance; with multiple instances the reduction algorithm is required.`,
      relatedLab: RAG_LAB,
    });
  }

  {
    const correct = instances.summary.processes ?? 0;
    challenges.push({
      id: 'deadlock-rag-processes',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'How many processes does the multi-instance reduction example contain?',
      scenario: 'Two processes trade units of A and B.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `The graph models ${correct} processes. Even with a cycle among them, the reduction algorithm can still finish each one by returning the instances it holds, which is how multi-instance deadlock detection works.`,
      relatedLab: RAG_LAB,
    });
  }

  {
    const correct = 'All four Coffman conditions hold at once';
    const { options, correctId } = choiceSet(correct, [
      'Any one Coffman condition holds',
      'The system has more than one CPU',
      'At least one resource is preemptible',
    ], 2);
    challenges.push({
      id: 'deadlock-four-conditions',
      topic: TOPIC,
      bank: 'wait-for-graph',
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'Which combination is necessary for a deadlock to form?',
      scenario: 'Reasoning about the four Coffman conditions.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Deadlock requires mutual exclusion, hold and wait, no preemption and circular wait simultaneously. Breaking any single one — for example allowing preemption, or imposing a resource ordering to remove the cycle — makes deadlock impossible.',
      relatedLab: RAG_LAB,
    });
  }

  return challenges;
}
