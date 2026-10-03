import type { GanttSegment } from '@/engine';
import { range } from '@/utils';

export interface GanttChartProps {
  readonly timeline: readonly GanttSegment[];
  /** Total span used for the horizontal scale (time units). */
  readonly span: number;
  readonly colorFor: (processId: string | null) => string;
  /** Process currently running — drawn with an emphasis outline. */
  readonly highlight?: string | null;
  readonly ariaLabel?: string;
}

const UNIT = 46;
const PADDING = { left: 16, right: 16, top: 18, bottom: 34 };
const BAR_HEIGHT = 44;

/**
 * Deterministic SVG Gantt chart.
 *
 * Rendered at natural size inside a horizontally scrollable container so labels
 * stay legible on small screens instead of being scaled into illegibility.
 */
export function GanttChart({
  timeline,
  span,
  colorFor,
  highlight = null,
  ariaLabel = 'Gantt chart of the generated schedule',
}: GanttChartProps) {
  const safeSpan = Math.max(1, span);
  const width = PADDING.left + PADDING.right + safeSpan * UNIT;
  const height = PADDING.top + PADDING.bottom + BAR_HEIGHT;
  const tickStep = safeSpan <= 20 ? 1 : Math.ceil(safeSpan / 12);
  const ticks = range(Math.floor(safeSpan / tickStep) + 1, 0, tickStep);

  return (
    <div className="gantt">
      <svg
        className="gantt__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Axis */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + BAR_HEIGHT}
          x2={PADDING.left + safeSpan * UNIT}
          y2={PADDING.top + BAR_HEIGHT}
          className="gantt__axis"
        />
        {ticks.map((tick) => {
          const x = PADDING.left + tick * UNIT;
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={PADDING.top + BAR_HEIGHT}
                x2={x}
                y2={PADDING.top + BAR_HEIGHT + 6}
                className="gantt__tick"
              />
              <text x={x} y={PADDING.top + BAR_HEIGHT + 22} className="gantt__tick-label">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Segments */}
        {timeline.map((segment) => {
          const x = PADDING.left + segment.start * UNIT;
          const segmentWidth = Math.max(2, (segment.end - segment.start) * UNIT);
          const isIdle = segment.processId === null;
          const isHighlighted = highlight !== null && segment.processId === highlight;
          return (
            <g key={segment.id}>
              <rect
                x={x}
                y={PADDING.top}
                width={segmentWidth}
                height={BAR_HEIGHT}
                rx={6}
                fill={isIdle ? undefined : colorFor(segment.processId)}
                className={[
                  'gantt__bar',
                  isIdle ? 'gantt__bar--idle' : '',
                  isHighlighted ? 'gantt__bar--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <text
                x={x + segmentWidth / 2}
                y={PADDING.top + BAR_HEIGHT / 2 + 5}
                className="gantt__bar-label"
              >
                {isIdle ? 'idle' : segment.label}
              </text>
            </g>
          );
        })}
      </svg>

      {timeline.length === 0 ? (
        <p className="gantt__placeholder">Press play or step forward to build the schedule.</p>
      ) : null}
    </div>
  );
}
