import type { Topic } from '@/types';
import { Badge, Card } from '@/components';
import { DIFFICULTY_LABELS, ROUTES, cn, formatDuration, hrefFor } from '@/utils';

export interface TopicCardProps {
  readonly topic: Topic;
  /** Show the learning objectives under the description. */
  readonly showObjectives?: boolean;
}

/** One major learning area presented as a clickable card. */
export function TopicCard({ topic, showObjectives = false }: TopicCardProps) {
  const available = topic.labs.filter((lab) => lab.status === 'available').length;

  return (
    <Card
      interactive
      accent={topic.accent}
      className="topic-card"
      aria-labelledby={`topic-${topic.id}-title`}
    >
      <a className="topic-card__link" href={hrefFor(ROUTES.topic(topic.id))}>
        <span className="sr-only">Open the {topic.title} learning area</span>
      </a>

      <header className="topic-card__header">
        <span className="topic-card__glyph" aria-hidden="true">
          {topic.glyph}
        </span>
        <div>
          <h3 className="topic-card__title" id={`topic-${topic.id}-title`}>
            {topic.title}
          </h3>
          <p className="topic-card__tagline">{topic.tagline}</p>
        </div>
      </header>

      <p className="topic-card__description">{topic.description}</p>

      {showObjectives ? (
        <ul className="topic-card__objectives">
          {topic.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      ) : null}

      <footer className="topic-card__meta">
        <Badge tone="neutral">{DIFFICULTY_LABELS[topic.difficulty]}</Badge>
        <Badge tone={available > 0 ? 'success' : 'neutral'}>
          {topic.labs.length} lab{topic.labs.length === 1 ? '' : 's'}
          {available > 0 ? ` · ${available} live` : ''}
        </Badge>
        <span className={cn('topic-card__minutes')}>{formatDuration(topic.estimatedMinutes * 60)}</span>
      </footer>
    </Card>
  );
}
