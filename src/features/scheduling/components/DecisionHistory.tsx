import { cn } from '@/utils';
import type { DecisionEntry } from '../schedulePresentation';

export interface DecisionHistoryProps {
  readonly entries: readonly DecisionEntry[];
  /** Step currently shown in the simulation; emphasised in the list. */
  readonly currentIndex?: number;
  readonly onSelect?: (index: number) => void;
  readonly title?: string;
  readonly className?: string;
}

/**
 * The full decision trail of a run.
 *
 * Each row is one scheduling decision — a dispatch, a preemption, a completion —
 * with the reason the engine gave for it. Jumping to a row also moves the
 * simulation to that step, so the history doubles as navigation.
 */
export function DecisionHistory({
  entries,
  currentIndex,
  onSelect,
  title = 'Decision history',
  className,
}: DecisionHistoryProps) {
  return (
    <section className={cn('decision-history', className)} aria-label={title}>
      <header className="decision-history__header">
        <h4 className="panel__title">{title}</h4>
        <span className="decision-history__count">
          {entries.length} decision{entries.length === 1 ? '' : 's'}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="decision-history__empty">
          Run the simulation to record the decisions the scheduler made.
        </p>
      ) : (
        <ol className="decision-history__list">
          {entries.map((entry) => {
            const active = entry.index === currentIndex;
            const content = (
              <>
                <span className="decision-history__clock">t = {entry.clock}</span>
                <span className="decision-history__label">{entry.label}</span>
                <span className="decision-history__reason">{entry.reason}</span>
              </>
            );
            return (
              <li key={entry.id} className={cn('decision-history__item', active && 'is-active')}>
                {onSelect ? (
                  <button
                    type="button"
                    className="decision-history__button"
                    onClick={() => onSelect(entry.index)}
                    aria-current={active ? 'step' : undefined}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="decision-history__static">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
