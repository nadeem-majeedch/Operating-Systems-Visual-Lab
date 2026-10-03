import type { ContentStatus, SimulationStatus } from '@/types';
import type { BadgeTone } from '../Badge';

/** Every state a lab can be in, from "nothing run yet" to "simulator planned". */
export type LabStatus = SimulationStatus | ContentStatus;

export interface StatusPresentation {
  readonly label: string;
  readonly tone: BadgeTone;
  /** Show a live indicator dot (playback in progress). */
  readonly pulsing?: boolean;
}

/** Single source of truth for how each lab state is labelled and coloured. */
export const STATUS_PRESENTATION: Record<LabStatus, StatusPresentation> = {
  idle: { label: 'Ready', tone: 'neutral' },
  running: { label: 'Running', tone: 'info', pulsing: true },
  paused: { label: 'Paused', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  error: { label: 'Invalid input', tone: 'danger' },
  available: { label: 'Available', tone: 'success' },
  beta: { label: 'Beta', tone: 'warning' },
  planned: { label: 'Coming in next module', tone: 'neutral' },
};

/** Human-readable status text, for `aria-label`s and prose. */
export function statusLabel(status: LabStatus): string {
  return STATUS_PRESENTATION[status].label;
}
