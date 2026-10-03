import { Badge, Breadcrumb, ButtonLink, Card, SectionHeading } from '@/components';
import { getAlgorithms, getExamplesForLab, getLesson, getTopic } from '@/content';
import { useDocumentTitle } from '@/hooks';
import { DIFFICULTY_LABELS, ROUTES, STATUS_LABELS, formatDuration, hrefFor } from '@/utils';
import { ExampleCard } from '@/features/examples/ExampleCard';
import { LabCard } from '@/features/topics/LabCard';
import { NotFoundPage } from './NotFoundPage';

const STATUS_TONE = {
  available: 'success',
  beta: 'warning',
  planned: 'neutral',
} as const;

export interface TopicPageProps {
  readonly topicId: string;
}

/** Detail page for one learning area: objectives, labs, algorithms, examples. */
export function TopicPage({ topicId }: TopicPageProps) {
  const topic = getTopic(topicId);
  useDocumentTitle(topic?.title);

  if (!topic) {
    return (
      <NotFoundPage
        title="Learning area not found"
        description={`No learning area matches "${topicId}".`}
      />
    );
  }

  const algorithms = getAlgorithms(topic.labs.flatMap((lab) => lab.algorithmIds));
  const lesson = getLesson(topic.id);
  const prerequisites = topic.prerequisites
    .map((id) => getTopic(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="page" style={{ ['--topic-accent' as string]: topic.accent }}>
      <Breadcrumb
        items={[
          { label: 'Home', path: ROUTES.home },
          { label: 'Learning areas', path: ROUTES.topics },
          { label: topic.title },
        ]}
      />

      <header className="page-header page-header--topic">
        <span className="page-header__glyph" aria-hidden="true">
          {topic.glyph}
        </span>
        <div>
          <p className="page-header__eyebrow">{topic.tagline}</p>
          <h1 className="page-header__title">{topic.title}</h1>
          <p className="page-header__lead">{topic.description}</p>
          <div className="page-header__badges">
            <Badge tone="accent">{DIFFICULTY_LABELS[topic.difficulty]}</Badge>
            <Badge tone="neutral">{formatDuration(topic.estimatedMinutes * 60)}</Badge>
            <Badge tone="neutral">
              {topic.labs.length} lab{topic.labs.length === 1 ? '' : 's'}
            </Badge>
          </div>
          {lesson ? (
            <p className="topic-actions">
              <ButtonLink
                variant="primary"
                size="sm"
                href={hrefFor(ROUTES.lesson(topic.id))}
                aria-label={`Start the guided lesson for ${topic.title}`}
              >
                🧭 Start guided lesson
              </ButtonLink>
            </p>
          ) : null}
        </div>
      </header>

      <div className="topic-columns">
        <Card className="topic-panel" aria-labelledby="objectives-heading">
          <h2 className="panel__title" id="objectives-heading">
            Learning objectives
          </h2>
          <ul className="check-list">
            {topic.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
          {prerequisites.length > 0 ? (
            <>
              <h3 className="panel__subtitle">Prerequisites</h3>
              <ul className="chip-list">
                {prerequisites.map((item) => (
                  <li key={item.id}>
                    <a className="chip" href={`#${ROUTES.topic(item.id)}`}>
                      {item.glyph} {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="panel__note">No prerequisites — a good place to start.</p>
          )}
        </Card>

        <Card className="topic-panel" aria-labelledby="algorithms-heading">
          <h2 className="panel__title" id="algorithms-heading">
            Algorithms covered
          </h2>
          <ul className="algorithm-list">
            {algorithms.map((algorithm) => (
              <li className="algorithm-list__item" key={algorithm.id}>
                <div className="algorithm-list__head">
                  <span className="algorithm-list__name">
                    {algorithm.name}
                    {algorithm.abbreviation ? ` (${algorithm.abbreviation})` : ''}
                  </span>
                  <Badge tone={STATUS_TONE[algorithm.status]}>
                    {STATUS_LABELS[algorithm.status]}
                  </Badge>
                </div>
                <p className="algorithm-list__summary">{algorithm.summary}</p>
                <div className="algorithm-list__props">
                  {algorithm.properties.preemptive === undefined ? null : (
                    <Badge tone="info">
                      {algorithm.properties.preemptive ? 'Preemptive' : 'Non-preemptive'}
                    </Badge>
                  )}
                  {algorithm.properties.optimal === true ? <Badge tone="info">Optimal</Badge> : null}
                  {algorithm.properties.timeComplexity ? (
                    <Badge tone="neutral">Time {algorithm.properties.timeComplexity}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SectionHeading
        title={`Labs in ${topic.title}`}
        id="topic-labs-heading"
        eyebrow="Practice"
        description="Interactive activities, in the recommended order."
      />
      <ul className="lab-grid">
        {topic.labs.map((lab) => (
          <li key={lab.id}>
            <LabCard lab={lab} />
          </li>
        ))}
      </ul>

      <SectionHeading
        title="Worked examples"
        id="topic-examples-heading"
        eyebrow="Practice"
        description="Concrete scenarios with the outcome to look for."
      />
      <div className="example-grid">
        {topic.labs
          .flatMap((lab) => getExamplesForLab(lab.id))
          .map((example, index) => (
            <ExampleCard key={example.id} example={example} index={index + 1} />
          ))}
      </div>
    </div>
  );
}
