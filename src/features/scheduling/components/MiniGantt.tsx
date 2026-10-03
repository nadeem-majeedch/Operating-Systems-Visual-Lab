import type { GanttSegment } from '@/engine';
import { cn } from '@/utils';

export interface MiniGanttProps {
  readonly timeline: readonly GanttSegment[];
  /** Total span the bars are scaled against. */
  readonly span: number;
  readonly colorFor: (processId: string | null) => string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

/**
 * Absolute-positioned miniature Gantt bar.
 *
 * No axis and no labels: it exists to compare several schedules (or several
 * moments of one schedule) at a glance, where the full SVG chart would be too
 * large to line up.
 */
export function MiniGantt({
  timeline,
  span,
  colorFor,
  ariaLabel,
  className,
}: MiniGanttProps) {
  const safeSpan = Math.max(1, span);
  return (
    <div
      className={cn('mini-gantt', className)}
      role="img"
      aria-label={ariaLabel ?? `Gantt chart with ${timeline.length} blocks`}
    >
      {timeline.map((segment) => {
        const left = (segment.start / safeSpan) * 100;
        const width = ((segment.end - segment.start) / safeSpan) * 100;
        const idle = segment.processId === null;
        return (
          <span
            key={segment.id}
            className={cn('mini-gantt__bar', idle && 'mini-gantt__bar--idle')}
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.5)}%`,
              ...(idle ? {} : { backgroundColor: colorFor(segment.processId) }),
            }}
            title={`${segment.label} ${segment.start}–${segment.end}`}
          />
        );
      })}
    </div>
  );
}
