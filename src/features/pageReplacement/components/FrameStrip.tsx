import type { PageReplacementStepData } from '@/engine';
import { cn } from '@/utils';

export interface FrameStripProps {
  readonly data: PageReplacementStepData;
  readonly className?: string;
}

function slotMeta(data: PageReplacementStepData, referenced: boolean, recency: number, loadedAt: number): string {
  if (data.algorithm === 'clock') return referenced ? 'ref 1' : 'ref 0';
  if (data.algorithm === 'fifo') return loadedAt >= 0 ? `loaded ${loadedAt + 1}` : '—';
  return recency >= 0 ? `used ${recency + 1}` : '—';
}

/**
 * The physical frames, animated as the referenced page loads or replaces a
 * victim. The frame just touched is highlighted; a frame that lost a victim is
 * marked separately, and a replacement explains its victim beneath the strip.
 */
export function FrameStrip({ data, className }: FrameStripProps) {
  const occupied = data.frames.filter((frame) => frame.page !== null).length;
  return (
    <section className={cn('replacement-frames', className)} aria-label="Physical frames">
      <header className="replacement-frames__header">
        <h4 className="replacement-frames__title">Frames</h4>
        <span className="replacement-frames__meta">
          {occupied} / {data.frameCount} occupied
          {data.faulted ? ' · fault' : data.hit ? ' · hit' : ''}
        </span>
      </header>

      <ol className="replacement-frames__list">
        {data.frames.map((frame) => (
          <li
            key={frame.frame}
            className={cn(
              'frame-slot',
              frame.page === null && 'frame-slot--free',
              frame.active && 'is-active',
              frame.victim && 'is-victim',
              frame.hand && 'is-hand',
            )}
          >
            <span className="frame-slot__index">frame {frame.frame}</span>
            <span className="frame-slot__page">
              {frame.page === null ? 'free' : `page ${frame.page}`}
            </span>
            <span className="frame-slot__meta">
              {frame.page === null
                ? '\u00a0'
                : slotMeta(data, frame.referenced, frame.recency, frame.loadedAt)}
            </span>
            {data.algorithm === 'clock' ? (
              <span
                className={cn('frame-slot__bit', frame.referenced && 'is-set')}
                title="Reference bit (second chance)"
                aria-label={frame.referenced ? 'reference bit set' : 'reference bit clear'}
              >
                R
              </span>
            ) : null}
            {frame.hand ? (
              <span className="frame-slot__hand" aria-hidden="true">
                ▲ hand
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {data.event === 'replace' && data.victimPage !== null ? (
        <p className="replacement-frames__reason">
          <strong>Why this victim?</strong> {data.reason}
        </p>
      ) : data.reason ? (
        <p className="replacement-frames__reason">{data.reason}</p>
      ) : null}
    </section>
  );
}
