import type { PagingStepData } from '@/engine';
import { cn } from '@/utils';

export interface PageTableViewProps {
  readonly data: PagingStepData;
  readonly className?: string;
}

const MAX_ROWS = 24;

/** Always keep the current page visible, then pad with the low pages. */
function visiblePages(data: PagingStepData): number[] {
  if (data.pageCount <= MAX_ROWS) {
    return Array.from({ length: data.pageCount }, (_, index) => index);
  }
  const pages = new Set<number>([data.pageNumber]);
  data.pageTable.forEach((entry) => {
    if (entry.present) pages.add(entry.page);
  });
  for (let page = 0; pages.size < MAX_ROWS && page < data.pageCount; page += 1) pages.add(page);
  return [...pages].sort((a, b) => a - b).slice(0, MAX_ROWS);
}

/**
 * The page table: one row per page, its frame and its valid bit. The page being
 * translated is emphasised, and present pages are shaded so the resident set is
 * obvious at a glance.
 */
export function PageTableView({ data, className }: PageTableViewProps) {
  const pages = visiblePages(data);
  const truncated = pages.length < data.pageCount;

  return (
    <section className={cn('paging-table', className)} aria-label="Page table">
      <header className="paging-table__header">
        <h4 className="paging-table__title">Page table</h4>
        <span className="paging-table__meta">
          {data.pageCount} page{data.pageCount === 1 ? '' : 's'} · {data.frameCount} frame
          {data.frameCount === 1 ? '' : 's'}
        </span>
      </header>

      <div className="table-wrap">
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Frame</th>
              <th scope="col">Valid</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const entry = data.pageTable[page];
              const present = entry?.present ?? false;
              const isCurrent = page === data.pageNumber && data.referenceIndex >= 0;
              return (
                <tr
                  key={page}
                  className={cn(isCurrent && 'is-current', present && 'is-present')}
                >
                  <th scope="row">
                    {page}
                    {isCurrent ? <span className="paging-table__flag"> ← page</span> : null}
                  </th>
                  <td>{present ? entry?.frame : '—'}</td>
                  <td className={cn(present ? 'is-ok' : 'is-bad')}>{present ? 'yes' : 'no'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="paging-table__meta">Showing {pages.length} of {data.pageCount} pages.</p>
      ) : null}
    </section>
  );
}
