import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface ExplanationFact {
  readonly term: string;
  readonly value: ReactNode;
}

export interface ExplanationPanelProps {
  /** Short headline for the current step, e.g. "P1 preempted". */
  readonly label?: string;
  readonly description?: string;
  /** The teaching note: why this step happened. */
  readonly explanation?: string;
  readonly facts?: readonly ExplanationFact[];
  /** Entities to look at in the visualisation. */
  readonly highlights?: readonly string[];
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * "Why did that just happen?" panel.
 *
 * Every engine step carries its own explanation, so this component only has to
 * present it consistently — no lab-specific prose lives here.
 */
export function ExplanationPanel({
  label,
  description,
  explanation,
  facts = [],
  highlights = [],
  title = 'Explanation',
  emptyMessage = 'Run the simulation to see the reasoning for each step.',
  children,
  className,
}: ExplanationPanelProps) {
  return (
    <section className={cn('explanation-panel', className)} aria-label={title}>
      <h4 className="explanation-panel__title">{title}</h4>

      {label === undefined ? (
        <p className="explanation-panel__empty">{emptyMessage}</p>
      ) : (
        <>
          <p className="explanation-panel__label">{label}</p>
          {description ? <p className="explanation-panel__description">{description}</p> : null}
          {explanation ? <p className="explanation-panel__note">{explanation}</p> : null}

          {highlights.length > 0 ? (
            <p className="explanation-panel__highlights">
              <span className="explanation-panel__highlights-label">Look at</span>
              {highlights.map((item) => (
                <span className="chip chip--static" key={item}>
                  {item}
                </span>
              ))}
            </p>
          ) : null}

          {facts.length > 0 ? (
            <dl className="explanation-panel__facts">
              {facts.map((fact) => (
                <div key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {children}
        </>
      )}
    </section>
  );
}
