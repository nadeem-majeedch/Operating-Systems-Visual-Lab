import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface StatProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Small caption under the value (units, explanation). */
  readonly hint?: string;
  readonly className?: string;
  /** Highlight the tile as the currently changing quantity. */
  readonly emphasise?: boolean;
}

/** Compact metric tile used beside visualisations. */
export function Stat({ label, value, hint, className, emphasise = false }: StatProps) {
  return (
    <div className={cn('stat', emphasise && 'stat--emphasis', className)}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  );
}
