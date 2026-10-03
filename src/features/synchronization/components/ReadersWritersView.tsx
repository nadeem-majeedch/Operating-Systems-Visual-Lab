import type { ReadersWritersStepData } from '@/engine';
import { cn } from '@/utils';

export interface ReadersWritersViewProps {
  readonly data: ReadersWritersStepData;
}

/** The shared data and who currently holds it. */
export function ReadersWritersView({ data }: ReadersWritersViewProps) {
  const exclusive = data.writer !== null;
  const shared = !exclusive && data.readers > 0;
  return (
    <section className="rw-view" aria-label="Shared data">
      <div className={cn('rw-view__data', exclusive ? 'is-exclusive' : shared ? 'is-shared' : '')}>
        <span className="rw-view__mode">
          {exclusive ? 'exclusive' : shared ? 'shared' : 'unused'}
        </span>
        <span className="rw-view__holder">
          {exclusive
            ? `${data.writer} is writing`
            : data.readers > 0
              ? `${data.readers} reader${data.readers === 1 ? '' : 's'} reading`
              : 'no one is inside'}
        </span>
      </div>

      <dl className="rw-view__stats">
        <div>
          <dt>readCount</dt>
          <dd>{data.readCount}</dd>
        </div>
        <div>
          <dt>readers inside</dt>
          <dd>{data.readers}</dd>
        </div>
        <div>
          <dt>readers waiting</dt>
          <dd>{data.readersWaiting}</dd>
        </div>
        <div>
          <dt>writers waiting</dt>
          <dd className={cn(data.writersWaiting > 0 && 'is-warning')}>{data.writersWaiting}</dd>
        </div>
      </dl>
    </section>
  );
}
