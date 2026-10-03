import type { EducationalExample } from '@/types';
import { Badge, Card } from '@/components';
import { DIFFICULTY_LABELS } from '@/utils';

export interface ExampleCardProps {
  readonly example: EducationalExample<unknown>;
  readonly index?: number;
}

/** A worked example with progressive disclosure for the discussion questions. */
export function ExampleCard({ example, index = 0 }: ExampleCardProps) {
  const headingId = `example-${example.id}-title`;

  return (
    <Card className="example-card" aria-labelledby={headingId}>
      <header className="example-card__header">
        <h4 className="example-card__title" id={headingId}>
          {index > 0 ? `${index}. ` : ''}
          {example.title}
        </h4>
        <Badge tone="neutral">{DIFFICULTY_LABELS[example.difficulty]}</Badge>
      </header>

      <p className="example-card__scenario">{example.scenario}</p>

      <div className="example-card__outcome">
        <span className="example-card__outcome-label">Expected outcome</span>
        <p>{example.expectedOutcome}</p>
      </div>

      {example.discussion.length > 0 ? (
        <details className="example-card__details">
          <summary>Discussion questions ({example.discussion.length})</summary>
          <ul>
            {example.discussion.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {example.hints.length > 0 ? (
        <details className="example-card__details">
          <summary>Hints</summary>
          <ul>
            {example.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
