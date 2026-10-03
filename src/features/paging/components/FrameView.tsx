import type { PagingStepData } from '@/engine';
import { cn } from '@/utils';

export interface FrameViewProps {
  readonly data: PagingStepData;
  readonly className?: string;
}

/**
 * Physical memory as a row of frames. Each frame holds the page currently
 * resident in it, or reads "free". The frame a step just touched is
 * highlighted, and an evicted victim is marked.
 */
export function FrameView({ data, className }: FrameViewProps) {
  return (
    <section className={cn('paging-frames', className)} aria-label="Physical frames">
      <header className="paging-frames__header">
        <h4 className="paging-frames__title">Physical frames</h4>
        <span className="paging-frames__meta">
          {data.frames.filter((frame) => frame.page !== null).length} / {data.frameCount} occupied
        </span>
      </header>

      <ol className="paging-frames__list">
        {data.frames.map((frame) => (
          <li
            key={frame.frame}
            className={cn(
              'frame-cell',
              frame.page === null && 'frame-cell--free',
              frame.frame === data.frameNumber && data.referenceIndex >= 0 && 'is-active',
              frame.frame === data.victimFrame && 'is-victim',
            )}
          >
            <span className="frame-cell__index">frame {frame.frame}</span>
            <span className="frame-cell__page">
              {frame.page === null ? 'free' : `page ${frame.page}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
