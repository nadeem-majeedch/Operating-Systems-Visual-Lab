import type { DiskAlgorithm, DiskInput } from './types';
import { DISK_ALGORITHMS } from './types';
import { diskServiceOrder, diskTotalMovement, runDiskScheduling } from './scheduling';

export interface DiskOutcome {
  readonly algorithm: DiskAlgorithm;
  readonly totalMovement: number;
  readonly averageSeek: number;
  readonly worstSeek: number;
  /** Cylinders serviced, in service order. */
  readonly order: readonly number[];
  /** The first request serviced. */
  readonly firstServed: number | null;
  /** The last request serviced. */
  readonly lastServed: number | null;
}

export type DiskScenario = Omit<DiskInput, 'algorithm'>;

/** Run every policy over the same queue, head and direction for side-by-side comparison. */
export function compareDiskScheduling(
  scenario: DiskScenario,
  algorithms: readonly DiskAlgorithm[] = DISK_ALGORITHMS,
): readonly DiskOutcome[] {
  return algorithms.map((algorithm) => {
    const input: DiskInput = { ...scenario, algorithm };
    const summary = runDiskScheduling(input).summary;
    const order = diskServiceOrder(input);
    return {
      algorithm,
      totalMovement: summary.totalMovement ?? 0,
      averageSeek: summary.averageSeek ?? 0,
      worstSeek: summary.worstSeek ?? 0,
      order,
      firstServed: order[0] ?? null,
      lastServed: order[order.length - 1] ?? null,
    };
  });
}

/** Total head movement for each policy, keyed by algorithm. */
export function diskMovementByAlgorithm(scenario: DiskScenario): Record<DiskAlgorithm, number> {
  const result = {} as Record<DiskAlgorithm, number>;
  for (const algorithm of DISK_ALGORITHMS) {
    result[algorithm] = diskTotalMovement({ ...scenario, algorithm });
  }
  return result;
}
