import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { AllocationStrategy, FsEvent, FsStepData } from '@/engine';
import { ALLOCATION_LABELS } from '@/engine';
import { formatNumber } from '@/utils';

export function fsTimelineEntries(steps: readonly SimulationStep<FsStepData>[]): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function fsLogEntries(steps: readonly SimulationStep<FsStepData>[]): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

const EVENT_LABELS: Readonly<Record<FsEvent, string>> = {
  init: 'Mount volume',
  mkdir: 'mkdir',
  create: 'create',
  delete: 'delete',
  rename: 'rename',
  move: 'move',
  open: 'open',
  close: 'close',
  chmod: 'chmod',
  grow: 'grow',
  shrink: 'shrink',
  failed: 'refused',
};

export function fsEventLabel(event: FsEvent): string {
  return EVENT_LABELS[event];
}

export function fsAllocationLabel(allocation: AllocationStrategy): string {
  return ALLOCATION_LABELS[allocation];
}

/** Human-readable byte count, e.g. `1.5 KB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
}

/** Metric tiles for the current step. */
export function fsMetricItems(data: FsStepData): MetricItem[] {
  const usedPercent = data.blockCount === 0 ? 0 : (data.usedBlocks / data.blockCount) * 100;
  return [
    {
      id: 'usedBlocks',
      label: 'Blocks used',
      value: `${data.usedBlocks} / ${data.blockCount}`,
      hint: `${formatNumber(usedPercent, 0)}% of the volume`,
      tone: usedPercent >= 90 ? 'warning' : 'default',
    },
    {
      id: 'freeBlocks',
      label: 'Blocks free',
      value: `${data.freeBlocks}`,
    },
    {
      id: 'usedInodes',
      label: 'Inodes used',
      value: `${data.usedInodes} / ${data.usedInodes + data.freeInodes}`,
      hint: `${data.freeInodes} free`,
      tone: data.freeInodes === 0 ? 'warning' : 'default',
    },
    {
      id: 'freeRuns',
      label: 'Free runs',
      value: `${data.freeRuns.length}`,
      hint: `largest ${data.largestFreeRun} block${data.largestFreeRun === 1 ? '' : 's'}`,
    },
    {
      id: 'fragmentation',
      label: 'External fragmentation',
      value: `${formatNumber(data.externalFragmentation * 100, 0)}%`,
      hint:
        data.freeBlocks === 0
          ? 'no free space to fragment'
          : 'free space trapped in holes too small to use contiguously',
      tone: data.externalFragmentation >= 0.5 ? 'warning' : 'default',
    },
    {
      id: 'nodes',
      label: 'Tree nodes',
      value: `${data.nodes.length}`,
      hint: 'directories + files',
    },
    {
      id: 'openFiles',
      label: 'Open files',
      value: `${data.openFiles.length}`,
      hint: data.openFiles.length > 0 ? data.openFiles.join(', ') : 'none open',
    },
  ];
}
