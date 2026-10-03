import type { AllocationStrategy, FsInput, FsOperation } from './types';
import { ALLOCATION_STRATEGIES } from './types';
import { runFileSystem } from './fileSystem';

export type FsScenario = Omit<FsInput, 'allocation'>;

export interface FsOutcome {
  readonly strategy: AllocationStrategy;
  /** Operations that completed (excluding the mount step). */
  readonly succeeded: number;
  readonly failed: number;
  readonly usedBlocks: number;
  readonly freeBlocks: number;
  readonly usedInodes: number;
  /** Labels of the operations that were rejected. */
  readonly failures: readonly string[];
  readonly steps: number;
}

/** Run the same script under every allocation strategy, for side-by-side comparison. */
export function compareFsAllocation(
  scenario: FsScenario,
  strategies: readonly AllocationStrategy[] = ALLOCATION_STRATEGIES,
): readonly FsOutcome[] {
  return strategies.map((strategy) => {
    const run = runFileSystem({ ...scenario, allocation: strategy });
    const failures = run.steps
      .filter((step) => step.data.success === false)
      .map((step) => step.data.operation);
    const succeeded = run.steps.filter(
      (step) => step.data.success === true && step.data.event !== 'init',
    ).length;
    return {
      strategy,
      succeeded,
      failed: failures.length,
      usedBlocks: run.summary.usedBlocks ?? 0,
      freeBlocks: run.summary.freeBlocks ?? 0,
      usedInodes: run.summary.usedInodes ?? 0,
      failures,
      steps: run.steps.length,
    };
  });
}

/** Total blocks occupied by data plus any index blocks, for a script. */
export function fsUsedBlocks(scenario: FsScenario): number {
  return runFileSystem({ ...scenario, allocation: 'indexed' }).summary.usedBlocks ?? 0;
}

/** Re-exported so callers can type a script without importing the full input. */
export type FsScript = readonly FsOperation[];

/**
 * The qualitative trade-off table for the three strategies.
 *
 * These are the properties that do not depend on a particular run — how each
 * strategy behaves for sequential and random reads, how it grows, and the price
 * it pays — so the compare view can teach the design space next to the live
 * results.
 */
export interface FsStrategyProfile {
  readonly strategy: AllocationStrategy;
  /** Cost of reading the file start to finish. */
  readonly sequential: string;
  /** Cost of jumping to an arbitrary block. */
  readonly random: string;
  /** What has to be true to extend the file. */
  readonly growth: string;
  /** Whether it can fail with free space left over. */
  readonly fragmentation: string;
  /** Extra metadata or pointer blocks it spends. */
  readonly overhead: string;
}

export const FS_STRATEGY_PROFILES: readonly FsStrategyProfile[] = [
  {
    strategy: 'contiguous',
    sequential: 'One run — a single seek, then streaming.',
    random: 'O(1): block start + i, no pointer chase.',
    growth: 'Only into the blocks directly after the file.',
    fragmentation: 'Suffers it: can fail while free blocks remain.',
    overhead: 'Two numbers in the inode (start, length).',
  },
  {
    strategy: 'linked',
    sequential: 'Follows the chain; each block names the next.',
    random: 'O(i): walk i pointers to reach block i.',
    growth: 'Anywhere — takes whatever blocks are free.',
    fragmentation: 'Never: isolated holes are perfectly usable.',
    overhead: 'One pointer per data block.',
  },
  {
    strategy: 'indexed',
    sequential: 'Inode pointers, then data — no chase.',
    random: 'O(1): the inode (or index block) knows every block.',
    growth: 'Anywhere — takes whatever blocks are free.',
    fragmentation: 'Never: isolated holes are perfectly usable.',
    overhead: 'A whole block once a file passes the direct pointers.',
  },
];

export function allocationProfile(strategy: AllocationStrategy): FsStrategyProfile | undefined {
  return FS_STRATEGY_PROFILES.find((profile) => profile.strategy === strategy);
}
