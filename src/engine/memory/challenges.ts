import type { FitPolicy, MemoryInput, MemoryOperation, MemoryStepData } from './types';
import { FIT_POLICY_LABELS } from './types';
import { runMemory } from './allocation';
import { CONTIGUOUS_PRESETS, FIXED_PARTITION_PRESETS, type MemoryPreset } from './presets';

export type MemoryChallengeKind =
  | 'placement'
  | 'verdict'
  | 'internal-fragmentation'
  | 'free-blocks'
  | 'policy-choice';

export interface MemoryChallenge {
  readonly id: string;
  readonly kind: MemoryChallengeKind;
  readonly title: string;
  readonly prompt: string;
  readonly labId: string;
  readonly totalSize: number;
  readonly partitions?: readonly number[];
  readonly operations: readonly MemoryOperation[];
  readonly policy: FitPolicy;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

function variablePreset(id: string): MemoryPreset {
  return CONTIGUOUS_PRESETS.find((preset) => preset.id === id)!;
}

function fixedPreset(id: string): MemoryPreset {
  return FIXED_PARTITION_PRESETS.find((preset) => preset.id === id)!;
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

function stepsData(preset: MemoryPreset, policy: FitPolicy, mode: 'fixed' | 'variable'): MemoryStepData[] {
  return runMemory(inputFor(preset, policy, mode)).steps.map((step) => step.data);
}

function stepByLabel(data: readonly MemoryStepData[], label: string): MemoryStepData | undefined {
  return data.find((entry) => entry.summary === label);
}

function numericOptions(correct: number): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, correct + 50, Math.max(0, correct - 50), correct + 100])].sort(
    (a, b) => a - b,
  );
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

/**
 * The memory challenge set.
 *
 * Each answer is read out of the same engine the lab runs — a placement address,
 * a free-block count, a fragmentation total — so a learner can always reproduce
 * it by loading the preset and stepping through.
 */
export function buildMemoryChallenges(): MemoryChallenge[] {
  const challenges: MemoryChallenge[] = [];
  const strategies = variablePreset('mem-strategies');
  const fragmentation = variablePreset('mem-fragmentation');
  const basic = variablePreset('mem-basic');
  const coalesce = variablePreset('mem-coalesce');
  const exactFit = variablePreset('mem-exact-fit');
  const fixedInternal = fixedPreset('fixed-internal');

  const placement = (policy: FitPolicy): number => {
    const data = stepsData(strategies, policy, 'variable');
    const last = data[data.length - 1];
    return last?.activeStart ?? -1;
  };

  // 1–3 — where does the same request land under each policy?
  for (const policy of ['first-fit', 'best-fit', 'worst-fit'] as const) {
    const start = placement(policy);
    const options = [...new Set([placement('first-fit'), placement('best-fit'), placement('worst-fit')])]
      .sort((a, b) => a - b)
      .map((value) => `address ${value}`);
    challenges.push({
      id: `memory-placement-${policy}`,
      kind: 'placement',
      title: `${FIT_POLICY_LABELS[policy]} placement`,
      prompt: `After the holes are created, at which address does the 150-unit request land under ${FIT_POLICY_LABELS[
        policy
      ].toLowerCase()}?`,
      labId: 'lab-contiguous-allocation',
      totalSize: strategies.totalSize,
      operations: strategies.operations,
      policy,
      options,
      correctIndex: options.indexOf(`address ${start}`),
      explanation:
        policy === 'first-fit'
          ? 'First fit takes the first hole big enough — the 300-unit hole at address 0.'
          : policy === 'best-fit'
            ? 'Best fit takes the smallest hole that still fits — the 200-unit hole at address 1000.'
            : 'Worst fit takes the largest hole — the 400-unit hole at address 450.',
    });
  }

  // 4 — which policy leaves the largest contiguous remainder?
  {
    const largest = (policy: FitPolicy): number => {
      const data = stepsData(strategies, policy, 'variable');
      return data[data.length - 1]?.largestFreeBlock ?? 0;
    };
    const scores = (['first-fit', 'best-fit', 'worst-fit', 'next-fit'] as const).map((policy) => ({
      policy,
      value: largest(policy),
    }));
    const best = scores.reduce((winner, entry) => (entry.value > winner.value ? entry : winner));
    const options = ['first-fit', 'best-fit', 'worst-fit', 'next-fit'];
    challenges.push({
      id: 'memory-policy-remainder',
      kind: 'policy-choice',
      title: 'Largest remainder',
      prompt: 'Which policy leaves the largest single free block after the 150-unit request?',
      labId: 'lab-contiguous-allocation',
      totalSize: strategies.totalSize,
      operations: strategies.operations,
      policy: 'first-fit',
      options,
      correctIndex: options.indexOf(best.policy),
      explanation: `Worst fit takes the biggest hole (400) and leaves the biggest remainder; ${FIT_POLICY_LABELS[best.policy]} leaves ${
        best.value
      } units free in one piece.`,
    });
  }

  // 5 — does the large request succeed before compaction?
  {
    const data = stepsData(fragmentation, 'first-fit', 'variable');
    const failed = stepByLabel(data, 'E could not be allocated');
    challenges.push({
      id: 'memory-fragmentation-fails',
      kind: 'verdict',
      title: 'Fragmented failure',
      prompt: 'Free memory is split across holes. Does the 800-unit request succeed before compaction?',
      labId: 'lab-contiguous-allocation',
      totalSize: fragmentation.totalSize,
      operations: fragmentation.operations,
      policy: 'first-fit',
      options: ['Yes', 'No'],
      correctIndex: failed ? 1 : 0,
      explanation: failed
        ? 'Total free memory is enough, but no single hole holds 800 units — this is external fragmentation, and the request fails.'
        : 'The request fits.',
    });
  }

  // 6 — does it succeed after compaction?
  {
    const data = stepsData(fragmentation, 'first-fit', 'variable');
    const last = data[data.length - 1];
    const succeeded = last?.success === true && last.event === 'allocate';
    challenges.push({
      id: 'memory-fragmentation-compacted',
      kind: 'verdict',
      title: 'Compaction fixes it',
      prompt: 'After compacting memory, does the same 800-unit request succeed?',
      labId: 'lab-contiguous-allocation',
      totalSize: fragmentation.totalSize,
      operations: fragmentation.operations,
      policy: 'first-fit',
      options: ['Yes', 'No'],
      correctIndex: succeeded ? 0 : 1,
      explanation:
        'Compaction slides the resident processes together so all free memory becomes one block, and the request fits. The cost is copying every resident process and fixing up all references to it.',
    });
  }

  // 7 — internal fragmentation total.
  {
    const data = stepsData(fixedInternal, 'first-fit', 'fixed');
    const last = data[data.length - 1];
    const correct = last?.internalFragmentation ?? 0;
    const { options, correctIndex } = numericOptions(correct);
    challenges.push({
      id: 'memory-internal-fragmentation',
      kind: 'internal-fragmentation',
      title: 'Internal fragmentation',
      prompt: 'Four 250-unit partitions each hold a 200-unit process. What is the total internal fragmentation?',
      labId: 'lab-fixed-partitions',
      totalSize: fixedInternal.totalSize,
      partitions: fixedInternal.partitions,
      operations: fixedInternal.operations,
      policy: 'first-fit',
      options,
      correctIndex,
      explanation: `Each 250-unit partition wastes 250 − 200 = 50 units, so four partitions waste ${correct} units that are reserved but unusable.`,
    });
  }

  // 8 — free-block count.
  {
    const data = stepsData(basic, 'first-fit', 'variable');
    const freed = stepByLabel(data, 'Free B');
    const correct = freed?.freeBlocks ?? 0;
    const { options, correctIndex } = numericOptions(correct);
    challenges.push({
      id: 'memory-free-block-count',
      kind: 'free-blocks',
      title: 'Count the free blocks',
      prompt: 'In the simple sequence, how many free blocks exist right after process B is freed?',
      labId: 'lab-contiguous-allocation',
      totalSize: basic.totalSize,
      operations: basic.operations,
      policy: 'first-fit',
      options,
      correctIndex,
      explanation: `Freeing B leaves ${correct} separate free block${
        correct === 1 ? '' : 's'
      }; neighbours are coalesced automatically when they are adjacent.`,
    });
  }

  // 9 — coalesced hole size.
  {
    const data = stepsData(coalesce, 'first-fit', 'variable');
    const freed = stepByLabel(data, 'Free C');
    const correct = freed?.largestFreeBlock ?? 0;
    const { options, correctIndex } = numericOptions(correct);
    challenges.push({
      id: 'memory-coalesce-size',
      kind: 'free-blocks',
      title: 'Merged hole size',
      prompt: 'Three adjacent 200-unit processes A, B and C are freed in turn. How large is the largest free block afterwards?',
      labId: 'lab-contiguous-allocation',
      totalSize: coalesce.totalSize,
      operations: coalesce.operations,
      policy: 'first-fit',
      options,
      correctIndex,
      explanation: `Freeing A, B and C merges three adjacent 200-unit holes into one ${correct}-unit block.`,
    });
  }

  // 10 — exact fit.
  {
    const data = stepsData(exactFit, 'first-fit', 'variable');
    const last = data[data.length - 1];
    const start = last?.activeStart ?? -1;
    const options = ['address 0', 'address 200', 'address 300', 'address 500'];
    challenges.push({
      id: 'memory-exact-fit',
      kind: 'placement',
      title: 'Exact fit',
      prompt: 'Process C needs exactly 200 units after the 200-unit hole at the start is freed. Where does it land?',
      labId: 'lab-contiguous-allocation',
      totalSize: exactFit.totalSize,
      operations: exactFit.operations,
      policy: 'first-fit',
      options,
      correctIndex: Math.max(0, options.indexOf(`address ${start}`)),
      explanation: 'The freed 200-unit hole fits the request exactly, so no remainder is created.',
    });
  }

  return challenges;
}

/** Stable count used by tests and the UI's progress copy. */
export const MEMORY_CHALLENGE_COUNT = buildMemoryChallenges().length;
