import type { EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type { SimulationStep } from '@/types';
import type { BankersStepData, DeadlockStepData, RagStepData } from '@/engine';
import { formatNumber } from '@/utils';

export function isBankersData(data: DeadlockStepData): data is BankersStepData {
  return data.kind === 'bankers';
}

export function isRagData(data: DeadlockStepData): data is RagStepData {
  return data.kind === 'rag';
}

export function deadlockTimelineEntries(
  steps: readonly SimulationStep<DeadlockStepData>[],
): TimelineEntry[] {
  return steps.map((step) => ({ id: step.id, label: step.label, clock: step.clock }));
}

export function deadlockLogEntries(
  steps: readonly SimulationStep<DeadlockStepData>[],
): EventLogEntry[] {
  return steps.map((step) => ({
    id: step.id,
    index: step.index,
    label: step.label,
    description: step.description,
    clock: step.clock,
  }));
}

function verdictTone(safe: boolean | null): MetricItem['tone'] {
  if (safe === null) return undefined;
  return safe ? 'positive' : 'warning';
}

/** Metrics for a banker's-algorithm step. */
export function bankersMetricItems(data: BankersStepData): MetricItem[] {
  const items: MetricItem[] = [
    {
      id: 'available',
      label: 'Available',
      value: `[${data.available.join(', ')}]`,
      hint: 'resources currently free',
    },
    {
      id: 'work',
      label: 'Work',
      value: `[${data.work.join(', ')}]`,
      hint: 'resources the safety check can currently use',
    },
    {
      id: 'finished',
      label: 'Finished',
      value: `${data.finished.filter(Boolean).length} / ${data.rows.length}`,
      hint: 'processes shown able to complete',
    },
    {
      id: 'sequence',
      label: 'Safe sequence',
      value: data.safeSequence.length > 0 ? data.safeSequence.join(' → ') : '—',
      hint: 'order in which every process can finish',
    },
  ];
  if (data.safe !== null) {
    items.push({
      id: 'verdict',
      label: 'Verdict',
      value: data.safe ? 'Safe' : 'Unsafe',
      hint: data.safe ? 'a safe sequence exists' : 'no safe sequence — not the same as deadlock',
      tone: verdictTone(data.safe),
    });
  }
  if (data.request) {
    items.push({
      id: 'request',
      label: 'Request',
      value: `${data.request.process} [${data.request.resources.join(', ')}]`,
      hint: data.request.status,
      tone: data.request.status === 'granted' ? 'positive' : 'warning',
    });
  }
  return items;
}

/** Metrics for a resource-allocation-graph step. */
export function ragMetricItems(data: RagStepData): MetricItem[] {
  const items: MetricItem[] = [
    {
      id: 'nodes',
      label: 'Nodes',
      value: `${data.nodes.filter((node) => node.kind === 'process').length}P / ${
        data.nodes.filter((node) => node.kind === 'resource').length
      }R`,
      hint: 'process and resource nodes',
    },
    { id: 'edges', label: 'Edges', value: `${data.edges.length}`, hint: 'allocation + request edges' },
    {
      id: 'waits',
      label: 'Wait edges',
      value: `${data.waitForEdges.length}`,
      hint: 'collapsed process → process edges',
    },
  ];
  if (!data.singleInstance && data.available.length > 0) {
    items.push({
      id: 'available',
      label: 'Free instances',
      value: `[${data.available.join(', ')}]`,
      hint: 'used by the reduction algorithm',
    });
  }
  if (data.deadlocked !== null) {
    items.push({
      id: 'verdict',
      label: 'Verdict',
      value: data.deadlocked ? 'Deadlock' : 'No deadlock',
      hint: data.deadlocked ? 'a circular wait cannot be broken' : 'every process can finish',
      tone: data.deadlocked ? 'warning' : 'positive',
    });
  }
  return items;
}

export function deadlockMetricItems(data: DeadlockStepData): MetricItem[] {
  return isBankersData(data) ? bankersMetricItems(data) : ragMetricItems(data);
}

/** Human-readable vector, e.g. `[3, 3, 2]`. */
export function vectorLabel(vector: readonly number[]): string {
  if (vector.length === 0) return '—';
  return `[${vector.map((value) => formatNumber(value, 0)).join(', ')}]`;
}
