import type { Id, SimulationStep } from '@/types';
import { round, slugify } from '@/utils';

/** Authoring shape of a step; the engine supplies index and derived ids. */
export interface StepDraft<TData> {
  readonly label: string;
  readonly description: string;
  readonly explanation?: string;
  /** Logical clock value (time unit, quantum, instruction counter, ...). */
  readonly clock: number;
  readonly data: TData;
  readonly highlights?: readonly Id[];
  readonly metrics?: Readonly<Record<string, number>>;
}

/**
 * Build a `SimulationStep`. Ids are deterministic (`label-index`) so that
 * snapshots, React keys and test assertions stay stable between runs.
 */
export function createStep<TData>(draft: StepDraft<TData>, index: number): SimulationStep<TData> {
  const step: SimulationStep<TData> = {
    id: `${slugify(draft.label) || 'step'}-${index}`,
    index,
    label: draft.label,
    description: draft.description,
    clock: draft.clock,
    highlights: draft.highlights ?? [],
    data: draft.data,
    ...(draft.explanation === undefined ? {} : { explanation: draft.explanation }),
    ...(draft.metrics === undefined ? {} : { metrics: roundRecord(draft.metrics) }),
  };
  return step;
}

/** Build an ordered step list in one pass, assigning indices automatically. */
export function createSteps<TData>(drafts: readonly StepDraft<TData>[]): SimulationStep<TData>[] {
  return drafts.map((draft, index) => createStep(draft, index));
}

/** Round every metric value for stable, readable display. */
export function roundRecord(
  record: Readonly<Record<string, number>>,
  decimals = 2,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = round(value, decimals);
  }
  return result;
}

/** The metrics of the final step, i.e. the outcome of a completed run. */
export function finalMetrics<TData>(
  steps: readonly SimulationStep<TData>[],
): Readonly<Record<string, number>> {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step?.metrics) return step.metrics;
  }
  return {};
}
