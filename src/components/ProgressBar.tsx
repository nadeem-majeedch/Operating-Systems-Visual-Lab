import { cn } from '@/utils';

export interface ProgressBarProps {
  /** Completion in `[0, 1]`. */
  readonly value: number;
  readonly label: string;
  /** Hide the numeric percentage next to the label. */
  readonly hideValue?: boolean;
  readonly className?: string;
}

/** Thin progress indicator used by the simulation player. */
export function ProgressBar({ value, label, hideValue = false, className }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);

  return (
    <div className={cn('progress', className)}>
      <div className="progress__header">
        <span className="progress__label">{label}</span>
        {hideValue ? null : <span className="progress__value">{percent}%</span>}
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
