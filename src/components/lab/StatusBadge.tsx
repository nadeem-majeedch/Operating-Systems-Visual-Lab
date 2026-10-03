import { cn } from '@/utils';
import { Badge } from '../Badge';
import { STATUS_PRESENTATION, type LabStatus } from './statusPresentation';

export interface StatusBadgeProps {
  readonly status: LabStatus;
  /** Override the default label for this state. */
  readonly label?: string;
  readonly className?: string;
}

/** Consistent status vocabulary across every lab, simulator and card. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <Badge tone={presentation.tone} className={cn('status-badge', className)}>
      {presentation.pulsing ? <span className="status-badge__dot" aria-hidden="true" /> : null}
      {label ?? presentation.label}
    </Badge>
  );
}
