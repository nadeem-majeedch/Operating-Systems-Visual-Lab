import type { BankersComparison, BankersStepData } from '@/engine';
import { cn } from '@/utils';

export interface BankersBoardProps {
  readonly data: BankersStepData;
  readonly title: string;
  readonly className?: string;
}

function comparisonFor(
  comparisons: readonly BankersComparison[],
  row: number,
  resource: number,
): BankersComparison | undefined {
  return comparisons.find((item) => item.row === row && item.resource === resource);
}

function verdictLabel(data: BankersStepData): string {
  if (data.safe === null) return 'Checking…';
  return data.safe ? 'Safe state' : 'Unsafe state';
}

/**
 * The banker's algorithm stage.
 *
 * It shows the exact matrices the safety check is reasoning about — allocation,
 * maximum and the derived need — with each comparison highlighted, plus the
 * available and work vectors and the growing safe sequence.
 */
export function BankersBoard({ data, title, className }: BankersBoardProps) {
  const verdict = verdictLabel(data);
  const verdictTone = data.safe === null ? 'neutral' : data.safe ? 'is-positive' : 'is-warning';
  const request = data.request;

  return (
    <section className={cn('bankers-board', className)} aria-label={title}>
      <header className="bankers-board__header">
        <h4 className="bankers-board__title">{title}</h4>
        <div className="bankers-board__flags">
          <span className={cn('deadlock-flag', verdictTone)}>{verdict}</span>
          {request ? (
            <span
              className={cn(
                'deadlock-flag',
                request.status === 'granted' ? 'is-positive' : 'is-warning',
              )}
            >
              {request.process} requests [{request.resources.join(', ')}] · {request.status}
            </span>
          ) : null}
        </div>
      </header>

      <div className="table-wrap">
        <table className="data-table data-table--compact matrix-table">
          <caption className="sr-only">
            Allocation, maximum and need matrices with the safety check highlighted.
          </caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Process
              </th>
              <th scope="colgroup" colSpan={data.resources.length}>
                Allocation
              </th>
              <th scope="colgroup" colSpan={data.resources.length}>
                Max
              </th>
              <th scope="colgroup" colSpan={data.resources.length}>
                Need
              </th>
              <th scope="col" rowSpan={2}>
                State
              </th>
            </tr>
            <tr>
              {[...data.resources, ...data.resources, ...data.resources].map((resource, index) => (
                <th scope="col" key={`col-${resource}-${index}`}>
                  {resource}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => {
              const rowClass =
                row.state === 'finished'
                  ? 'is-finished'
                  : row.state === 'blocked'
                    ? 'is-blocked'
                    : data.activeProcess === rowIndex
                      ? 'data-table__row--active'
                      : undefined;
              const cellClass = (resource: number): string | undefined => {
                const comparison = comparisonFor(data.comparisons, rowIndex, resource);
                if (!comparison) return undefined;
                return comparison.ok ? 'is-ok' : 'is-bad';
              };
              const stateLabel = row.finished
                ? 'finished'
                : row.state === 'blocked'
                  ? 'blocked'
                  : row.state === 'checking'
                    ? 'checking'
                    : '—';
              return (
                <tr key={row.name} className={rowClass}>
                  <th scope="row">{row.name}</th>
                  {data.resources.map((resource, column) => (
                    <td key={`a-${resource}`} className={cellClass(column)}>
                      {row.allocation[column] ?? 0}
                    </td>
                  ))}
                  {data.resources.map((resource, column) => (
                    <td key={`m-${resource}`} className={cellClass(column)}>
                      {row.max[column] ?? 0}
                    </td>
                  ))}
                  {data.resources.map((resource, column) => (
                    <td
                      key={`n-${resource}`}
                      className={cn('data-table__cell--need', cellClass(column))}
                    >
                      {row.need[column] ?? 0}
                    </td>
                  ))}
                  <td>{stateLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bankers-board__vectors">
        <div className="vector-chip">
          <span className="vector-chip__label">Available</span>
          <span className="vector-chip__value">[{data.available.join(', ')}]</span>
        </div>
        <div className="vector-chip">
          <span className="vector-chip__label">Work</span>
          <span className="vector-chip__value">[{data.work.join(', ')}]</span>
        </div>
        <div className="vector-chip">
          <span className="vector-chip__label">Safe sequence</span>
          <span className="vector-chip__value">
            {data.safeSequence.length > 0 ? data.safeSequence.join(' → ') : '—'}
          </span>
        </div>
      </div>
    </section>
  );
}
