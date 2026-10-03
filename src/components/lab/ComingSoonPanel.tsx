import { cn } from '@/utils';

export interface ComingSoonPanelProps {
  /** What is missing, in the lab's own words. */
  readonly reason: string;
  /** What the learner *can* do here in the meantime. */
  readonly available?: readonly string[];
  /** Where the simulator will live once built. */
  readonly note?: string;
  readonly className?: string;
}

/**
 * Shown instead of a simulator when none exists yet.
 *
 * Deliberately explicit: no fake controls, no stub animation, no numbers that
 * were not computed. It states what is missing and what the learner can still do.
 */
export function ComingSoonPanel({
  reason,
  available = [],
  note = 'Every simulator in this lab follows the same pattern as the working ones: a pure engine emits deterministic steps, and the shell above renders them.',
  className,
}: ComingSoonPanelProps) {
  return (
    <div className={cn('coming-soon', className)} role="status">
      <span className="coming-soon__glyph" aria-hidden="true">
        🚧
      </span>
      <div className="coming-soon__body">
        <p className="coming-soon__title">Coming in next module</p>
        <p className="coming-soon__reason">{reason}</p>
        {available.length > 0 ? (
          <>
            <p className="coming-soon__available-label">Available in this lab today</p>
            <ul className="coming-soon__available">
              {available.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="coming-soon__note">{note}</p>
      </div>
    </div>
  );
}
