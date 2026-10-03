import type { ProcessState } from '../../process';
import {
  PROCESS_SCENE_PRESETS,
  PROCESS_STATE_INFO,
  PROCESS_STATES,
  legalTransitions,
  runLifecycle,
} from '../../process';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer, sequenceAnswer, sequenceSet } from './helpers';

const TOPIC = 'process-management';
const BANK = 'process-management';
const LAB = 'lab-process-lifecycle';

type Run = ReturnType<typeof runLifecycle>;
type StepData = Run['steps'][number]['data'];

function presetInput(id: string) {
  const preset = PROCESS_SCENE_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing process scene preset ${id}`);
  return preset.input;
}

function finalData(run: Run): StepData {
  const step = run.steps[run.steps.length - 1];
  if (!step) throw new Error('process run produced no steps');
  return step.data;
}

function stateOf(data: StepData, name: string): ProcessState {
  return data.processes.find((process) => process.name === name)?.state ?? 'new';
}

function runningName(data: StepData): string | null {
  if (data.runningPid === null) return null;
  return data.processes.find((process) => process.pid === data.runningPid)?.name ?? null;
}

/** The states a process actually visits, as the engine recorded them. */
function visitedStates(run: Run): ProcessState[] {
  const seen: ProcessState[] = ['new'];
  for (const step of run.steps) {
    const to = step.data.toState;
    if (to && !seen.includes(to)) seen.push(to);
  }
  return seen;
}

/**
 * The process-management bank.
 *
 * Counts and states are read from the same lifecycle engine the lab runs, so a
 * learner can reproduce every answer by loading the scene preset and stepping.
 */
export function processManagementChallenges(): Challenge[] {
  const life = runLifecycle(presetInput('single-lifecycle'));
  const io = runLifecycle(presetInput('io-wait'));
  const fork = runLifecycle(presetInput('fork-tree'));

  const lifeData = finalData(life);
  const ioData = finalData(io);
  const forkData = finalData(fork);

  const challenges: Challenge[] = [];

  /* --------------------------------------------------------------------- */
  /* Lifecycle states                                                       */
  /* --------------------------------------------------------------------- */

  {
    const states = visitedStates(life).map((state) => PROCESS_STATE_INFO[state].label);
    const { options, order } = sequenceSet(states, states);
    challenges.push({
      id: 'process-lifecycle-order',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'sequence',
      question: 'Arrange the states a process visits, in order, from creation to exit.',
      scenario:
        'One process is admitted, dispatched, runs its whole burst, and then exits — the "Single process" scene preset.',
      options,
      expectedAnswer: sequenceAnswer(order),
      explanation:
        'A process is created in New, admitted to Ready, dispatched to Running and finally Terminated. It never enters Waiting because it never blocks, and there is no direct New → Running edge — every process must pass through the ready queue.',
      relatedLab: LAB,
    });
  }

  {
    const correct = PROCESS_STATE_INFO[stateOf(lifeData, 'P1')].label;
    const labels = PROCESS_STATES.map((state) => PROCESS_STATE_INFO[state].label);
    const { options, correctId } = choiceSet(correct, labels.filter((label) => label !== correct), 3);
    challenges.push({
      id: 'process-final-state',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'What is P1’s state once the "Single process" scene has finished?',
      scenario: 'P1 is admitted, dispatched and runs a 3-unit burst to completion.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Running its final unit of CPU completes the burst, so the process terminates and moves to Terminated. The PCB survives until the parent reaps it, but the process itself can never run again.',
      relatedLab: LAB,
    });
  }

  {
    const correct = life.summary.terminated ?? 0;
    challenges.push({
      id: 'process-terminated-count',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'How many processes terminate during the "Single process" scene?',
      scenario: 'One process runs its full 3-unit burst without blocking or being preempted.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `The scene creates one process and runs it to completion, so the engine records ${correct} termination. A terminated process frees its memory and open files, but its PCB lingers as a zombie until the parent collects the exit status.`,
      relatedLab: LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Blocking on I/O                                                        */
  /* --------------------------------------------------------------------- */

  {
    const correct = io.summary.contextSwitches ?? 0;
    challenges.push({
      id: 'process-io-context-switches',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many context switches occur in the "Block on I/O" scene?',
      scenario:
        'P1 is dispatched, blocks on I/O after one unit, P2 is scheduled behind it, then P1 finishes its I/O and returns to the ready queue.',
      unit: 'context switches',
      expectedAnswer: numberAnswer(correct),
      explanation: `The CPU changes hands from P1 to P2 exactly ${correct} time${correct === 1 ? '' : 's'}. Blocking hands the CPU over cleanly rather than wasting a slice, which is why I/O-bound processes keep the processor busy.`,
      relatedLab: LAB,
    });
  }

  {
    const correctState = stateOf(ioData, 'P1');
    const correct = PROCESS_STATE_INFO[correctState].label;
    const labels = PROCESS_STATES.map((state) => PROCESS_STATE_INFO[state].label);
    const { options, correctId } = choiceSet(correct, labels.filter((label) => label !== correct), 0);
    challenges.push({
      id: 'process-io-final-state',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'When the "Block on I/O" scene ends, what state is P1 in?',
      scenario: 'P1 blocked on I/O, another process ran, and then P1’s awaited event completed.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `Completing I/O moves P1 from Waiting to ${correct}. It is runnable again, but it is not yet running — the scheduler must dispatch it, which is why unblocking alone does not hand over the CPU.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = runningName(ioData) ?? 'P2';
    const names = ioData.processes.map((process) => process.name);
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 1);
    challenges.push({
      id: 'process-io-next-running',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Once P1 blocks, which process holds the CPU at the point the scene ends?',
      scenario: 'P1 blocks after one unit of CPU; the scheduler then runs P2 for two units and P1’s I/O completes.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `${correct} is dispatched as soon as P1 blocks, because a blocked process cannot use the CPU. When P1 unblocks it returns to Ready, not to Running — the scheduler is free to keep ${correct} on the processor.`,
      relatedLab: LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* fork and the process tree                                             */
  /* --------------------------------------------------------------------- */

  {
    const correct = fork.summary.created ?? 0;
    challenges.push({
      id: 'process-fork-count',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'How many processes exist in the "Fork tree" scene?',
      scenario: 'One root process creates two children, each recorded with its own PCB.',
      unit: 'processes',
      expectedAnswer: numberAnswer(correct),
      explanation: `The scene seeds ${correct} processes: the initial parent plus its two children. Each fork duplicates the caller into a new process with its own PCB, and copy-on-write keeps the duplication cheap until either side writes a page.`,
      relatedLab: 'lab-fork-exec',
    });
  }

  {
    const parentPid = forkData.processes.find((process) => process.name === 'P1')?.parentPid ?? null;
    const correct = forkData.processes.find((process) => process.pid === parentPid)?.name ?? 'init';
    const names = forkData.processes.map((process) => process.name);
    const { options, correctId } = choiceSet(correct, names.filter((name) => name !== correct), 2);
    challenges.push({
      id: 'process-parent',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'In the "Fork tree" scene, which process is P1’s parent?',
      scenario: 'The root process seeds two children named P1 and P2.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `P1’s PCB records ${correct} as its parent. The tree matters because a child’s exit status is kept in its PCB until the parent reaps it: an uncollected child becomes a zombie, and a child whose parent exits first becomes an orphan adopted by the root.`,
      relatedLab: 'lab-fork-exec',
    });
  }

  {
    const correctState = stateOf(forkData, 'init');
    const correct = PROCESS_STATE_INFO[correctState].label;
    const labels = PROCESS_STATES.map((state) => PROCESS_STATE_INFO[state].label);
    const { options, correctId } = choiceSet(correct, labels.filter((label) => label !== correct), 4);
    challenges.push({
      id: 'process-init-final-state',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'advanced',
      kind: 'prediction',
      question: 'After the "Fork tree" schedule runs, what state is the root process init in?',
      scenario: 'init runs two units, is preempted so a child can run, then is scheduled again.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `The engine leaves init in the ${correct} state. Its full 5-unit burst has not yet been consumed, so it is not terminated — this is exactly the state a real process sits in while it waits for its next turn.`,
      relatedLab: 'lab-fork-exec',
    });
  }

  {
    const correct = fork.summary.contextSwitches ?? 0;
    challenges.push({
      id: 'process-fork-switches',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'How many context switches does the "Fork tree" scene perform?',
      scenario: 'The root process has the best priority and the other two are merely ready.',
      unit: 'context switches',
      expectedAnswer: numberAnswer(correct),
      explanation: `The engine records ${correct} context switch${correct === 1 ? '' : 'es'}. The root has the best priority, so every scheduling decision leaves it running and the children stay Ready — a scheduler that keeps the same process on the CPU avoids the save-and-reload cost entirely. Each genuine switch would copy registers and the stack pointer into the outgoing PCB and the incoming one back out.`,
      relatedLab: 'lab-fork-exec',
    });
  }

  /* --------------------------------------------------------------------- */
  /* Transition rules — the state machine itself                           */
  /* --------------------------------------------------------------------- */

  {
    const fromRunning = legalTransitions('running') as readonly string[];
    const correct = 'unblock';
    const { options, correctId } = choiceSet(correct, ['block', 'preempt', 'terminate'], 0);
    challenges.push({
      id: 'process-illegal-transition',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'Which of these transitions can a Running process not make?',
      scenario: 'A process is currently executing on the single CPU.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `A running process has exactly three exits — Preempt back to Ready, Block to Waiting and Terminate — so "${correct}" is not one of them. Unblocking (Waiting → Ready) can only follow a block, which is why a process always passes through the ready queue before running again. (From Running the engine allows: ${fromRunning.join(', ')}.)`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'block';
    const { options, correctId } = choiceSet(correct, ['preempt', 'unblock', 'terminate'], 2);
    challenges.push({
      id: 'process-io-transition',
      topic: TOPIC,
      bank: BANK,
      difficulty: 'beginner',
      kind: 'decision',
      question: 'A running process issues a blocking disk read. Which transition does it make?',
      scenario: 'The read cannot be satisfied from cache, so the process must wait for the device.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'Blocking on I/O moves a process from Running to Waiting. It cannot run again until the device signals completion and the kernel unblocks it into Ready. Crucially it does not go to Terminated, and it is not preempted — it gave up the CPU itself.',
      relatedLab: LAB,
    });
  }

  return challenges;
}
