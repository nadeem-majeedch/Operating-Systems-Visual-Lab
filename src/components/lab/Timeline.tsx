import { useEffect, useRef } from 'react';
import { cn } from '@/utils';

export interface TimelineEntry {
  readonly id: string;
  readonly label: string;
  readonly clock: number;
}

export interface TimelineProps {
  readonly entries: readonly TimelineEntry[];
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/**
 * Horizontal rail of every step in the run. Steps already executed are marked,
 * the current step is announced with `aria-current="step"`, and clicking any
 * marker jumps straight to it.
 */
export function Timeline({
  entries,
  currentIndex,
  onSelect,
  title = 'Timeline',
  emptyMessage = 'The timeline fills in as the simulation runs.',
  className,
}: TimelineProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [currentIndex, entries.length]);

  return (
    <section className={cn('timeline', className)} aria-label={title}>
      <header className="timeline__header">
        <h4 className="timeline__title">{title}</h4>
        <span className="timeline__meta">
          {entries.length === 0 ? 'no steps yet' : `step ${Math.min(currentIndex, entries.length - 1) + 1} of ${entries.length}`}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="timeline__empty">{emptyMessage}</p>
      ) : (
        <ol className="timeline__track">
          {entries.map((entry, index) => {
            const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending';
            return (
              <li className="timeline__item" key={entry.id}>
                <button
                  type="button"
                  ref={index === currentIndex ? currentRef : null}
                  className={cn('timeline__marker', `timeline__marker--${state}`)}
                  aria-current={index === currentIndex ? 'step' : undefined}
                  onClick={() => onSelect(index)}
                  title={`Step ${index + 1}: ${entry.label} (t = ${entry.clock})`}
                >
                  <span className="timeline__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="timeline__label">{entry.label}</span>
                  <span className="timeline__clock" aria-hidden="true">
                    t={entry.clock}
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
