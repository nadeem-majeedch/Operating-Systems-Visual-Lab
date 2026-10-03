import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { PagingEvent, PagingStepData } from '@/engine';
import { formatBinary, formatHex } from '@/engine';

export function pagingTimelineEntries(
  steps: readonly SimulationStep<PagingStepData>[],
): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function pagingLogEntries(
  steps: readonly SimulationStep<PagingStepData>[],
): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

const EVENT_LABELS: Readonly<Record<PagingEvent, string>> = {
  decompose: 'Split the address',
  tlb: 'TLB lookup',
  'page-table': 'Page-table walk',
  fault: 'Page fault',
  address: 'Physical address',
  invalid: 'Invalid address',
};

export function pagingEventLabel(event: PagingEvent): string {
  return EVENT_LABELS[event];
}

/** Human-readable byte count, e.g. `256 bytes`. */
export function byteLabel(value: number): string {
  return `${value} byte${value === 1 ? '' : 's'}`;
}

export function binaryAddress(value: number, bits: number): string {
  return formatBinary(value, bits);
}

export function hexAddress(value: number, bits: number): string {
  return formatHex(value, bits);
}

export function pagingMetricItems(data: PagingStepData): MetricItem[] {
  const lookups = data.tlbHits + data.tlbMisses;
  const hitPercent = Math.round(data.hitRate * 100);
  const items: MetricItem[] = [
    {
      id: 'hitRate',
      label: 'TLB hit rate',
      value: `${hitPercent}%`,
      hint: `${data.tlbHits} of ${lookups} lookup${lookups === 1 ? '' : 's'}`,
      tone: lookups === 0 ? 'default' : hitPercent >= 50 ? 'positive' : 'warning',
    },
    {
      id: 'tlbHits',
      label: 'TLB hits',
      value: `${data.tlbHits}`,
      hint: 'translated without a page-table walk',
    },
    {
      id: 'tlbMisses',
      label: 'TLB misses',
      value: `${data.tlbMisses}`,
      hint: 'the page table had to be consulted',
    },
    {
      id: 'pageTable',
      label: 'Page-table accesses',
      value: `${data.pageTableAccesses}`,
      hint: 'one per TLB miss',
    },
    {
      id: 'pageFaults',
      label: 'Page faults',
      value: `${data.pageFaults}`,
      hint: 'pages loaded in from backing store',
      tone: data.pageFaults > 0 ? 'warning' : 'default',
    },
  ];

  if (data.invalidAddresses > 0) {
    items.push({
      id: 'invalid',
      label: 'Invalid addresses',
      value: `${data.invalidAddresses}`,
      hint: 'rejected before translation',
      tone: 'warning',
    });
  }

  return items;
}
