import { MAX_SPEED, MIN_SPEED } from '@/engine';
import { SPEED_STEPS } from './speedOptions';

export interface SpeedControlProps {
  readonly speed: number;
  readonly onChange: (speed: number) => void;
  readonly disabled?: boolean;
  readonly id?: string;
}

/** Discrete speed selector; a range input keeps it keyboard operable. */
export function SpeedControl({ speed, onChange, disabled = false, id = 'speed-control' }: SpeedControlProps) {
  const index = Math.max(0, SPEED_STEPS.indexOf(speed));

  return (
    <div className="speed-control">
      <label className="speed-control__label" htmlFor={id}>
        Speed
      </label>
      <input
        id={id}
        className="speed-control__range"
        type="range"
        min={0}
        max={SPEED_STEPS.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(event) => {
          const next = SPEED_STEPS[Number(event.target.value)];
          if (next !== undefined) onChange(next);
        }}
        aria-valuetext={`${speed} times speed`}
      />
      <output className="speed-control__value" htmlFor={id}>
        {speed}×
      </output>
      <span className="sr-only">
        Supported range {MIN_SPEED}× to {MAX_SPEED}×
      </span>
    </div>
  );
}
