import type { MemoryStepData } from '@/engine';
import { cn } from '@/utils';
import { blockPercent, memoryColorFor } from '../memoryPresentation';

export interface MemoryMapProps {
  readonly data: MemoryStepData;
  readonly title: string;
  readonly className?: string;
}

function eventTone(data: MemoryStepData): string {
  if (data.event === 'failed') return 'is-warning';
  if (data.event === 'allocate') return 'is-positive';
  return 'is-neutral';
}

/**
 * The memory bar.
 *
 * Every block is drawn to scale, left to right in address order. Allocated
 * blocks carry their process colour; free blocks are hatched. In fixed mode the
 * unused tail of an allocated partition is drawn inside the block so internal
 * fragmentation is visible, not just counted.
 */
export function MemoryMap({ data, title, className }: MemoryMapProps) {
  const description = data.blocks
    .map((block) =>
      block.state === 'free'
        ? `free block of ${block.size} at ${block.start}`
        : `${block.process} using ${block.processSize} of ${block.size} at ${block.start}`,
    )
    .join('; ');

  return (
    <section className={cn('memory-map', className)} aria-label={title}>
      <header className="memory-map__header">
        <h4 className="memory-map__title">{title}</h4>
        <div className="memory-map__flags">
          <span className={cn('deadlock-flag', eventTone(data))}>{data.summary}</span>
        </div>
      </header>

      <div className="memory-map__bar" role="img" aria-label={`Memory map: ${description}`}>
        {data.blocks.map((block) => {
          const width = blockPercent(block.size, data.totalSize);
          const wasteWidth =
            data.mode === 'fixed' && block.state === 'allocated'
              ? blockPercent(block.internalWaste, block.size)
              : 0;
          return (
            <div
              key={block.id}
              className={cn(
                'memory-block',
                block.state === 'free' ? 'memory-block--free' : 'memory-block--allocated',
                block.highlighted && 'is-highlighted',
              )}
              style={{
                width: `${width}%`,
                ...(block.state === 'allocated'
                  ? { backgroundColor: memoryColorFor(block.process) }
                  : {}),
              }}
              title={
                block.state === 'free'
                  ? `Free: ${block.size} units at ${block.start}`
                  : `${block.process}: ${block.processSize} units in ${block.size} at ${block.start}`
              }
            >
              <span className="memory-block__label">
                {block.state === 'free' ? 'free' : block.process}
              </span>
              <span className="memory-block__size">
                {block.state === 'free' ? block.size : block.processSize}
              </span>
              {wasteWidth > 0 ? (
                <span
                  className="memory-block__waste"
                  style={{ width: `${wasteWidth}%` }}
                  aria-hidden="true"
                  title={`internal waste ${block.internalWaste}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="memory-map__addresses" aria-hidden="true">
        {data.blocks.map((block) => (
          <span
            className="memory-map__address"
            key={`addr-${block.id}`}
            style={{ width: `${blockPercent(block.size, data.totalSize)}%` }}
          >
            {block.start}
          </span>
        ))}
      </div>

      <div className="memory-map__meta">
        <span>
          {data.resident.length} resident process{data.resident.length === 1 ? '' : 'es'}
          {data.resident.length > 0 ? `: ${data.resident.join(', ')}` : ''}
        </span>
        {data.mode === 'variable' ? (
          <span>largest free block: {data.largestFreeBlock}</span>
        ) : (
          <span>internal waste: {data.internalFragmentation}</span>
        )}
        {data.mode === 'variable' ? <span>next-fit pointer: {data.nextPointer}</span> : null}
      </div>
    </section>
  );
}
