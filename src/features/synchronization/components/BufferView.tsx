import type { ProducerConsumerStepData } from '@/engine';
import { cn } from '@/utils';

export interface BufferViewProps {
  readonly data: ProducerConsumerStepData;
}

/** The buffer slots themselves, oldest item first. */
export function BufferView({ data }: BufferViewProps) {
  return (
    <section className="buffer-view" aria-label="Shared buffer">
      <ol className="buffer-view__slots">
        {data.buffer.map((item, index) => (
          <li key={index} className={cn('buffer-slot', item === null && 'buffer-slot--empty')}>
            <span className="buffer-slot__index" aria-hidden="true">
              {index}
            </span>
            <span className="buffer-slot__item">{item ?? 'free'}</span>
          </li>
        ))}
      </ol>
      <p className="buffer-view__meta">
        capacity {data.capacity} · produced {data.produced} · consumed {data.consumed}
      </p>
    </section>
  );
}
