import {
  PHILOSOPHERS_PRESETS,
  PRODUCER_CONSUMER_PRESETS,
  RACE_PRESETS,
  READERS_WRITERS_PRESETS,
  runPhilosophers,
  runProducerConsumer,
  runRace,
  runReadersWriters,
} from '../../synchronization';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer, sequenceAnswer, sequenceSet } from './helpers';

const TOPIC = 'synchronization';
const RACE_LAB = 'lab-mutex';
const PC_LAB = 'lab-bounded-buffer';
const PHIL_LAB = 'lab-dining-philosophers';
const RW_LAB = 'lab-readers-writers';

function raceInput(id: string) {
  const preset = RACE_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing race preset ${id}`);
  return preset.input;
}

function pcInput(id: string) {
  const preset = PRODUCER_CONSUMER_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing producer/consumer preset ${id}`);
  return preset.input;
}

function philInput(id: string) {
  const preset = PHILOSOPHERS_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing philosophers preset ${id}`);
  return preset.input;
}

function rwInput(id: string) {
  const preset = READERS_WRITERS_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing readers/writers preset ${id}`);
  return preset.input;
}

/**
 * The synchronization bank.
 *
 * Every count is read out of the engine run for the named preset — the lost
 * updates, meals eaten, items produced and operations completed are all
 * measurements, not author claims.
 */
export function synchronizationChallenges(): Challenge[] {
  const challenges: Challenge[] = [];

  const unsafe = runRace(raceInput('race-unsafe')).summary;
  const mutex = runRace(raceInput('race-mutex')).summary;
  const threeRacers = runRace(raceInput('race-unsafe-three')).summary;
  const deadlock = runPhilosophers(philInput('phil-deadlock')).summary;
  const ordered = runPhilosophers(philInput('phil-ordered')).summary;
  const steady = runProducerConsumer(pcInput('pc-steady')).summary;
  const balanced = runProducerConsumer(pcInput('pc-balanced')).summary;
  const mixed = runReadersWriters(rwInput('rw-mixed')).summary;

  /* --------------------------------------------------------------------- */
  /* Race conditions                                                        */
  /* --------------------------------------------------------------------- */

  {
    const correct = unsafe.finalCounter ?? 0;
    challenges.push({
      id: 'sync-unsafe-counter',
      topic: TOPIC,
      bank: 'race-conditions',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'Two processes each increment a shared counter twice with no lock. What is the final value?',
      scenario: 'The "Unsafe" race preset: two processes, two iterations each, no mutual exclusion.',
      unit: 'counter value',
      expectedAnswer: numberAnswer(correct),
      explanation: `The correct total is ${unsafe.expected}, but the interleaved load–add–store sequence leaves the counter at ${correct}. Each process reads a stale value into its register before the other writes, so the second store overwrites the first — a classic lost update.`,
      relatedLab: RACE_LAB,
    });
  }

  {
    const correct = unsafe.lostUpdates ?? 0;
    challenges.push({
      id: 'sync-lost-updates',
      topic: TOPIC,
      bank: 'race-conditions',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many increments are lost in the "Unsafe" race preset?',
      scenario: 'Two processes perform two increments each on a shared counter, interleaved without a lock.',
      unit: 'lost updates',
      expectedAnswer: numberAnswer(correct),
      explanation: `Expected ${unsafe.expected} increments, final counter ${unsafe.finalCounter}, so ${correct} update${correct === 1 ? '' : 's'} vanished. The increment is three instructions — load, add, store — and nothing makes that sequence atomic.`,
      relatedLab: RACE_LAB,
    });
  }

  {
    const correct = 'Mutex';
    const { options, correctId } = choiceSet(correct, ['Unsafe', 'Semaphore only', 'Neither'], 1);
    challenges.push({
      id: 'sync-mutex-fixes-it',
      topic: TOPIC,
      bank: 'race-conditions',
      difficulty: 'beginner',
      kind: 'decision',
      question: 'Which change makes the shared-counter increment produce the correct result?',
      scenario: 'Two processes each perform two non-atomic increments of a shared counter.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `Wrapping the increment in a mutex forces one process to finish all three instructions before the other may load, so no update is lost. A binary semaphore used as a lock has the same effect. Mutex gives correctness, not speed — the serialization is the whole point.`,
      relatedLab: RACE_LAB,
    });
  }

  {
    const correct = mutex.finalCounter ?? 0;
    challenges.push({
      id: 'sync-mutex-counter',
      topic: TOPIC,
      bank: 'race-conditions',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'What is the final counter with a mutex, in the same workload?',
      scenario: 'Two processes, two non-atomic increments each, guarded by a mutex.',
      unit: 'counter value',
      expectedAnswer: numberAnswer(correct),
      explanation: `With mutual exclusion every increment runs to completion before the next begins, so the counter reaches the expected ${correct}. The engine records ${mutex.lostUpdates} lost updates.`,
      relatedLab: RACE_LAB,
    });
  }

  {
    const correct = threeRacers.lostUpdates ?? 0;
    challenges.push({
      id: 'sync-three-racers',
      topic: TOPIC,
      bank: 'race-conditions',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'With three unsafe processes instead of two, how many updates are lost?',
      scenario: 'Three processes race on the same non-atomic counter, two increments each.',
      unit: 'lost updates',
      expectedAnswer: numberAnswer(correct),
      explanation: `More racers mean more interleavings that overwrite a fresh value, so the loss grows: ${correct} update${correct === 1 ? '' : 's'} lost against an expected ${threeRacers.expected}. The bug is probabilistic — a test may pass many times before the unlucky interleaving strikes.`,
      relatedLab: RACE_LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Producer / consumer                                                    */
  /* --------------------------------------------------------------------- */

  {
    const correct = steady.produced ?? 0;
    challenges.push({
      id: 'sync-items-produced',
      topic: TOPIC,
      bank: 'producer-consumer',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'How many items does the "Steady pair" producer/consumer run produce?',
      scenario: 'One producer placing four items into a two-slot buffer, one consumer taking them.',
      unit: 'items',
      expectedAnswer: numberAnswer(correct),
      explanation: `The single producer places ${correct} items. The empty and full semaphores throttle it so the producer sleeps whenever the two-slot buffer is full rather than dropping work — the buffer never overflows.`,
      relatedLab: PC_LAB,
    });
  }

  {
    const correct = steady.buffered ?? 0;
    challenges.push({
      id: 'sync-buffered-left',
      topic: TOPIC,
      bank: 'producer-consumer',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'At the end of the "Steady pair" run, how many items remain in the buffer?',
      scenario: 'Four items are produced and four are consumed from a two-slot buffer.',
      unit: 'items',
      expectedAnswer: numberAnswer(correct),
      explanation: `Every produced item is eventually consumed, so the buffer is back to ${correct}. The invariant empty + full = capacity holds throughout: a slot is either free for the producer or full for the consumer, never both.`,
      relatedLab: PC_LAB,
    });
  }

  {
    const correct = balanced.produced ?? 0;
    challenges.push({
      id: 'sync-balanced-produced',
      topic: TOPIC,
      bank: 'producer-consumer',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many items does the "Balanced" run (two producers, three items each) produce?',
      scenario: 'Two producers and two consumers sharing a three-slot buffer.',
      unit: 'items',
      expectedAnswer: numberAnswer(correct),
      explanation: `Each of the two producers places three items, so ${correct} in total. The mutex serialises access to the buffer array, while the counting semaphores let producers and consumers run concurrently when there is room and work.`,
      relatedLab: PC_LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Dining philosophers                                                    */
  /* --------------------------------------------------------------------- */

  {
    const deadlocked = (deadlock.deadlocked ?? 0) === 1;
    const { options, correctId } = choiceSet(deadlocked ? 'Yes' : 'No', [deadlocked ? 'No' : 'Yes', 'Only at the last meal'], 0);
    challenges.push({
      id: 'sync-naive-deadlock',
      topic: TOPIC,
      bank: 'dining-philosophers',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Does the naive strategy deadlock the table?',
      scenario: 'Five philosophers each pick up their left fork first, then wait for the right.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `The engine records ${deadlock.meals} of ${deadlock.target} meals before progress stops. Every philosopher holds one fork and waits for the other, closing a cycle — all four Coffman conditions hold at once: mutual exclusion, hold and wait, no preemption and circular wait.`,
      relatedLab: PHIL_LAB,
    });
  }

  {
    const correct = ordered.meals ?? 0;
    challenges.push({
      id: 'sync-ordered-meals',
      topic: TOPIC,
      bank: 'dining-philosophers',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many meals do the philosophers complete with ordered forks?',
      scenario: 'Five philosophers, two meals each, one philosopher taking its right fork first to break the cycle.',
      unit: 'meals',
      expectedAnswer: numberAnswer(correct),
      explanation: `Ordering the forks removes the circular wait, so ${correct} of ${ordered.target} meals complete. Breaking just one edge of the cycle is enough — the deadlock needs a closed loop, and a single ordered pick opens it.`,
      relatedLab: PHIL_LAB,
    });
  }

  {
    const correct = 'Mutual exclusion → Hold and wait → No preemption → Circular wait';
    const conditions = [
      'Mutual exclusion',
      'Hold and wait',
      'No preemption',
      'Circular wait',
    ];
    const { options, order } = sequenceSet(conditions, conditions);
    challenges.push({
      id: 'sync-coffman-order',
      topic: TOPIC,
      bank: 'dining-philosophers',
      difficulty: 'intermediate',
      kind: 'sequence',
      question: 'Arrange the four Coffman conditions in the textbook order used to describe deadlock.',
      scenario: 'A deadlock has just formed at the philosophers’ table.',
      options,
      expectedAnswer: sequenceAnswer(order),
      explanation: `The four conditions are ${correct}. Deadlock requires all four simultaneously; avoiding any single one — for instance by ordering fork acquisition to break the circular wait — makes deadlock impossible.`,
      relatedLab: PHIL_LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Readers / writers                                                      */
  /* --------------------------------------------------------------------- */

  {
    const correct = mixed.completedReads ?? 0;
    challenges.push({
      id: 'sync-completed-reads',
      topic: TOPIC,
      bank: 'readers-writers',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'How many reads complete in the "Readers and a writer" run?',
      scenario: 'Two readers each read twice and one writer writes once.',
      unit: 'reads',
      expectedAnswer: numberAnswer(correct),
      explanation: `The two readers perform their reads concurrently when no writer holds the lock, completing ${correct} in total. The first reader in locks out writers and the last reader out releases them — that is readers preference.`,
      relatedLab: RW_LAB,
    });
  }

  {
    const correct = mixed.completedWrites ?? 0;
    challenges.push({
      id: 'sync-completed-writes',
      topic: TOPIC,
      bank: 'readers-writers',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'How many writes complete in the same run?',
      scenario: 'One writer takes the lock once while two readers share the data.',
      unit: 'writes',
      expectedAnswer: numberAnswer(correct),
      explanation: `Writers need exclusive access, so ${correct} write${correct === 1 ? '' : 's'} complete only when no reader holds the lock. Under readers preference a steady stream of readers can postpone writers indefinitely — the starvation trade-off this classic solution accepts.`,
      relatedLab: RW_LAB,
    });
  }

  return challenges;
}
