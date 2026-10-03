import type { DiskStepData } from '@/engine';
import { cn } from '@/utils';
import { cylinderPercent, diskDirectionLabel } from '../diskPresentation';

export interface DiskTrackProps {
  readonly data: DiskStepData;
  readonly className?: string;
}

interface Marker {
  readonly cylinder: number;
  readonly count: number;
}

function uniqueCylinders(requests: readonly number[]): Marker[] {
  const counts = new Map<number, number>();
  for (const cylinder of requests) counts.set(cylinder, (counts.get(cylinder) ?? 0) + 1);
  return [...counts.entries()]
    .map(([cylinder, count]) => ({ cylinder, count }))
    .sort((a, b) => a.cylinder - b.cylinder);
}

/**
 * The disk drawn as a cylinder axis.
 *
 * Requested cylinders are plotted as ticks — pending ones full, serviced ones
 * faded — and the head marker slides along the axis, trailing a band that shows
 * exactly how far the latest seek travelled.
 */
export function DiskTrack({ data, className }: DiskTrackProps) {
  const pending = new Set(data.pending);
  const markers = uniqueCylinders(data.queue);
  const headLeft = cylinderPercent(data.head, data.diskSize);
  const previousLeft = cylinderPercent(data.previousHead, data.diskSize);
  const bandLeft = Math.min(headLeft, previousLeft);
  const bandWidth = Math.abs(headLeft - previousLeft);
  const moving = data.event !== 'init' && data.movement > 0;

  return (
    <section className={cn('disk-track', className)} aria-label="Cylinder track">
      <header className="disk-track__header">
        <h4 className="disk-track__title">Cylinder track</h4>
        <span className="disk-track__meta">
          head {data.head} · {diskDirectionLabel(data.direction)} · {data.diskSize} cylinders
        </span>
      </header>

      <div className="disk-track__plot">
        <div className="disk-track__axis" aria-hidden="true" />
        <span className="disk-track__end disk-track__end--left">0</span>
        <span className="disk-track__end disk-track__end--right">{data.diskSize - 1}</span>

        {markers.map((marker) => (
          <span
            key={marker.cylinder}
            className={cn('disk-marker', pending.has(marker.cylinder) ? 'is-pending' : 'is-served')}
            style={{ left: `${cylinderPercent(marker.cylinder, data.diskSize)}%` }}
            title={`Cylinder ${marker.cylinder}${marker.count > 1 ? ` ×${marker.count}` : ''} — ${
              pending.has(marker.cylinder) ? 'pending' : 'serviced'
            }`}
          >
            <span className="disk-marker__label">{marker.cylinder}</span>
          </span>
        ))}

        {moving ? (
          <span
            className={cn(
              'disk-track__movement',
              data.event === 'service' ? 'is-service' : 'is-jump',
            )}
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            aria-hidden="true"
          />
        ) : null}

        <span
          className={cn('disk-head', data.event === 'service' && 'is-service')}
          style={{ left: `${headLeft}%` }}
          title={`Read/write head at cylinder ${data.head}`}
        >
          <span className="disk-head__stem" aria-hidden="true" />
          <span className="disk-head__value">{data.head}</span>
        </span>
      </div>

      <div className="disk-track__legend">
        <span>
          <i className="disk-legend__dot is-pending" aria-hidden="true" /> pending (
          {data.pending.length})
        </span>
        <span>
          <i className="disk-legend__dot is-served" aria-hidden="true" /> serviced (
          {data.servicedCount})
        </span>
        <span>{data.movement} cylinders this move</span>
      </div>
    </section>
  );
}
