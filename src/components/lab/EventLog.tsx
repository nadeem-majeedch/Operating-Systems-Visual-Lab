import { useEffect, useRef } from 'react';
import { cn } from '@/utils';

export interface EventLogEntry {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly description: string;
  readonly clock: number;
}

export interface EventLogProps {
  readonly entries: readonly EventLogEntry[];
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/**
 * Ordered, scrollable history of the run. Every entry is a button so the log
 * doubles as navigation; the current entry scrolls itself into view.
 */
export function EventLog({
  entries,
  currentIndex,
  onSelect,
  title = 'Event log',
  emptyMessage = 'No events yet.',
  className,
}: EventLogProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentIndex, entries.length]);

  return (
    <section className={cn('event-log', className)} aria-label={title}>
      <header className="event-log__header">
        <h4 className="event-log__title">{title}</h4>
        <span className="event-log__count">{entries.length} events</span>
      </header>

      {entries.length === 0 ? (
        <p className="event-log__empty">{emptyMessage}</p>
      ) : (
        <ol className="event-log__list">
          {entries.map((entry) => {
            const isCurrent = entry.index === currentIndex;
            const isPast = entry.index < currentIndex;
            return (
              <li key={entry.id} className={cn('event-log__item', isPast && 'event-log__item--past')}>
                <button
                  type="button"
                  ref={isCurrent ? currentRef : null}
                  className={cn('event-log__entry', isCurrent && 'event-log__entry--current')}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => onSelect(entry.index)}
                >
                  <span className="event-log__clock" aria-hidden="true">
                    t={entry.clock}
                  </span>
                  <span className="event-log__body">
                    <span className="event-log__label">{entry.label}</span>
                    <span className="event-log__description">{entry.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
