import type { SimulationStep } from '@/types';
import type { FsStepData } from '@/engine';
import { cn } from '@/utils';

export interface FragmentationChartProps {
  readonly steps: readonly SimulationStep<FsStepData>[];
  readonly currentIndex: number;
  readonly className?: string;
}

const WIDTH = 560;
const HEIGHT = 140;
const PAD_X = 28;
const PAD_Y = 16;

/**
 * External fragmentation as the script runs.
 *
 * The line is fragmentation (0–100%); the dashes underneath mark how many free
 * runs exist at each step. Together they show the shape that matters: deleting
 * scattered files spikes the line upward, and allocating into a hole pulls it
 * back down — the picture of a volume aging.
 */
export function FragmentationChart({ steps, currentIndex, className }: FragmentationChartProps) {
  const points = steps.map((step) => ({
    fragmentation: step.data.externalFragmentation,
    runs: step.data.freeRuns.length,
  }));

  if (points.length === 0) {
    return (
      <section className={cn('fs-frag-chart', className)} aria-label="Fragmentation over time">
        <header className="fs-frag-chart__header">
          <h4 className="fs-frag-chart__title">Fragmentation over time</h4>
        </header>
        <p className="fs-frag-chart__empty">No steps yet.</p>
      </section>
    );
  }

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_Y * 2;
  const maxRuns = Math.max(1, ...points.map((point) => point.runs));
  const x = (index: number): number =>
    points.length === 1 ? PAD_X + plotWidth / 2 : PAD_X + (index / (points.length - 1)) * plotWidth;
  const y = (value: number): number => PAD_Y + (1 - value) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.fragmentation)}`).join(' ');
  const current = points[currentIndex];
  const currentX = x(Math.min(currentIndex, points.length - 1));

  return (
    <section className={cn('fs-frag-chart', className)} aria-label="Fragmentation over time">
      <header className="fs-frag-chart__header">
        <h4 className="fs-frag-chart__title">Fragmentation over time</h4>
        <span className="fs-frag-chart__meta">
          {current ? `${Math.round(current.fragmentation * 100)}% · ${current.runs} free runs` : '—'}
        </span>
      </header>

      <div className="fs-frag-chart__scroll">
        <svg
          className="fs-frag-chart__svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label="External fragmentation across steps"
        >
          {[0, 0.5, 1].map((tick) => (
            <g key={tick}>
              <line
                className="fs-frag-chart__grid"
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="fs-frag-chart__axis" x={4} y={y(tick) + 3}>
                {Math.round(tick * 100)}%
              </text>
            </g>
          ))}

          {/* Free-run count as short dashes along the baseline. */}
          {points.map((point, index) =>
            point.runs === 0 ? null : (
              <rect
                key={`runs-${index}`}
                className={cn('fs-frag-chart__runs', index === currentIndex && 'is-current')}
                x={x(index) - 2}
                y={HEIGHT - PAD_Y - (point.runs / maxRuns) * 14}
                width={4}
                height={(point.runs / maxRuns) * 14}
              />
            ),
          )}

          <polyline className="fs-frag-chart__line" points={line} />

          {points.map((point, index) => (
            <circle
              key={`pt-${index}`}
              className={cn('fs-frag-chart__point', index === currentIndex && 'is-current')}
              cx={x(index)}
              cy={y(point.fragmentation)}
              r={index === currentIndex ? 4 : 2.5}
            />
          ))}

          <line
            className="fs-frag-chart__cursor"
            x1={currentX}
            x2={currentX}
            y1={PAD_Y}
            y2={HEIGHT - PAD_Y}
          />
        </svg>
      </div>

      <div className="fs-frag-chart__legend">
        <span>
          <i className="fs-frag-chart__swatch is-line" aria-hidden="true" /> external fragmentation
        </span>
        <span>
          <i className="fs-frag-chart__swatch is-runs" aria-hidden="true" /> free runs (max {maxRuns})
        </span>
        <span>step {Math.min(currentIndex + 1, points.length)} of {points.length}</span>
      </div>
    </section>
  );
}
