import type { DiskStepData } from '@/engine';
import { cn } from '@/utils';

export interface RequestQueueProps {
  readonly data: DiskStepData;
  readonly className?: string;
}

/**
 * The request queue in arrival order, one chip per request, marked as it is
 * served. This is the "reference string" of disk scheduling: FIFO, SSTF and the
 * sweep policies all consume this same list in different orders.
 */
export function RequestQueue({ data, className }: RequestQueueProps) {
  // Walk the queue and mark the first N occurrences of each cylinder as served.
  const remaining = new Map<number, number>();
  for (const cylinder of data.pending) remaining.set(cylinder, (remaining.get(cylinder) ?? 0) + 1);

  const chips = data.queue.map((cylinder, index) => {
    const left = remaining.get(cylinder) ?? 0;
    const served = left === 0;
    if (!served) remaining.set(cylinder, left - 1);
    return {
      index,
      cylinder,
      served,
      current: data.event === 'service' && data.servedCylinder === cylinder,
    };
  });

  return (
    <section className={cn('disk-queue', className)} aria-label="Request queue">
      <header className="disk-queue__header">
        <h4 className="disk-queue__title">Request queue</h4>
        <span className="disk-queue__meta">
          {data.requestCount} request{data.requestCount === 1 ? '' : 's'} · arrival order
        </span>
      </header>

      {data.queue.length === 0 ? (
        <p className="disk-queue__empty">No requests queued.</p>
      ) : (
        <ol className="disk-queue__list">
          {chips.map((chip) => (
            <li
              key={`${chip.index}-${chip.cylinder}`}
              className={cn('queue-chip', chip.served ? 'is-served' : 'is-pending', chip.current && 'is-current')}
              title={`Request ${chip.index + 1}: cylinder ${chip.cylinder} — ${chip.served ? 'serviced' : 'pending'}`}
            >
              <span className="queue-chip__value">{chip.cylinder}</span>
              <span className="queue-chip__mark" aria-hidden="true">
                {chip.served ? '✓' : '•'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
