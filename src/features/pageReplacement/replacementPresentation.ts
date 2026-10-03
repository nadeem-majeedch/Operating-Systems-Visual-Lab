import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { PageReplacementStepData, ReplacementAlgorithm, ReplacementEvent } from '@/engine';
import { REPLACEMENT_ALGORITHM_LABELS } from '@/engine';
import { formatPercent } from '@/utils';

export function replacementTimelineEntries(
  steps: readonly SimulationStep<PageReplacementStepData>[],
): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function replacementLogEntries(
  steps: readonly SimulationStep<PageReplacementStepData>[],
): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

const EVENT_LABELS: Readonly<Record<ReplacementEvent, string>> = {
  init: 'Initialise frames',
  hit: 'Hit',
  fault: 'Fault — free frame',
  replace: 'Fault — replacement',
};

export function replacementEventLabel(event: ReplacementEvent): string {
  return EVENT_LABELS[event];
}

export function algorithmLabel(algorithm: ReplacementAlgorithm): string {
  return REPLACEMENT_ALGORITHM_LABELS[algorithm];
}

export interface ReferenceOutcome {
  readonly index: number;
  readonly page: number;
  readonly hit: boolean;
}

/** One entry per reference, in order, so the strip can mark hits and faults. */
export function referenceOutcomes(
  steps: readonly SimulationStep<PageReplacementStepData>[],
): ReferenceOutcome[] {
  return steps
    .filter((step) => step.data.referenceIndex >= 0)
    .map((step) => ({
      index: step.data.referenceIndex,
      page: step.data.reference,
      hit: step.data.hit,
    }))
    .sort((a, b) => a.index - b.index);
}

export function replacementMetricItems(data: PageReplacementStepData): MetricItem[] {
  const references = data.referenceCount;
  const hitPercent = Math.round(data.hitRate * 100);
  return [
    {
      id: 'references',
      label: 'References',
      value: `${references}`,
      hint: `over ${data.frameCount} frame${data.frameCount === 1 ? '' : 's'}`,
    },
    {
      id: 'hits',
      label: 'Page hits',
      value: `${data.hits}`,
      hint: 'references that found the page resident',
      tone: data.hits > 0 ? 'positive' : 'default',
    },
    {
      id: 'faults',
      label: 'Page faults',
      value: `${data.faults}`,
      hint: 'references that had to load a page',
      tone: data.faults > 0 ? 'warning' : 'default',
    },
    {
      id: 'hitRate',
      label: 'Hit ratio',
      value: formatPercent(data.hitRate, 0),
      hint: `${data.hits} of ${references}`,
      tone: references === 0 ? 'default' : hitPercent >= 50 ? 'positive' : 'warning',
    },
    {
      id: 'faultRate',
      label: 'Fault ratio',
      value: formatPercent(data.faultRate, 0),
      hint: `${data.replacements} eviction${data.replacements === 1 ? '' : 's'}`,
    },
  ];
}
