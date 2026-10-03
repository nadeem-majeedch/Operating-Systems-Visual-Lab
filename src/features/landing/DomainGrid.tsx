import type { Topic } from '@/types';
import { Badge, ButtonLink, Card, SectionHeading } from '@/components';
import { TOPICS } from '@/content';
import { DIFFICULTY_LABELS, ROUTES, formatDuration, hrefFor } from '@/utils';

export interface DomainGridProps {
  /** Defaults to the full catalogue. */
  readonly topics?: readonly Topic[];
}

/** One learning domain as a self-contained entry point with a Start action. */
function DomainCard({ topic }: { readonly topic: Topic }) {
  const simulations = topic.labs.length;
  const live = topic.labs.filter((lab) => lab.status === 'available' || lab.status === 'beta').length;

  return (
    <Card accent={topic.accent} className="domain-card">
      <header className="domain-card__header">
        <span className="domain-card__glyph" aria-hidden="true">
          {topic.glyph}
        </span>
        <div className="domain-card__heading">
          <h3 className="domain-card__title">{topic.title}</h3>
          <p className="domain-card__tagline">{topic.tagline}</p>
        </div>
      </header>

      <ul className="domain-card__meta">
        <li>
          <Badge tone="neutral">{DIFFICULTY_LABELS[topic.difficulty]}</Badge>
        </li>
        <li className="domain-card__fact">
          {simulations} simulation{simulations === 1 ? '' : 's'}
          {live > 0 && live < simulations ? ` · ${live} live` : ''}
        </li>
        <li className="domain-card__fact">{formatDuration(topic.estimatedMinutes * 60)}</li>
      </ul>

      <div className="domain-card__actions">
        <ButtonLink variant="primary" href={hrefFor(ROUTES.topic(topic.id))} block>
          Start
          <span className="sr-only"> the {topic.title} learning area</span>
        </ButtonLink>
      </div>
    </Card>
  );
}

/** Grid of the eight learning domains, each with a count, difficulty and Start. */
export function DomainGrid({ topics = TOPICS }: DomainGridProps) {
  return (
    <section className="section" aria-labelledby="learning-domains-heading">
      <SectionHeading
        id="learning-domains-heading"
        eyebrow="Curriculum"
        title="Learning domains"
        description="Eight areas of operating systems. Each one pairs a short lesson with runnable simulations you can pause and rewind."
        actions={
          <ButtonLink variant="ghost" href={hrefFor(ROUTES.topics)}>
            Browse all areas
          </ButtonLink>
        }
      />
      <ul className="domain-grid">
        {topics.map((topic) => (
          <li key={topic.id} className="domain-grid__item">
            <DomainCard topic={topic} />
          </li>
        ))}
      </ul>
    </section>
  );
}
