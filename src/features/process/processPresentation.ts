import type { BadgeTone, EventLogEntry, MetricItem, TimelineEntry } from '@/components';
import type {
  ProcessControlBlock,
  ProcessEvent,
  ProcessLifecycleInput,
  ProcessState,
  ProcessSystem,
} from '@/engine';
import { PROCESS_COLORS, PROCESS_STATE_INFO, findProcess, systemMetrics } from '@/engine';

/** Badge tone per process state, shared by every view in this lab. */
export const STATE_TONE: Record<ProcessState, BadgeTone> = {
  new: 'neutral',
  ready: 'info',
  running: 'success',
  waiting: 'warning',
  terminated: 'neutral',
};

/** SVG fill per state; independent of the CSS theme so diagrams stay legible. */
export const STATE_COLOR: Record<ProcessState, string> = {
  new: '#94a3b8',
  ready: '#38bdf8',
  running: '#34d399',
  waiting: '#fbbf24',
  terminated: '#7d88ad',
};

export function stateLabel(state: ProcessState): string {
  return PROCESS_STATE_INFO[state].label;
}

/** Stable colour for a process, keyed by its PID so it never shifts mid-run. */
export function processColor(pid: number): string {
  if (PROCESS_COLORS.length === 0) return '#818cf8';
  return PROCESS_COLORS[(pid - 1) % PROCESS_COLORS.length] ?? '#818cf8';
}

/** Name of a process’s parent, when it has one. */
export function parentName(system: ProcessSystem, process: ProcessControlBlock): string {
  if (process.parentPid === null) return '—';
  return findProcess(system, process.parentPid)?.name ?? `PID ${process.parentPid}`;
}

/** Events rendered as timeline markers. */
export function timelineFromEvents(events: readonly ProcessEvent[]): TimelineEntry[] {
  return events.map((event) => ({ id: event.id, label: event.label, clock: event.clock }));
}

/** Events are already shaped like log entries; this keeps the mapping explicit. */
export function logEntriesFromEvents(events: readonly ProcessEvent[]): EventLogEntry[] {
  return events.map((event) => ({
    id: event.id,
    index: event.index,
    label: event.label,
    description: event.description,
    clock: event.clock,
  }));
}

/** Measurements shown beside the state machine. */
export function processMetricItems(
  system: ProcessSystem,
  events: readonly ProcessEvent[],
): MetricItem[] {
  const metrics = systemMetrics(system);
  const switches = events.filter((event) => event.contextSwitch).length;
  return [
    {
      id: 'clock',
      label: 'Clock',
      value: `t = ${system.clock}`,
      hint: 'logical time units',
    },
    {
      id: 'created',
      label: 'Processes',
      value: metrics.created,
      hint: `${metrics.terminated} terminated`,
    },
    {
      id: 'ready',
      label: 'Ready',
      value: metrics.ready,
      hint: 'in the ready queue',
      ...(metrics.ready > 0 ? { tone: 'default' as const } : {}),
    },
    {
      id: 'running',
      label: 'Running',
      value: metrics.running,
      hint: metrics.running === 0 ? 'CPU idle' : 'on the CPU',
    },
    {
      id: 'waiting',
      label: 'Waiting',
      value: metrics.waiting,
      hint: 'blocked',
      ...(metrics.waiting > 0 ? { tone: 'warning' as const } : {}),
    },
    {
      id: 'switches',
      label: 'Context switches',
      value: metrics.contextSwitches,
      hint: `${switches} handover event${switches === 1 ? '' : 's'}`,
    },
    {
      id: 'cpu',
      label: 'CPU time used',
      value: metrics.cpuTime,
      hint: 'sum across processes',
    },
    {
      id: 'waited',
      label: 'Total waiting',
      value: metrics.waitingTime,
      hint: 'ready + blocked time',
    },
  ];
}

/** True when an unknown example input is a usable lifecycle scenario. */
export function isLifecycleInput(value: unknown): value is ProcessLifecycleInput {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { seeds?: unknown };
  return Array.isArray(candidate.seeds);
}
