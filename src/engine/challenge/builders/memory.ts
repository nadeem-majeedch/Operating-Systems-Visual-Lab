import type { FitPolicy, MemoryInput, MemoryPreset, MemoryStepData } from '../../memory';
import {
  CONTIGUOUS_PRESETS,
  FIT_POLICY_LABELS,
  FIXED_PARTITION_PRESETS,
  runMemory,
} from '../../memory';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer } from './helpers';

const TOPIC = 'memory-management';
const CONTIGUOUS_LAB = 'lab-contiguous-allocation';
const FIXED_LAB = 'lab-fixed-partitions';

function variablePreset(id: string): MemoryPreset {
  const preset = CONTIGUOUS_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing memory preset ${id}`);
  return preset;
}

function fixedPreset(id: string): MemoryPreset {
  const preset = FIXED_PARTITION_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`missing fixed-partition preset ${id}`);
  return preset;
}

function inputFor(preset: MemoryPreset, policy: FitPolicy, mode: 'fixed' | 'variable'): MemoryInput {
  return {
    mode,
    policy,
    totalSize: preset.totalSize,
    ...(preset.partitions ? { partitions: preset.partitions } : {}),
    operations: preset.operations,
  };
}

function dataFor(preset: MemoryPreset, policy: FitPolicy, mode: 'fixed' | 'variable'): MemoryStepData[] {
  return runMemory(inputFor(preset, policy, mode)).steps.map((step) => step.data);
}

function lastOf(data: readonly MemoryStepData[]): MemoryStepData | undefined {
  return data[data.length - 1];
}

/**
 * The memory-management bank.
 *
 * Placement addresses, fragmentation totals and free-block counts are read from
 * the contiguous-allocation engine, so every answer can be reproduced by loading
 * the preset and stepping through the request sequence.
 */
export function memoryChallenges(): Challenge[] {
  const challenges: Challenge[] = [];
  const strategies = variablePreset('mem-strategies');
  const fragmentation = variablePreset('mem-fragmentation');
  const basic = variablePreset('mem-basic');
  const coalesce = variablePreset('mem-coalesce');
  const exactFit = variablePreset('mem-exact-fit');
  const fixedInternal = fixedPreset('fixed-internal');

  const placement = (policy: FitPolicy): number => lastOf(dataFor(strategies, policy, 'variable'))?.activeStart ?? -1;

  const addressOptions = (): string[] => {
    const values = [...new Set([
      placement('first-fit'),
      placement('best-fit'),
      placement('worst-fit'),
    ])].sort((a, b) => a - b);
    return values.map((value) => `address ${value}`);
  };

  /* --------------------------------------------------------------------- */
  /* Placement strategies                                                   */
  /* --------------------------------------------------------------------- */

  {
    const correct = `address ${placement('best-fit')}`;
    const options = addressOptions();
    const { options: opts, correctId } = choiceSet(correct, options.filter((label) => label !== correct), 1);
    challenges.push({
      id: 'memory-best-fit-address',
      topic: TOPIC,
      bank: 'placement',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'Where does the 150-unit request land under best fit?',
      scenario:
        'Three non-adjacent holes of different sizes have been created; a new 150-unit request arrives.',
      options: opts,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Best fit scans every hole and takes the smallest one that still fits, leaving as little unusable remainder as possible. It minimises the immediate waste but tends to leave many tiny, useless slivers behind.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const correct = `address ${placement('worst-fit')}`;
    const options = addressOptions();
    const { options: opts, correctId } = choiceSet(correct, options.filter((label) => label !== correct), 2);
    challenges.push({
      id: 'memory-worst-fit-address',
      topic: TOPIC,
      bank: 'placement',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'Where does the same 150-unit request land under worst fit?',
      scenario: 'The same three holes, but the allocator always takes the largest one.',
      options: opts,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Worst fit takes the biggest hole so the remainder is still large enough to be useful later. It deliberately avoids creating tiny fragments, at the cost of destroying the one big hole that might have served a large request.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const scores = (['first-fit', 'best-fit', 'worst-fit', 'next-fit'] as const).map((policy) => ({
      policy,
      value: lastOf(dataFor(strategies, policy, 'variable'))?.largestFreeBlock ?? 0,
    }));
    const best = scores.reduce((winner, entry) => (entry.value > winner.value ? entry : winner));
    const labels = scores.map((entry) => FIT_POLICY_LABELS[entry.policy]);
    const correct = FIT_POLICY_LABELS[best.policy];
    const { options, correctId } = choiceSet(correct, labels.filter((label) => label !== correct), 0);
    challenges.push({
      id: 'memory-largest-remainder',
      topic: TOPIC,
      bank: 'placement',
      difficulty: 'advanced',
      kind: 'decision',
      question: 'Which placement policy leaves the largest single free block after the request?',
      scenario: 'The same three-hole map and 150-unit request, tried under every policy.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation: `The engine measures the largest free block left by each policy and finds ${correct} in front with ${best.value} units. Which policy wins depends entirely on the hole sizes: worst fit can end up *spending* the biggest hole on a small request, leaving a smaller remainder than a strategy that ignored it. Placement heuristics are workload-dependent, not universally optimal.`,
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Fragmentation and compaction                                           */
  /* --------------------------------------------------------------------- */

  {
    const failed = dataFor(fragmentation, 'first-fit', 'variable').some(
      (step) => step.event === 'failed' || step.success === false,
    );
    const { options, correctId } = choiceSet(failed ? 'No' : 'Yes', [failed ? 'Yes' : 'No'], 0);
    challenges.push({
      id: 'memory-fragmentation-fails',
      topic: TOPIC,
      bank: 'fragmentation',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Total free memory is enough, but the holes are scattered. Does the 800-unit request succeed?',
      scenario: 'Three isolated holes sit between resident processes when an 800-unit request arrives.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'No single hole holds 800 units even though the total free space does. This is external fragmentation: the free memory exists but is not contiguous, and no placement policy can conjure a large enough run.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const succeeded = lastOf(dataFor(fragmentation, 'first-fit', 'variable'))?.success === true;
    const { options, correctId } = choiceSet(succeeded ? 'Yes' : 'No', [succeeded ? 'No' : 'Yes'], 1);
    challenges.push({
      id: 'memory-compaction-fixes',
      topic: TOPIC,
      bank: 'fragmentation',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'After compacting memory, does the same 800-unit request succeed?',
      scenario: 'The resident processes are slid together so all free memory becomes one block.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Compaction merges the scattered holes into a single large run, so the request fits. The price is copying every resident process and fixing up every reference to it — work proportional to memory used, not to the request size.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const correct = lastOf(dataFor(fixedInternal, 'first-fit', 'fixed'))?.internalFragmentation ?? 0;
    challenges.push({
      id: 'memory-internal-fragmentation',
      topic: TOPIC,
      bank: 'fragmentation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'Four 250-unit partitions each hold a 200-unit process. What is the total internal fragmentation?',
      scenario: 'Fixed 250-unit partitions, four processes of 200 units each.',
      unit: 'units',
      expectedAnswer: numberAnswer(correct),
      explanation: `Each partition wastes 250 − 200 = 50 units that are reserved for the process but unusable by anyone else, so four partitions waste ${correct} units. Unlike external fragmentation, this waste lives inside an allocated partition and cannot be reclaimed without repartitioning.`,
      relatedLab: FIXED_LAB,
    });
  }

  {
    const freed = dataFor(basic, 'first-fit', 'variable').find((step) => step.summary === 'Free B');
    const correct = freed?.freeBlocks ?? 0;
    challenges.push({
      id: 'memory-free-block-count',
      topic: TOPIC,
      bank: 'fragmentation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'Right after process B is freed, how many free blocks does the map contain?',
      scenario: 'A simple allocate/free sequence: A, B, C, D are placed, then B is released.',
      unit: 'free blocks',
      expectedAnswer: numberAnswer(correct),
      explanation: `Freeing B leaves ${correct} separate free block${correct === 1 ? '' : 's'}. The allocator coalesces only *adjacent* free blocks, so a hole boxed in by live processes stays isolated until its neighbours are also freed.`,
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const freed = dataFor(coalesce, 'first-fit', 'variable').find((step) => step.summary === 'Free C');
    const correct = freed?.largestFreeBlock ?? 0;
    challenges.push({
      id: 'memory-coalesce-size',
      topic: TOPIC,
      bank: 'fragmentation',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'Three adjacent 200-unit processes are freed in turn. How large is the largest free block afterwards?',
      scenario: 'A, B and C are contiguous in memory; A, then B, then C are released.',
      unit: 'units',
      expectedAnswer: numberAnswer(correct),
      explanation: `Freeing A, B and C merges three adjacent 200-unit holes into one ${correct}-unit block. Coalescing is what keeps a heavily churned heap from dissolving into unusable slivers.`,
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const correct = lastOf(dataFor(exactFit, 'first-fit', 'variable'))?.activeStart ?? -1;
    const candidates = [0, 200, 300, 500];
    const labels = candidates.map((value) => `address ${value}`);
    const { options, correctId } = choiceSet(`address ${correct}`, labels.filter((label) => label !== `address ${correct}`), 0);
    challenges.push({
      id: 'memory-exact-fit',
      topic: TOPIC,
      bank: 'placement',
      difficulty: 'advanced',
      kind: 'multiple-choice',
      question: 'A freed 200-unit hole sits at the very start. Where does the next 200-unit request land?',
      scenario: 'A 200-unit process is freed and a new 200-unit request arrives.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'The freed hole is exactly the right size, so the request consumes it whole and creates no remainder. An exact fit is the ideal case: no internal waste, no new external hole, and the allocation needs no splitting.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  {
    const correct = 'Best fit';
    const { options, correctId } = choiceSet(correct, ['First fit', 'Worst fit', 'Next fit'], 2);
    challenges.push({
      id: 'memory-policy-definition',
      topic: TOPIC,
      bank: 'placement',
      difficulty: 'beginner',
      kind: 'multiple-choice',
      question: 'Which policy chooses the smallest free hole that can satisfy the request?',
      scenario: 'Placing a request into a variable-partition memory map.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'Best fit picks the smallest sufficient hole. First fit takes the first sufficient hole, worst fit the largest, and next fit continues searching from where the last allocation stopped.',
      relatedLab: CONTIGUOUS_LAB,
    });
  }

  return challenges;
}
