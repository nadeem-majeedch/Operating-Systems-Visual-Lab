import { Button } from '../Button';

export interface StepBackwardProps {
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly label?: string;
}

/** Rewind exactly one simulation step. */
export function StepBackward({
  disabled = false,
  onClick,
  label = 'Step backward',
}: StepBackwardProps) {
  return (
    <Button onClick={onClick} disabled={disabled} aria-label={label} title="Go back one step">
      <span aria-hidden="true">|◀</span>
      Previous
    </Button>
  );
}
