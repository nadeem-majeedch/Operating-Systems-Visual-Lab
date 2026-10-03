import type { PagingStepData } from '@/engine';
import { cn } from '@/utils';

export interface TlbViewProps {
  readonly data: PagingStepData;
  readonly capacity: number;
  readonly className?: string;
}

/**
 * The translation lookaside buffer: a small fully-associative cache of recent
 * page → frame translations. The entries are listed in use order and the page
 * currently being translated is emphasised.
 */
export function TlbView({ data, capacity, className }: TlbViewProps) {
  return (
    <section className={cn('paging-tlb', className)} aria-label="Translation lookaside buffer">
      <header className="paging-tlb__header">
        <h4 className="paging-tlb__title">TLB</h4>
        <span className="paging-tlb__meta">
          {data.tlbEntries.length} / {capacity} entries
          {data.tlbOutcome ? ` · last lookup: ${data.tlbOutcome}` : ''}
        </span>
      </header>

      {data.tlbEntries.length === 0 ? (
        <p className="paging-tlb__empty">The TLB is empty — every lookup misses until it fills.</p>
      ) : (
        <ul className="paging-tlb__entries">
          {data.tlbEntries.map((entry) => (
            <li
              key={entry.page}
              className={cn('tlb-entry', entry.page === data.pageNumber && 'is-current')}
            >
              <span className="tlb-entry__cell">
                <span className="tlb-entry__label">page</span>
                <strong>{entry.page}</strong>
              </span>
              <span className="tlb-entry__arrow" aria-hidden="true">
                →
              </span>
              <span className="tlb-entry__cell">
                <span className="tlb-entry__label">frame</span>
                <strong>{entry.frame}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
