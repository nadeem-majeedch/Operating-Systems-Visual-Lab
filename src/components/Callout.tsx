import type { ReactNode } from 'react';
import { cn } from '@/utils';

export type CalloutTone = 'info' | 'tip' | 'warning';

export interface CalloutProps {
  readonly tone?: CalloutTone;
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Explanatory box used for teaching notes and warnings. */
export function Callout({ tone = 'info', title, children, className }: CalloutProps) {
  return (
    <aside className={cn('callout', `callout--${tone}`, className)}>
      <p className="callout__title">{title}</p>
      <div className="callout__body">{children}</div>
    </aside>
  );
}
