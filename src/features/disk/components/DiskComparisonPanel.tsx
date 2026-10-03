import { useMemo } from 'react';
import { DISK_ALGORITHM_LABELS, compareDiskScheduling, type DiskDirection } from '@/engine';
import { cn, formatNumber } from '@/utils';

export interface DiskComparisonPanelProps {
  readonly diskSize: number;
  readonly head: number;
  readonly requests: readonly number[];
  readonly direction: DiskDirection;
  readonly className?: string;
}

/**
 * Comparison mode: every policy over the same queue, head and direction.
 *
 * Total movement is the headline number, but the service order and the longest
 * single hop matter just as much — SSTF usually wins on distance while the
 * sweep policies win on worst-case latency.
 */
export function DiskComparisonPanel({
  diskSize,
  head,
  requests,
  direction,
  className,
}: DiskComparisonPanelProps) {
  const outcomes = useMemo(
    () => compareDiskScheduling({ diskSize, head, requests, direction }),
    [diskSize, head, requests, direction],
  );

  const best = outcomes.length > 0 ? Math.min(...outcomes.map((outcome) => outcome.totalMovement)) : 0;
  const worst = outcomes.length > 0 ? Math.max(...outcomes.map((outcome) => outcome.totalMovement)) : 1;
  const scale = Math.max(1, worst);

  const bestWorstHop = outcomes.length > 0 ? Math.min(...outcomes.map((outcome) => outcome.worstSeek)) : 0;

  return (
    <section className={cn('disk-compare', className)} aria-label="Policy comparison">
      <header className="disk-compare__header">
        <h4 className="disk-compare__title">Same queue, every policy</h4>
        <span className="disk-compare__meta">
          head {head} · {direction} · {requests.length} request{requests.length === 1 ? '' : 's'}
        </span>
      </header>

      {requests.length === 0 ? (
        <p className="disk-compare__empty">Add requests in Simulate mode to compare policies.</p>
      ) : (
        <div className="data-table__scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Policy</th>
                <th scope="col">Total movement</th>
                <th scope="col">Avg seek</th>
                <th scope="col">Longest hop</th>
                <th scope="col">First served</th>
                <th scope="col">Service order</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome) => (
                <tr key={outcome.algorithm} className={cn(outcome.totalMovement === best && 'is-best')}>
                  <th scope="row">{DISK_ALGORITHM_LABELS[outcome.algorithm]}</th>
                  <td className="disk-compare__movement">
                    <span className="disk-compare__bar" aria-hidden="true">
                      <span
                        className="disk-compare__bar-fill"
                        style={{ width: `${(outcome.totalMovement / scale) * 100}%` }}
                      />
                    </span>
                    <span className="disk-compare__number">
                      {formatNumber(outcome.totalMovement, 0)}
                      {outcome.totalMovement === best ? (
                        <span className="disk-compare__flag">least</span>
                      ) : null}
                    </span>
                  </td>
                  <td>{formatNumber(outcome.averageSeek, 1)}</td>
                  <td className={cn(outcome.worstSeek === bestWorstHop && 'is-best-cell')}>
                    {formatNumber(outcome.worstSeek, 0)}
                  </td>
                  <td>{outcome.firstServed ?? '—'}</td>
                  <td className="disk-compare__order">{outcome.order.join(' → ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="disk-compare__note">
        “Least” marks the smallest total movement; “longest hop” is the worst single seek, and the smallest
        of those is the fairest worst case. SSTF usually wins distance while the sweep policies win latency.
      </p>
    </section>
  );
}
