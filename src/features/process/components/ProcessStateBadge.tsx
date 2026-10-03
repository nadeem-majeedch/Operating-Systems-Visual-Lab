import { Badge } from '@/components';
import type { ProcessState } from '@/engine';
import { STATE_TONE, stateLabel } from '../processPresentation';

export interface ProcessStateBadgeProps {
  readonly state: ProcessState;
}

/** Consistent colour + label for a process state, used by every panel. */
export function ProcessStateBadge({ state }: ProcessStateBadgeProps) {
  return <Badge tone={STATE_TONE[state]}>{stateLabel(state)}</Badge>;
}
