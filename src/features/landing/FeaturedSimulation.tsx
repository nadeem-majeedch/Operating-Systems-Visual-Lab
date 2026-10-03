import { Badge, ButtonLink, Card, SectionHeading } from '@/components';
import { getAlgorithms, getLab, getTopic } from '@/content';
import { DIFFICULTY_LABELS, ROUTES, formatDuration, hrefFor } from '@/utils';

/** The lab highlighted on the home page — the reference implementation. */
const FEATURED_LAB_ID = 'lab-fcfs';

const GANTT_PREVIEW: readonly { readonly grow: number; readonly color: string; readonly label: string }[] = [
  { grow: 3, color: '#6366f1', label: 'P1' },
  { grow: 2, color: '#22d3ee', label: 'P2' },
  { grow: 4, color: '#34d399', label: 'P3' },
  { grow: 3, color: '#f59e0b', label: 'P4' },
];

/** A single lab promoted to the home page as an easy first win. */
export function FeaturedSimulation() {
  const lab = getLab(FEATURED_LAB_ID);
  if (!lab) return null;

  const topic = getTopic(lab.topicId);
  const algorithms = getAlgorithms(lab.algorithmIds);

  return (
    <section className="section" aria-labelledby="featured-heading">
      <SectionHeading
        id="featured-heading"
        eyebrow="Featured simulation"
        title="Start with a scheduler"
        description="The first lab most learners open: build a Gantt chart by hand, then measure the numbers the theory predicts."
      />

      <Card className="featured" accent={topic?.accent}>
        <div className="featured__body">
          <div className="featured__header">
            <h3 className="featured__title">{lab.title}</h3>
            <Badge tone="success">{DIFFICULTY_LABELS[lab.difficulty]}</Badge>
          </div>

          <p className="featured__summary">{lab.summary}</p>

          <ul className="featured__list">
            {lab.objectives.slice(0, 3).map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>

          <div className="featured__meta">
            {algorithms.length > 0 ? (
              <span className="featured__algorithms">
                {algorithms.map((algorithm) => algorithm.abbreviation ?? algorithm.name).join(' · ')}
              </span>
            ) : null}
            <span className="featured__minutes">≈ {formatDuration(lab.estimatedMinutes * 60)}</span>
          </div>

          <div className="featured__actions">
            <ButtonLink variant="primary" href={hrefFor(ROUTES.lab(lab.id))}>
              Launch the simulator
            </ButtonLink>
            {topic ? (
              <ButtonLink variant="ghost" href={hrefFor(ROUTES.topic(topic.id))}>
                Open {topic.title}
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="featured__visual" aria-hidden="true">
          <div className="featured__gantt">
            {GANTT_PREVIEW.map((bar, index) => (
              <span
                key={`${bar.label}-${index}`}
                className="featured__gantt-bar"
                style={{ flexGrow: bar.grow, backgroundColor: bar.color }}
              >
                {bar.label}
              </span>
            ))}
          </div>
          <ul className="featured__measures">
            <li>Turnaround</li>
            <li>Waiting</li>
            <li>Response</li>
            <li>Utilisation</li>
          </ul>
        </div>
      </Card>
    </section>
  );
}
