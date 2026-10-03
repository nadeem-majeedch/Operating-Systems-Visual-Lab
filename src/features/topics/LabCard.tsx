import type { Lab } from '@/types';
import { Badge, Card } from '@/components';
import { getAlgorithms } from '@/content';
import { DIFFICULTY_LABELS, ROUTES, STATUS_LABELS, formatDuration, hrefFor } from '@/utils';

const STATUS_TONE = {
  available: 'success',
  beta: 'warning',
  planned: 'neutral',
} as const;

export interface LabCardProps {
  readonly lab: Lab;
}

/** A single interactive activity inside a topic. */
export function LabCard({ lab }: LabCardProps) {
  const algorithms = getAlgorithms(lab.algorithmIds);
  const isRunnable = lab.status === 'available' || lab.status === 'beta';

  return (
    <Card interactive accent={isRunnable ? '#34d399' : undefined} className="lab-card">
      {isRunnable ? (
        <a className="lab-card__link" href={hrefFor(ROUTES.lab(lab.id))}>
          <span className="sr-only">Open lab: {lab.title}</span>
        </a>
      ) : null}

      <header className="lab-card__header">
        <h3 className="lab-card__title">{lab.title}</h3>
        <Badge tone={STATUS_TONE[lab.status]}>{STATUS_LABELS[lab.status]}</Badge>
      </header>

      <p className="lab-card__summary">{lab.summary}</p>

      <ul className="lab-card__objectives">
        {lab.objectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>

      <footer className="lab-card__meta">
        <Badge tone="neutral">{DIFFICULTY_LABELS[lab.difficulty]}</Badge>
        <span className="lab-card__meta-item">{formatDuration(lab.estimatedMinutes * 60)}</span>
        <span className="lab-card__meta-item">
          {algorithms.map((algorithm) => algorithm.abbreviation ?? algorithm.name).join(' · ')}
        </span>
      </footer>
    </Card>
  );
}
