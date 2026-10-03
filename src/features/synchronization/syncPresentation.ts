import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { SyncStepData, SyncTone } from '@/engine';

/** Collapse a simulation tone onto the metric panel's smaller tone set. */
export function metricTone(tone: SyncTone | undefined): 'default' | 'positive' | 'warning' {
  if (tone === 'positive') return 'positive';
  if (tone === 'warning' || tone === 'danger') return 'warning';
  return 'default';
}

export function syncTimelineEntries(steps: readonly SimulationStep<SyncStepData>[]): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function syncLogEntries(steps: readonly SimulationStep<SyncStepData>[]): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

/** Metrics come straight from each step's shared-resource snapshot. */
export function syncMetricItems(data: SyncStepData): MetricItem[] {
  const items: MetricItem[] = data.resources.map((resource, index) => ({
    id: `resource-${index}`,
    label: resource.name,
    value: resource.value,
    ...(resource.hint ? { hint: resource.hint } : {}),
    tone: metricTone(resource.tone),
  }));
  items.push({
    id: 'clock',
    label: 'Clock',
    value: `t = ${data.clock}`,
    hint: 'elapsed simulation steps',
  });
  return items;
}
