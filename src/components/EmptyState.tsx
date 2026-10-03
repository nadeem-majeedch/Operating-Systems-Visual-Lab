import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
  /**
   * Render the title as a heading instead of a paragraph.
   *
   * Use `1` when the empty state *is* the page (so the document still has an
   * `h1`); leave it undefined inside a page that already has one.
   */
  readonly headingLevel?: 1 | 2 | 3;
}

/** Placeholder shown when a list, lab or filter has no results. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  headingLevel,
}: EmptyStateProps) {
  const TitleTag = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : headingLevel === 3 ? 'h3' : 'p';

  return (
    <div className={cn('empty-state', className)}>
      {icon ? (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <TitleTag className="empty-state__title">{title}</TitleTag>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
