import type { DifficultyLevel } from '@/types';
import { DIFFICULTY_ORDER } from '@/types';
import { DIFFICULTY_LABELS, cn } from '@/utils';

export interface DifficultyMeterProps {
  readonly difficulty: DifficultyLevel;
  /** Show the textual label next to the bars. */
  readonly showLabel?: boolean;
  readonly className?: string;
}

/** Three-bar difficulty indicator, shared by labs, cards and challenges. */
export function DifficultyMeter({ difficulty, showLabel = true, className }: DifficultyMeterProps) {
  const level = DIFFICULTY_ORDER.indexOf(difficulty) + 1;
  const label = DIFFICULTY_LABELS[difficulty];

  return (
    <span
      className={cn('difficulty', `difficulty--${difficulty}`, className)}
      role="img"
      aria-label={`Difficulty: ${label}, level ${level} of ${DIFFICULTY_ORDER.length}`}
    >
      <span className="difficulty__bars" aria-hidden="true">
        {DIFFICULTY_ORDER.map((step, index) => (
          <span
            className={cn('difficulty__bar', index < level && 'difficulty__bar--filled')}
            key={step}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="difficulty__label" aria-hidden="true">
          {label}
        </span>
      ) : null}
    </span>
  );
}
