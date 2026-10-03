import type { SimulationStatus } from '@/types';
import { cn } from '@/utils';
import { PlayPauseControl } from './PlayPauseControl';
import { ResetSimulation } from './ResetSimulation';
import { SpeedControl } from './SpeedControl';
import { StatusBadge } from './StatusBadge';
import { StepBackward } from './StepBackward';
import { StepForward } from './StepForward';

export interface SimulationControlsProps {
  readonly status: SimulationStatus;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly isPlaying: boolean;
  readonly canStepForward: boolean;
  readonly canStepBackward: boolean;
  readonly speed: number;
  /** True when the current input invalidates the run. */
  readonly disabled?: boolean;
  readonly onPlayPause: () => void;
  readonly onStepForward: () => void;
  readonly onStepBackward: () => void;
  readonly onReset: () => void;
  readonly onSpeedChange: (speed: number) => void;
  readonly className?: string;
}

/**
 * Transport bar shared by every simulator: play/pause, single stepping,
 * restart, speed and a status readout. Purely presentational — the lab owns
 * the state it drives.
 */
export function SimulationControls({
  status,
  stepIndex,
  stepCount,
  isPlaying,
  canStepForward,
  canStepBackward,
  speed,
  disabled = false,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  className,
}: SimulationControlsProps) {
  const noSteps = stepCount === 0;
  const shownStep = noSteps ? 0 : Math.min(stepIndex, stepCount - 1) + 1;

  return (
    <div className={cn('sim-controls', className)} role="group" aria-label="Simulation controls">
      <div className="sim-controls__buttons">
        <ResetSimulation onClick={onReset} disabled={disabled || noSteps} />
        <StepBackward onClick={onStepBackward} disabled={disabled || !canStepBackward} />
        <PlayPauseControl isPlaying={isPlaying} onToggle={onPlayPause} disabled={disabled || noSteps} />
        <StepForward onClick={onStepForward} disabled={disabled || !canStepForward} />
      </div>

      <div className="sim-controls__right">
        <SpeedControl speed={speed} onChange={onSpeedChange} disabled={disabled} />
        <div className="sim-controls__status">
          <StatusBadge status={status} />
          <span className="sim-controls__counter" aria-hidden="true">
            {shownStep} / {stepCount}
          </span>
          <span className="sr-only">
            Step {shownStep} of {stepCount}
          </span>
        </div>
      </div>
    </div>
  );
}
