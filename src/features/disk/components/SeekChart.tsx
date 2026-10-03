import type { DiskStepData } from '@/engine';
import type { SimulationStep } from '@/types';
import { cn } from '@/utils';

export interface SeekChartProps {
  readonly steps: readonly SimulationStep<DiskStepData>[];
  readonly currentIndex: number;
  readonly className?: string;
}

const STEP_X = 58;
const PADDING = { left: 42, right: 22, top: 20, bottom: 34 };
const HEIGHT = 260;

/**
 * The service path: head position against service order.
 *
 * Each marker is one head movement. Solid segments service a request; dashed
 * segments are the unserviced overhead — the SCAN edge trip or the circular
 * return — which is exactly what separates the sweep policies.
 */
export function SeekChart({ steps, currentIndex, className }: SeekChartProps) {
  const first = steps[0];
  if (!first) return null;

  const diskSize = first.data.diskSize;
  const span = Math.max(1, diskSize - 1);
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const width = PADDING.left + PADDING.right + Math.max(1, steps.length - 1) * STEP_X;

  const x = (index: number): number => PADDING.left + index * STEP_X;
  const y = (cylinder: number): number => PADDING.top + (1 - cylinder / span) * innerHeight;

  const gridValues = [0, Math.round(span / 2), span];
  const labelStep = steps.length > 16 ? 2 : 1;

  return (
    <section className={cn('seek-chart', className)} aria-label="Head movement path">
      <header className="seek-chart__header">
        <h4 className="seek-chart__title">Service path</h4>
        <span className="seek-chart__meta">
          head position over {steps.length - 1} movement{steps.length - 1 === 1 ? '' : 's'}
        </span>
      </header>

      <div className="seek-chart__scroll">
        <svg
          className="seek-chart__svg"
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Disk head path across ${steps.length} steps`}
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                y1={y(value)}
                x2={width - PADDING.right}
                y2={y(value)}
                className="seek-chart__grid"
              />
              <text x={PADDING.left - 8} y={y(value) + 4} className="seek-chart__axis-label" textAnchor="end">
                {value}
              </text>
            </g>
          ))}

          {steps.slice(1).map((step, offset) => {
            const index = offset + 1;
            const previous = steps[index - 1]!;
            const isJump = step.data.event === 'turn' || step.data.event === 'wrap';
            return (
              <line
                key={`seg-${step.id}`}
                x1={x(index - 1)}
                y1={y(previous.data.head)}
                x2={x(index)}
                y2={y(step.data.head)}
                className={cn('seek-chart__segment', isJump ? 'is-jump' : 'is-service')}
              />
            );
          })}

          {steps.map((step, index) => {
            const isJump = step.data.event === 'turn' || step.data.event === 'wrap';
            return (
              <g key={`pt-${step.id}`}>
                <circle
                  cx={x(index)}
                  cy={y(step.data.head)}
                  r={index === currentIndex ? 6 : 4}
                  className={cn(
                    'seek-chart__point',
                    step.data.event === 'init' && 'is-init',
                    isJump && 'is-jump',
                    index === currentIndex && 'is-current',
                  )}
                />
                {index % labelStep === 0 || index === steps.length - 1 ? (
                  <text x={x(index)} y={y(step.data.head) - 10} className="seek-chart__point-label" textAnchor="middle">
                    {step.data.head}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="seek-chart__legend">
        <span>
          <i className="seek-legend__line is-service" aria-hidden="true" /> service move
        </span>
        <span>
          <i className="seek-legend__line is-jump" aria-hidden="true" /> unserviced turn or return
        </span>
      </div>
    </section>
  );
}
