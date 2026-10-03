import { useState } from 'react';
import type { FsBlockView, FsStepData } from '@/engine';
import { ALLOCATION_LABELS } from '@/engine';
import { cn } from '@/utils';

export interface BlockMapProps {
  readonly data: FsStepData;
  readonly className?: string;
}

const STATE_LABELS: Readonly<Record<FsBlockView['state'], string>> = {
  free: 'free',
  data: 'file data',
  index: 'index block',
};

function stateTone(state: FsBlockView['state']): string {
  return state === 'free' ? 'is-neutral' : state === 'index' ? 'is-warning' : 'is-positive';
}

/**
 * The block device, one clickable tile per block, plus an inspector.
 *
 * Clicking a tile answers the question a learner actually has when they look at
 * a disk: *what is in this block?* The inspector reports the allocation state,
 * the file (and its inode) that owns the block, the block's own index, its
 * position within the file, and — under linked allocation — the next block it
 * points to. Linked allocation prints each block's successor on the tile too, so
 * a non-adjacent chain is visible without clicking.
 */
export function BlockMap({ data, className }: BlockMapProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedBlock = selected === null ? undefined : data.blocks[selected];
  const usedData = data.blocks.filter((block) => block.state === 'data').length;
  const usedIndex = data.blocks.filter((block) => block.state === 'index').length;

  return (
    <section className={cn('fs-blocks', className)} aria-label="Disk blocks">
      <header className="fs-blocks__header">
        <h4 className="fs-blocks__title">Disk blocks</h4>
        <span className="fs-blocks__meta">
          {ALLOCATION_LABELS[data.allocation]} allocation · {data.blockSize} B per block · click a
          block to inspect it
        </span>
      </header>

      <ol className="fs-blocks__grid">
        {data.blocks.map((block) => {
          const isSelected = block.index === selected;
          return (
            <li key={block.index}>
              <button
                type="button"
                className={cn(
                  'fs-block',
                  `is-${block.state}`,
                  block.active && 'is-active',
                  block.next !== null && 'is-chained',
                  isSelected && 'is-selected',
                )}
                aria-pressed={isSelected}
                aria-label={`Block ${block.index}, ${STATE_LABELS[block.state]}${
                  block.ownerPath ? `, ${block.ownerPath}` : ''
                }`}
                onClick={() => setSelected(isSelected ? null : block.index)}
              >
                <span className="fs-block__index">{block.index}</span>
                <span className="fs-block__owner">{block.ownerName ?? '·'}</span>
                {block.state === 'data' && block.fileIndex !== null ? (
                  <span className="fs-block__pos">#{block.fileIndex}</span>
                ) : null}
                {block.state === 'index' ? <span className="fs-block__tag">idx</span> : null}
                {block.next !== null ? <span className="fs-block__next">→{block.next}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="fs-blocks__legend">
        <span>
          <i className="fs-dot is-free" aria-hidden="true" /> free ({data.freeBlocks})
        </span>
        <span>
          <i className="fs-dot is-data" aria-hidden="true" /> data ({usedData})
        </span>
        <span>
          <i className="fs-dot is-index" aria-hidden="true" /> index ({usedIndex})
        </span>
        <span className="fs-blocks__hint">the outlined tiles hold the current file</span>
      </div>

      <div className="fs-inspector" role="region" aria-label="Block inspector" aria-live="polite">
        <span className="fs-inspector__label">Block inspector</span>
        {!selectedBlock ? (
          <p className="fs-inspector__empty">
            Select a block above to see its state, the file and inode that own it, its position in
            the file and the next block it points to.
          </p>
        ) : (
          <dl className="fs-inspector__facts">
            <div>
              <dt>Block index</dt>
              <dd>{selectedBlock.index}</dd>
            </div>
            <div>
              <dt>Allocation state</dt>
              <dd>
                <span className={cn('deadlock-flag', stateTone(selectedBlock.state))}>
                  {STATE_LABELS[selectedBlock.state]}
                </span>
              </dd>
            </div>
            <div>
              <dt>File</dt>
              <dd className="fs-inspector__path">{selectedBlock.ownerPath ?? '—'}</dd>
            </div>
            <div>
              <dt>Inode</dt>
              <dd>{selectedBlock.ownerInode ?? '—'}</dd>
            </div>
            <div>
              <dt>Position in file</dt>
              <dd>{selectedBlock.fileIndex ?? '—'}</dd>
            </div>
            <div>
              <dt>Next block</dt>
              <dd
                className={cn(
                  selectedBlock.ownerInode !== null &&
                    selectedBlock.state === 'data' &&
                    selectedBlock.next !== null &&
                    'fs-inspector__next',
                )}
              >
                {selectedBlock.next ?? '—'}
              </dd>
            </div>
            <div>
              <dt>Pointer to this block</dt>
              <dd className="fs-inspector__hint">{pointerSource(data, selectedBlock)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}

/** Describe how the allocator reaches this block, in the current strategy. */
function pointerSource(data: FsStepData, block: FsBlockView): string {
  if (block.state === 'free') return 'none — the block is on the free list';
  if (data.allocation === 'contiguous') {
    return block.fileIndex === 0 ? 'inode start block' : `inode start + ${block.fileIndex}`;
  }
  if (data.allocation === 'linked') {
    if (block.fileIndex === 0) return 'inode start block';
    const previous = data.blocks.find(
      (candidate) => candidate.ownerInode === block.ownerInode && candidate.next === block.index,
    );
    return previous ? `next pointer in block ${previous.index}` : 'not reachable from the head';
  }
  if (block.state === 'index') return 'inode indirect pointer';
  return block.fileIndex !== null && block.fileIndex < 12
    ? `inode direct pointer ${block.fileIndex}`
    : 'index block pointer';
}
