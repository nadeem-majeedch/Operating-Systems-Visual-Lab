import type { DiskAlgorithm, DiskInput } from '../../disk';
import {
  DISK_ALGORITHM_LABELS,
  compareDiskScheduling,
  findDiskPreset,
  runDiskScheduling,
} from '../../disk';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer, sequenceAnswer, sequenceSet } from './helpers';

const TOPIC = 'disk-scheduling';
const LAB = 'lab-disk-scheduling';

function presetInput(id: string): DiskInput {
  const preset = findDiskPreset(id);
  if (!preset) throw new Error(`missing disk preset ${id}`);
  return preset.input;
}

function summaryOf(id: string): Record<string, number> {
  return runDiskScheduling(presetInput(id)).summary;
}

function serviceOrder(id: string): number[] {
  return runDiskScheduling(presetInput(id)).steps
    .map((step) => step.data.servedCylinder)
    .filter((cylinder): cylinder is number => cylinder !== null);
}

/**
 * The disk-scheduling bank.
 *
 * Total movement, average seek and service order are all read from the disk
 * engine for the named preset, so every numeric answer can be reproduced by
 * loading that preset and stepping through the queue.
 */
export function diskSchedulingChallenges(): Challenge[] {
  const challenges: Challenge[] = [];
  const classic = presetInput('disk-fcfs');

  {
    const correct = summaryOf('disk-fcfs').totalMovement ?? 0;
    challenges.push({
      id: 'disk-fcfs-total',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'From head 53 sweeping up, how many cylinders does FCFS travel over the classic queue?',
      scenario: 'Queue 98, 183, 37, 122, 14, 124, 65, 67 on cylinders 0–199, head starting at 53.',
      unit: 'cylinders',
      expectedAnswer: numberAnswer(correct),
      explanation: `FCFS follows arrival order, so the head zig-zags across the whole disk: ${correct} cylinders of seek. Total movement is simply the sum of the absolute distances between consecutive services.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('disk-sstf').totalMovement ?? 0;
    challenges.push({
      id: 'disk-sstf-total',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How far does SSTF travel over the same queue from head 53?',
      scenario: 'The classic queue served shortest-seek-time-first.',
      unit: 'cylinders',
      expectedAnswer: numberAnswer(correct),
      explanation: `SSTF always hops to the nearest pending request, collapsing total movement to ${correct} — a huge saving over FCFS. The cost is fairness: a far request can be postponed indefinitely by a stream of nearby ones.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('disk-scan').totalMovement ?? 0;
    challenges.push({
      id: 'disk-scan-total',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How far does SCAN (sweeping up) travel over the classic queue?',
      scenario: 'The head sweeps to the top edge, then reverses; cylinders 0–199, head 53.',
      unit: 'cylinders',
      expectedAnswer: numberAnswer(correct),
      explanation: `SCAN travels to the very end of the disk before reversing, so it pays for edge travel it may not need: ${correct} cylinders. Every request still waits at most one sweep, which is what bounds worst-case latency.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = summaryOf('disk-clook').totalMovement ?? 0;
    challenges.push({
      id: 'disk-clook-total',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'How far does C-LOOK travel over the classic queue?',
      scenario: 'The head sweeps up, jumps back to the lowest pending request, and sweeps up again.',
      unit: 'cylinders',
      expectedAnswer: numberAnswer(correct),
      explanation: `C-LOOK services only while moving up and jumps back to the lowest outstanding request rather than the disk edge, so it avoids the useless edge travel that C-SCAN performs: ${correct} cylinders.`,
      relatedLab: LAB,
    });
  }

  {
    const outcomes = compareDiskScheduling(classic);
    const best = outcomes.reduce((winner, outcome) =>
      outcome.totalMovement < winner.totalMovement ? outcome : winner,
    );
    const labels = outcomes.map((outcome) => DISK_ALGORITHM_LABELS[outcome.algorithm]);
    const correct = DISK_ALGORITHM_LABELS[best.algorithm];
    const { options, correctId } = choiceSet(correct, labels.filter((label) => label !== correct), 2);
    challenges.push({
      id: 'disk-min-movement',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'Which policy achieves the smallest total head movement on the classic queue?',
      scenario: 'Every policy is run over the same scattered queue from head 53 sweeping up.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `SSTF greedily minimises each individual hop, so it wins on raw distance (${best.totalMovement} cylinders). Raw distance is not the only goal, though — SSTF trades fairness for it, while the sweep policies bound every request’s wait.`,
      relatedLab: LAB,
    });
  }

  {
    const order = serviceOrder('disk-sstf');
    const correctCylinder = order[0] ?? 0;
    const candidates = [65, 67, 37, 98].filter((cylinder) => cylinder !== correctCylinder);
    const { options, correctId } = choiceSet(
      `cylinder ${correctCylinder}`,
      candidates.map((cylinder) => `cylinder ${cylinder}`),
      1,
    );
    challenges.push({
      id: 'disk-sstf-first',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'From the head at cylinder 53, which request does SSTF service first?',
      scenario: 'SSTF over the classic queue.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `SSTF picks the pending request closest to the head. From 53, cylinder ${correctCylinder} is only 12 away — closer than any other queued request — so it is served first.`,
      relatedLab: LAB,
    });
  }

  {
    const order = serviceOrder('disk-look').slice(0, 3);
    const labels = order.map((cylinder) => `cylinder ${cylinder}`);
    const { options, order: answerOrder } = sequenceSet(labels, labels);
    challenges.push({
      id: 'disk-look-order',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'advanced',
      kind: 'sequence',
      question: 'Arrange the first three requests LOOK serves while sweeping up.',
      scenario: 'The classic queue beginning at head 53 moving upward.',
      options,
      expectedAnswer: sequenceAnswer(answerOrder),
      explanation: `Sweeping up, LOOK services every pending request at or above the head in increasing order: ${labels.join(' → ')}. Unlike SCAN it will reverse at the last request rather than travelling to the disk edge.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'It reverses at the last pending request instead of the disk edge';
    const { options, correctId } = choiceSet(correct, [
      'It travels to the physical edge of the disk before reversing',
      'It services requests in arrival order like FCFS',
    ], 1);
    challenges.push({
      id: 'disk-look-vs-scan',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'How does LOOK differ from SCAN?',
      scenario: 'Both sweep in one direction before reversing.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'SCAN always travels to the end of the disk before reversing, servicing nothing beyond the last request; LOOK turns around as soon as the furthest pending request has been served. LOOK therefore never does useless edge travel.',
      relatedLab: LAB,
    });
  }

  {
    const correct = 'It returns to the start without servicing anything';
    const { options, correctId } = choiceSet(correct, [
      'It reverses and services requests on the way back',
      'It stops scheduling once it reaches the edge',
    ], 0);
    challenges.push({
      id: 'disk-cscan-return',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'What does C-SCAN do when the head reaches the end of the disk?',
      scenario: 'C-SCAN sweeping upward.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'C-SCAN treats the disk as circular: it services only on the outward sweep, then jumps back to the start and sweeps again, servicing nothing on the return. That uniformity is why C-SCAN gives more even waiting times than SCAN.',
      relatedLab: LAB,
    });
  }

  {
    const correct = 'SSTF';
    const { options, correctId } = choiceSet(correct, ['FCFS', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'], 0);
    challenges.push({
      id: 'disk-starvation',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'advanced',
      kind: 'decision',
      question: 'Which policy can leave a request waiting indefinitely if nearby requests keep arriving?',
      scenario: 'A continuous stream of arrivals clusters around the current head position.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `SSTF always serves the nearest request, so a dense cluster next to the head can starve a far request forever — see the "SSTF starvation" preset. The sweep policies bound every wait to one pass, which is why real schedulers prefer them under load.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = Math.round(summaryOf('disk-fcfs').averageSeek ?? 0);
    challenges.push({
      id: 'disk-fcfs-average',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'What is the average seek distance per request for FCFS on the classic queue?',
      scenario: 'Total movement divided by the number of requests.',
      unit: 'cylinders',
      expectedAnswer: numberAnswer(correct),
      explanation: `Average seek distance is total movement ÷ number of requests, giving about ${correct} cylinders for FCFS. FCFS’s zig-zag inflates this badly; the sweep policies cut it several-fold on the same queue.`,
      relatedLab: LAB,
    });
  }

  {
    const directionSensitive: readonly DiskAlgorithm[] = ['scan', 'c-scan', 'look', 'c-look'];
    const correct = directionSensitive.map((algorithm) => DISK_ALGORITHM_LABELS[algorithm]).join(', ');
    const { options, correctId } = choiceSet(correct, [
      'FCFS and SSTF',
      'Every policy',
      DISK_ALGORITHM_LABELS['c-scan'],
    ], 2);
    challenges.push({
      id: 'disk-direction',
      topic: TOPIC,
      bank: 'disk-scheduling',
      difficulty: 'advanced',
      kind: 'decision',
      question: 'Which policies change their service order when the initial sweep direction flips?',
      scenario: 'The same queue is scheduled sweeping up and then sweeping down.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `${correct} all read the direction, because their whole strategy is a directional sweep. FCFS follows arrival order and SSTF follows distance, so neither cares which way the head was moving.`,
      relatedLab: LAB,
    });
  }

  return challenges;
}
