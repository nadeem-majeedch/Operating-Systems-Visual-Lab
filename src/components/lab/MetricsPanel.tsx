import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface MetricItem {
  readonly id: string;
  readonly label: string;
  readonly value: ReactNode;
  /** Units or the derivation behind the number. */
  readonly hint?: string;
  readonly tone?: 'default' | 'positive' | 'warning';
}

export interface MetricsPanelProps {
  readonly metrics: readonly MetricItem[];
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/** Measurement grid shown beside a visualisation, updated at every step. */
export function MetricsPanel({
  metrics,
  title = 'Measurements',
  emptyMessage = 'Metrics appear once the simulation has produced a step.',
  className,
}: MetricsPanelProps) {
  return (
    <section className={cn('metrics-panel', className)} aria-label={title}>
      <h4 className="metrics-panel__title">{title}</h4>
      {metrics.length === 0 ? (
        <p className="metrics-panel__empty">{emptyMessage}</p>
      ) : (
        <dl className="metrics-panel__grid">
          {metrics.map((metric) => (
            <div
              className={cn('metric', metric.tone && metric.tone !== 'default' && `metric--${metric.tone}`)}
              key={metric.id}
            >
              <dt className="metric__label">{metric.label}</dt>
              <dd className="metric__value">{metric.value}</dd>
              {metric.hint ? <dd className="metric__hint">{metric.hint}</dd> : null}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
