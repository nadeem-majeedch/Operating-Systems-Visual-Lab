import type { ReactNode } from 'react';
import { cn } from '@/utils';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  readonly className?: string;
  /** Hide the label from assistive technology when it only decorates. */
  readonly decorative?: boolean;
}

/** Compact status label — difficulty, content status, tags. */
export function Badge({ tone = 'neutral', children, className, decorative = false }: BadgeProps) {
  return (
    <span className={cn('badge', `badge--${tone}`, className)} aria-hidden={decorative || undefined}>
      {children}
    </span>
  );
}
