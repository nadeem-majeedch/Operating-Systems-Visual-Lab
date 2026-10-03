import { useMemo } from 'react';
import {
  MAX_FRAMES,
  REPLACEMENT_ALGORITHM_LABELS,
  beladyComparison,
  compareReplacement,
} from '@/engine';
import { cn, formatPercent } from '@/utils';

export interface ComparisonPanelProps {
  readonly referenceString: readonly number[];
  readonly frameCount: number;
  readonly className?: string;
}

function anomalyFor(
  points: readonly { frameCount: number; faults: number }[],
  frameCount: number,
): { previous: number; faults: number } | null {
  const index = points.findIndex((point) => point.frameCount === frameCount);
  if (index <= 0) return null;
  const previous = points[index - 1]!;
  const current = points[index]!;
  return current.faults > previous.faults ? { previous: previous.frameCount, faults: current.faults } : null;
}

/**
 * Comparison mode: the same reference string under every policy, plus the
 * fault-count curve as the frame count grows. The curve is where Bélády's
 * anomaly becomes visible — a FIFO cell that is higher than the row above it.
 */
export function ComparisonPanel({ referenceString, frameCount, className }: ComparisonPanelProps) {
  const outcomes = useMemo(
    () => compareReplacement(referenceString, frameCount),
    [referenceString, frameCount],
  );
  const curves = useMemo(() => beladyComparison(referenceString, MAX_FRAMES), [referenceString]);

  const best = outcomes.length > 0 ? Math.min(...outcomes.map((outcome) => outcome.faults)) : 0;
  const frameCounts = curves[0]?.points.map((point) => point.frameCount) ?? [];

  // Frame rows where some policy shows the anomaly, for a call-out.
  const anomalies: { algorithm: string; previous: number; faults: number }[] = [];
  for (const curve of curves) {
    const anomaly = anomalyFor(curve.points, frameCount);
    if (anomaly) anomalies.push({ algorithm: curve.algorithm, previous: anomaly.previous, faults: anomaly.faults });
  }

  return (
    <div className={cn('replacement-compare', className)}>
      <section className="replacement-compare__card" aria-labelledby="replacement-compare-heading">
        <header className="replacement-compare__header">
          <h4 className="replacement-compare__title" id="replacement-compare-heading">
            Same string, every policy
          </h4>
          <span className="replacement-compare__meta">at {frameCount} frames</span>
        </header>

        {referenceString.length === 0 ? (
          <p className="replacement-compare__empty">Add references in Simulate mode to compare policies.</p>
        ) : (
          <div className="data-table__scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Policy</th>
                  <th scope="col">Faults</th>
                  <th scope="col">Hits</th>
                  <th scope="col">Hit ratio</th>
                  <th scope="col">Evictions</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((outcome) => (
                  <tr key={outcome.algorithm} className={cn(outcome.faults === best && 'is-best')}>
                    <th scope="row">{REPLACEMENT_ALGORITHM_LABELS[outcome.algorithm]}</th>
                    <td>
                      {outcome.faults}
                      {outcome.faults === best ? <span className="replacement-compare__flag">best</span> : null}
                    </td>
                    <td>{outcome.hits}</td>
                    <td>{formatPercent(outcome.hitRate, 0)}</td>
                    <td>{outcome.replacements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="replacement-compare__card" aria-labelledby="replacement-belady-heading">
        <header className="replacement-compare__header">
          <h4 className="replacement-compare__title" id="replacement-belady-heading">
            Faults as frames grow
          </h4>
          <span className="replacement-compare__meta">Bélády&rsquo;s anomaly lives here</span>
        </header>

        {referenceString.length === 0 ? (
          <p className="replacement-compare__empty">Nothing to plot yet.</p>
        ) : (
          <>
            <div className="data-table__scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Frames</th>
                    {curves.map((curve) => (
                      <th scope="col" key={curve.algorithm}>
                        {REPLACEMENT_ALGORITHM_LABELS[curve.algorithm]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {frameCounts.map((count, row) => (
                    <tr key={count} className={cn(count === frameCount && 'is-current')}>
                      <th scope="row">{count}</th>
                      {curves.map((curve) => {
                        const point = curve.points[row]!;
                        const previous = row > 0 ? curve.points[row - 1]! : null;
                        const rose = previous !== null && point.faults > previous.faults;
                        return (
                          <td key={curve.algorithm} className={cn(rose && 'is-anomaly')}>
                            {point.faults}
                            {rose ? <span className="replacement-compare__anomaly-mark">↑</span> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="replacement-compare__note">
              {anomalies.some((entry) => entry.algorithm === 'fifo')
                ? 'FIFO faults more with more frames — Bélády’s anomaly. LRU and OPT are stack algorithms and only improve (or stay level).'
                : 'No anomaly at this frame count: every policy here faults fewer (or the same) as frames are added.'}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
