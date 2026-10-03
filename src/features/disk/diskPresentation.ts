import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { DiskAlgorithm, DiskEvent, DiskStepData } from '@/engine';
import { DISK_ALGORITHM_LABELS } from '@/engine';
import { formatNumber } from '@/utils';

export function diskTimelineEntries(steps: readonly SimulationStep<DiskStepData>[]): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function diskLogEntries(steps: readonly SimulationStep<DiskStepData>[]): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

const EVENT_LABELS: Readonly<Record<DiskEvent, string>> = {
  init: 'Start head',
  service: 'Service request',
  turn: 'Seek to edge',
  wrap: 'Return without service',
};

export function diskEventLabel(event: DiskEvent): string {
  return EVENT_LABELS[event];
}

export function diskAlgorithmLabel(algorithm: DiskAlgorithm): string {
  return DISK_ALGORITHM_LABELS[algorithm];
}

export function diskDirectionLabel(direction: DiskStepData['direction']): string {
  return direction === 'up' ? 'Up ▲' : 'Down ▼';
}

/** Horizontal position of a cylinder as a percentage of the disk range. */
export function cylinderPercent(cylinder: number, diskSize: number): number {
  if (diskSize <= 1) return 0;
  return (cylinder / (diskSize - 1)) * 100;
}

/** Metric tiles for the current step. */
export function diskMetricItems(data: DiskStepData): MetricItem[] {
  const average = data.servicedCount === 0 ? 0 : data.averageSeek;
  return [
    {
      id: 'totalMovement',
      label: 'Total head movement',
      value: `${formatNumber(data.totalMovement, 0)}`,
      hint: `${data.servicedCount} of ${data.requestCount} requests served`,
      tone: 'default',
    },
    {
      id: 'averageSeek',
      label: 'Average seek distance',
      value: `${formatNumber(average, 1)}`,
      hint: 'total movement ÷ requests served',
    },
    {
      id: 'worstSeek',
      label: 'Longest single hop',
      value: `${formatNumber(data.worstSeek, 0)}`,
      hint: 'worst-case latency so far',
      tone: data.worstSeek >= data.diskSize / 2 ? 'warning' : 'default',
    },
    {
      id: 'head',
      label: 'Current head',
      value: `${data.head}`,
      hint: `of ${data.diskSize - 1} cylinders`,
    },
    {
      id: 'direction',
      label: 'Direction',
      value: diskDirectionLabel(data.direction),
      hint: `${data.pending.length} request${data.pending.length === 1 ? '' : 's'} pending`,
    },
  ];
}

/** Service order string, e.g. `65 → 67 → 98`. */
export function serviceOrderLabel(order: readonly number[]): string {
  return order.length > 0 ? order.join(' → ') : '—';
}
