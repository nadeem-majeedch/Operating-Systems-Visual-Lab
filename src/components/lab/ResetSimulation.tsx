import { Button } from '../Button';

export interface ResetSimulationProps {
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly label?: string;
}

/** Rewind the run to step 0 without touching the inputs. */
export function ResetSimulation({
  disabled = false,
  onClick,
  label = 'Restart run',
}: ResetSimulationProps) {
  return (
    <Button variant="ghost" onClick={onClick} disabled={disabled} aria-label={label}>
      <span aria-hidden="true">⟲</span>
      Restart
    </Button>
  );
}
