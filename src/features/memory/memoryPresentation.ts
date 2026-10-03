import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { MemoryStepData } from '@/engine';
import { formatNumber, formatPercent } from '@/utils';

const BLOCK_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#38bdf8', '#fb7185'];

/** Stable colour for a process name, so a block keeps its identity. */
export function memoryColorFor(name: string | null, fallbackIndex = 0): string {
  if (!name) return '#94a3b8';
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) & 0xffff;
  }
  const paletteIndex = hash % BLOCK_COLORS.length || fallbackIndex % BLOCK_COLORS.length;
  return BLOCK_COLORS[paletteIndex] ?? '#6366f1';
}

export function memoryTimelineEntries(
  steps: readonly SimulationStep<MemoryStepData>[],
): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function memoryLogEntries(
  steps: readonly SimulationStep<MemoryStepData>[],
): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

export function memoryMetricItems(data: MemoryStepData): MetricItem[] {
  const items: MetricItem[] = [
    {
      id: 'total',
      label: 'Total memory',
      value: `${data.totalSize}`,
      hint: 'units of physical memory',
    },
    {
      id: 'allocated',
      label: 'Allocated',
      value: `${data.allocatedBytes}`,
      hint: `${formatPercent(data.allocatedBytes / Math.max(1, data.totalSize), 0)} of memory`,
      tone: 'default',
    },
    {
      id: 'free',
      label: 'Free',
      value: `${data.freeBytes}`,
      hint: `${data.freeBlocks} free block${data.freeBlocks === 1 ? '' : 's'}`,
    },
  ];

  if (data.mode === 'fixed') {
    items.push({
      id: 'internal',
      label: 'Internal fragmentation',
      value: `${data.internalFragmentation}`,
      hint: 'reserved inside partitions but unused',
      tone: data.internalFragmentation > 0 ? 'warning' : 'default',
    });
  } else {
    items.push({
      id: 'external',
      label: 'External fragmentation',
      value: `${data.externalFragmentation}`,
      hint: `free not in the largest hole (${data.largestFreeBlock})`,
      tone: data.externalFragmentation > 0 ? 'warning' : 'default',
    });
  }

  items.push({
    id: 'freeBlocks',
    label: 'Free blocks',
    value: `${data.freeBlocks}`,
    hint: data.mode === 'variable' ? 'contiguous holes' : 'free partitions',
  });

  if (data.failures > 0) {
    items.push({
      id: 'failures',
      label: 'Failed requests',
      value: `${data.failures}`,
      hint: 'requests that could not be satisfied',
      tone: 'warning',
    });
  }

  return items;
}

/** Percentage width of a block inside the map. */
export function blockPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

export function formatUnits(value: number): string {
  return formatNumber(value, 0);
}
