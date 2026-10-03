import type { FsStepData } from '@/engine';
import { cn, formatNumber } from '@/utils';
import { formatBytes } from '../fsPresentation';

export interface FragmentationPanelProps {
  readonly data: FsStepData;
  readonly className?: string;
}

/**
 * External fragmentation for the current step.
 *
 * The bar is the whole volume in address order: solid stretches are used blocks
 * and each shaded stretch is one maximal run of adjacent free blocks. The panel
 * then names every free run and reports the number that matters to a contiguous
 * request — the largest run it could actually use.
 */
export function FragmentationPanel({ data, className }: FragmentationPanelProps) {
  // Which free run each block belongs to, so runs can share a shade.
  const runOf = new Array<number>(data.blockCount).fill(-1);
  data.freeRuns.forEach((run, index) => {
    for (let offset = 0; offset < run.length; offset += 1) runOf[run.start + offset] = index;
  });

  const usable = data.largestFreeRun * data.blockSize;
  const freeBytes = data.freeBlocks * data.blockSize;

  return (
    <section className={cn('fs-frag', className)} aria-label="Fragmentation">
      <header className="fs-frag__header">
        <h4 className="fs-frag__title">Fragmentation</h4>
        <span className="fs-frag__meta">
          external fragmentation {formatNumber(data.externalFragmentation * 100, 0)}% ·{' '}
          {data.freeRuns.length} free run{data.freeRuns.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="fs-frag__bar" role="img" aria-label="Free-space run map">
        {data.blocks.map((block) => {
          const run = runOf[block.index] ?? -1;
          return (
            <span
              key={block.index}
              className={cn(
                'fs-frag__segment',
                run >= 0 ? `is-free is-run-${run % 5}` : 'is-used',
                block.active && 'is-active',
              )}
              title={
                run >= 0
                  ? `Block ${block.index} — free (run ${run + 1})`
                  : `Block ${block.index} — ${block.ownerPath ?? 'used'}`
              }
            />
          );
        })}
      </div>

      <dl className="fs-frag__facts">
        <div>
          <dt>Free runs</dt>
          <dd>{data.freeRuns.length}</dd>
        </div>
        <div>
          <dt>Largest run</dt>
          <dd>{data.largestFreeRun} block{data.largestFreeRun === 1 ? '' : 's'}</dd>
        </div>
        <div>
          <dt>Largest usable</dt>
          <dd>{formatBytes(usable)}</dd>
          <dd className="fs-frag__hint">of {formatBytes(freeBytes)} free</dd>
        </div>
        <div>
          <dt>Fragmentation</dt>
          <dd className={cn(data.externalFragmentation >= 0.5 && 'fs-frag__warn')}>
            {formatNumber(data.externalFragmentation * 100, 0)}%
          </dd>
          <dd className="fs-frag__hint">free space a single run cannot reach</dd>
        </div>
      </dl>

      {data.freeRuns.length === 0 ? (
        <p className="fs-frag__empty">No free blocks — the volume is completely full.</p>
      ) : (
        <ul className="fs-frag__runs">
          {data.freeRuns.map((run, index) => (
            <li key={`${run.start}-${run.length}`} className={`fs-run is-run-${index % 5}`}>
              <span className="fs-run__swatch" aria-hidden="true" />
              blocks {run.start}–{run.start + run.length - 1} · {run.length} block
              {run.length === 1 ? '' : 's'} ({formatBytes(run.length * data.blockSize)})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
