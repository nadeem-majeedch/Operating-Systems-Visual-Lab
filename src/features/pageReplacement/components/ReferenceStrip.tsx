import { cn } from '@/utils';
import type { ReferenceOutcome } from '../replacementPresentation';

export interface ReferenceStripProps {
  readonly outcomes: readonly ReferenceOutcome[];
  readonly currentIndex: number;
  readonly className?: string;
}

/**
 * The reference string, one chip per reference, marked as it is served. This is
 * the "every reference" view: each chip is a hit or a fault and the current one
 * is emphasised as the timeline advances.
 */
export function ReferenceStrip({ outcomes, currentIndex, className }: ReferenceStripProps) {
  if (outcomes.length === 0) {
    return (
      <section className={cn('replacement-refs', className)} aria-label="Reference string">
        <header className="replacement-refs__header">
          <h4 className="replacement-refs__title">Reference string</h4>
          <span className="replacement-refs__meta">empty — add references to begin</span>
        </header>
        <p className="replacement-refs__empty">No references yet.</p>
      </section>
    );
  }

  return (
    <section className={cn('replacement-refs', className)} aria-label="Reference string">
      <header className="replacement-refs__header">
        <h4 className="replacement-refs__title">Reference string</h4>
        <span className="replacement-refs__meta">
          {outcomes.length} reference{outcomes.length === 1 ? '' : 's'}
        </span>
      </header>
      <ol className="replacement-refs__list">
        {outcomes.map((outcome) => (
          <li
            key={outcome.index}
            className={cn(
              'ref-chip',
              outcome.hit ? 'is-hit' : 'is-fault',
              outcome.index === currentIndex && 'is-current',
              currentIndex > outcome.index && 'is-past',
            )}
            title={`Reference ${outcome.index + 1}: page ${outcome.page} — ${outcome.hit ? 'hit' : 'page fault'}`}
          >
            <span className="ref-chip__value">{outcome.page}</span>
            <span className="ref-chip__mark" aria-hidden="true">
              {outcome.hit ? '✓' : '✗'}
            </span>
            <span className="ref-chip__sr">
              {outcome.hit ? 'hit' : 'page fault'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
