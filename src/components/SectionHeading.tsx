import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface SectionHeadingProps {
  readonly title: string;
  readonly id: string;
  readonly description?: string;
  /** Right-aligned actions (filters, buttons). */
  readonly actions?: ReactNode;
  readonly eyebrow?: string;
  readonly className?: string;
}

/** Page/section header with a deterministic id used by `aria-labelledby`. */
export function SectionHeading({
  title,
  id,
  description,
  actions,
  eyebrow,
  className,
}: SectionHeadingProps) {
  return (
    <header className={cn('section-heading', className)}>
      <div className="section-heading__text">
        {eyebrow ? <p className="section-heading__eyebrow">{eyebrow}</p> : null}
        <h2 className="section-heading__title" id={id}>
          {title}
        </h2>
        {description ? <p className="section-heading__description">{description}</p> : null}
      </div>
      {actions ? <div className="section-heading__actions">{actions}</div> : null}
    </header>
  );
}
