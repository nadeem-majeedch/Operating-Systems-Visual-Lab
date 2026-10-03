import type { DiskInput } from './types';
import { DISK_ALGORITHM_LABELS } from './types';
import { DISK_PRESETS, findDiskPreset } from './presets';
import { runDiskScheduling } from './scheduling';
import { compareDiskScheduling } from './comparison';

export type DiskChallengeKind = 'distance' | 'order' | 'policy' | 'behaviour' | 'average';

export interface DiskChallenge {
  readonly id: string;
  readonly kind: DiskChallengeKind;
  readonly title: string;
  readonly prompt: string;
  /** The queue the question is about; the panel can replay it. */
  readonly input: DiskInput;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

function presetInput(id: string): DiskInput {
  const preset = findDiskPreset(id);
  if (!preset) throw new Error(`missing disk preset ${id}`);
  return preset.input;
}

function summary(id: string): Record<string, number> {
  return runDiskScheduling(presetInput(id)).summary;
}

function numericOptions(
  correct: number,
  candidates: readonly number[],
): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, ...candidates.filter((value) => value >= 0)])].sort(
    (a, b) => a - b,
  );
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

function choiceOptions(
  correct: string,
  choices: readonly string[],
): { options: string[]; correctIndex: number } {
  const options = [...new Set([correct, ...choices])];
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * The disk-scheduling challenge set.
 *
 * Every numeric answer is read out of the engine's own run, so a learner can
 * reproduce it by loading the matching preset and stepping through it.
 */
export function buildDiskChallenges(): DiskChallenge[] {
  const challenges: DiskChallenge[] = [];
  const classic = presetInput('disk-fcfs');

  // 1 — FCFS total movement.
  {
    const correct = summary('disk-fcfs').totalMovement ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct - 120, correct + 40, correct + 160]);
    challenges.push({
      id: 'disk-fcfs-total',
      kind: 'distance',
      title: 'FCFS total movement',
      prompt: 'Starting at cylinder 53 and sweeping up, how many cylinders does FCFS travel over the classic queue?',
      input: classic,
      options,
      correctIndex,
      explanation:
        'FCFS follows arrival order, so the head zig-zags across the disk; the total is the sum of every consecutive hop in the queue.',
    });
  }

  // 2 — SSTF total movement.
  {
    const correct = summary('disk-sstf').totalMovement ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 80, correct - 60, correct + 150]);
    challenges.push({
      id: 'disk-sstf-total',
      kind: 'distance',
      title: 'SSTF total movement',
      prompt: 'How far does SSTF travel over the same queue from head 53?',
      input: presetInput('disk-sstf'),
      options,
      correctIndex,
      explanation:
        'SSTF always hops to the nearest request, so total movement drops sharply compared with FCFS — at the cost of starving far requests.',
    });
  }

  // 3 — which policy minimises total movement here.
  {
    const outcomes = compareDiskScheduling(classic);
    const best = outcomes.reduce((lowest, outcome) => (outcome.totalMovement < lowest.totalMovement ? outcome : lowest));
    const { options, correctIndex } = choiceOptions(DISK_ALGORITHM_LABELS[best.algorithm], [
      'FCFS',
      'SCAN',
      'C-SCAN',
      'LOOK',
    ]);
    challenges.push({
      id: 'disk-min-movement',
      kind: 'policy',
      title: 'Who moves least?',
      prompt: 'For the classic queue from head 53 sweeping up, which policy yields the smallest total head movement?',
      input: classic,
      options,
      correctIndex,
      explanation:
        'SSTF greedily minimises each hop, so it usually wins on raw distance — but raw distance is not the only thing that matters.',
    });
  }

  // 4 — SSTF's first service.
  {
    const order = runDiskScheduling(presetInput('disk-sstf')).steps
      .map((step) => step.data.servedCylinder)
      .filter((cylinder): cylinder is number => cylinder !== null);
    const correct = order[0] ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 25, correct - 51, correct + 120]);
    challenges.push({
      id: 'disk-sstf-first',
      kind: 'order',
      title: 'SSTF’s first hop',
      prompt: 'From the head at cylinder 53, which request does SSTF service first?',
      input: presetInput('disk-sstf'),
      options,
      correctIndex,
      explanation:
        'SSTF picks the request with the smallest seek distance; cylinder 65 is only 12 away, closer than any other queued request.',
    });
  }

  // 5 — LOOK vs SCAN.
  {
    const { options, correctIndex } = choiceOptions('It reverses at the last request, without visiting the disk edge', [
      'It travels to the disk edge before reversing',
      'It returns to cylinder 0 without servicing',
      'It serves requests in arrival order',
    ]);
    challenges.push({
      id: 'disk-look-vs-scan',
      kind: 'behaviour',
      title: 'LOOK vs SCAN',
      prompt: 'How does LOOK differ from SCAN on the return trip?',
      input: presetInput('disk-look'),
      options,
      correctIndex,
      explanation:
        'SCAN always travels to the physical end of the disk before reversing; LOOK reverses as soon as the last pending request in the direction has been served.',
    });
  }

  // 6 — C-SCAN return.
  {
    const { options, correctIndex } = choiceOptions('It returns to the start without servicing anything', [
      'It services requests on the return trip too',
      'It reverses direction at the edge',
      'It stops once the head reaches the edge',
    ]);
    challenges.push({
      id: 'disk-cscan-return',
      kind: 'behaviour',
      title: 'C-SCAN’s return',
      prompt: 'What does C-SCAN do when the head reaches the end of the disk?',
      input: presetInput('disk-cscan'),
      options,
      correctIndex,
      explanation:
        'C-SCAN treats the disk as a circle: it jumps back to the start and sweeps again, servicing nothing on the way back, so waiting times are far more uniform.',
    });
  }

  // 7 — starvation.
  {
    const { options, correctIndex } = choiceOptions('SSTF', [
      'FCFS',
      'SCAN',
      'C-SCAN',
      'LOOK',
      'C-LOOK',
    ]);
    challenges.push({
      id: 'disk-starvation',
      kind: 'policy',
      title: 'Who can starve?',
      prompt: 'Which policy can leave a request waiting indefinitely if new requests keep arriving near the head?',
      input: presetInput('disk-sstf-starvation'),
      options,
      correctIndex,
      explanation:
        'SSTF always serves the nearest request, so a continuous stream of nearby arrivals can keep postponing a far request forever. The sweep policies bound every wait to one pass.',
    });
  }

  // 8 — average seek distance for FCFS.
  {
    const summaryFcfs = summary('disk-fcfs');
    const correct = Math.round(summaryFcfs.averageSeek ?? 0);
    const { options, correctIndex } = numericOptions(correct, [correct + 20, correct - 15, correct + 40]);
    challenges.push({
      id: 'disk-fcfs-average',
      kind: 'average',
      title: 'Average seek distance',
      prompt: 'What is the average seek distance per request for FCFS on the classic queue (to the nearest cylinder)?',
      input: classic,
      options,
      correctIndex,
      explanation:
        'Average seek distance is total head movement divided by the number of requests; FCFS’s zig-zag makes it much larger than the sweep policies.',
    });
  }

  // 9 — LOOK service order.
  {
    const order = runDiskScheduling(presetInput('disk-look')).steps
      .map((step) => step.data.servedCylinder)
      .filter((cylinder): cylinder is number => cylinder !== null);
    const firstThree = order.slice(0, 3).join(' → ');
    const alt1 = order.slice(0, 3).reverse().join(' → ');
    const { options, correctIndex } = choiceOptions(firstThree, [alt1, `${order[2]} → ${order[0]} → ${order[1]}`]);
    challenges.push({
      id: 'disk-look-order',
      kind: 'order',
      title: 'The first three services',
      prompt: 'Which order does LOOK (sweeping up) serve the first three requests in?',
      input: presetInput('disk-look'),
      options,
      correctIndex,
      explanation:
        'Sweeping up, LOOK services every request at or above the head in increasing order before it reverses.',
    });
  }

  // 10 — the direction only matters for some policies.
  {
    const { options, correctIndex } = choiceOptions(
      'SCAN, C-SCAN, LOOK and C-LOOK',
      ['FCFS and SSTF', 'Every policy', 'Only C-SCAN and C-LOOK'],
    );
    challenges.push({
      id: 'disk-direction',
      kind: 'behaviour',
      title: 'Who reads the direction?',
      prompt: 'Which policies change their service order when the initial sweep direction flips?',
      input: presetInput('disk-scan-down'),
      options,
      correctIndex,
      explanation:
        'FCFS follows arrival order and SSTF follows distance, so neither reads a direction. The four sweep policies do.',
    });
  }

  return challenges;
}

/** Stable count used by tests and the UI's progress copy. */
export const DISK_CHALLENGE_COUNT = buildDiskChallenges().length;

/** All preset ids, exported so tests can assert the panel covers each one. */
export const DISK_PRESET_IDS = DISK_PRESETS.map((preset) => preset.id);
