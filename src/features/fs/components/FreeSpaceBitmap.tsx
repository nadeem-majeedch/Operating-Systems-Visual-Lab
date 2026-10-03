import type { FsStepData } from '@/engine';
import { cn } from '@/utils';

export interface FreeSpaceBitmapProps {
  readonly data: FsStepData;
  readonly className?: string;
}

/**
 * The free-space bitmap.
 *
 * One bit per block: `0` free, `1` used. This is the structure the allocator
 * actually scans, so every create flips bits to 1 and every delete flips them
 * back. Hovering a bit names the block that owns it.
 */
export function FreeSpaceBitmap({ data, className }: FreeSpaceBitmapProps) {
  return (
    <section className={cn('fs-bitmap', className)} aria-label="Free-space bitmap">
      <header className="fs-bitmap__header">
        <h4 className="fs-bitmap__title">Free-space bitmap</h4>
        <span className="fs-bitmap__meta">
          {data.usedBlocks} used · {data.freeBlocks} free
        </span>
      </header>

      <ol className="fs-bitmap__row">
        {data.blocks.map((block) => {
          const free = block.state === 'free';
          return (
            <li
              key={block.index}
              className={cn('fs-bit', free ? 'is-free' : 'is-used', block.active && 'is-active')}
              title={`Block ${block.index}: ${free ? '0 (free)' : `1 (used by ${block.ownerPath ?? '?'})`}`}
            >
              {free ? '0' : '1'}
            </li>
          );
        })}
      </ol>

      <p className="fs-bitmap__note">
        Bit <em>i</em> is 1 when block <em>i</em> is in use. The allocator finds free blocks, and
        contiguous allocation finds free runs, by scanning this row.
      </p>
    </section>
  );
}
