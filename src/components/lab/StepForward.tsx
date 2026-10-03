import { Button } from '../Button';

export interface StepForwardProps {
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly label?: string;
}

/** Advance exactly one simulation step (and leave playback paused). */
export function StepForward({ disabled = false, onClick, label = 'Step forward' }: StepForwardProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title="Advance one step"
    >
      <span aria-hidden="true">▶|</span>
      Next
    </Button>
  );
}
