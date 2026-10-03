import type { Challenge } from '@/types';
import { Badge, ButtonLink, Card, DifficultyMeter, StatusBadge } from '@/components';
import { getLab, getTopic } from '@/content';
import { ROUTES, formatDuration, hrefFor } from '@/utils';
import { getReferenceSolution } from './referenceSolutions';

export interface ChallengeCardProps {
  readonly challenge: Challenge;
  readonly index: number;
}

/** One practice challenge: task, evidence, hints and where to attempt it. */
export function ChallengeCard({ challenge, index }: ChallengeCardProps) {
  const topic = getTopic(challenge.topicId);
  const lab = challenge.labId ? getLab(challenge.labId) : undefined;
  const reference = getReferenceSolution(challenge.id);
  const runnable = lab?.status === 'available' || lab?.status === 'beta';
  const headingId = `challenge-${challenge.id}-title`;

  return (
    <Card className="challenge-card" aria-labelledby={headingId}>
      <header className="challenge-card__header">
        <div className="challenge-card__heading">
          <p className="challenge-card__index">
            Challenge {index}
            {topic ? (
              <>
                {' · '}
                <a href={hrefFor(ROUTES.topic(topic.id))}>{topic.title}</a>
              </>
            ) : null}
          </p>
          <h3 className="challenge-card__title" id={headingId}>
            {challenge.title}
          </h3>
        </div>
        <div className="challenge-card__meta">
          <DifficultyMeter difficulty={challenge.difficulty} />
          <Badge tone="neutral">{formatDuration(challenge.estimatedMinutes * 60)}</Badge>
        </div>
      </header>

      <p className="challenge-card__prompt">{challenge.prompt}</p>
      <p className="challenge-card__scenario">{challenge.scenario}</p>

      <div className="challenge-card__columns">
        <div>
          <h4 className="challenge-card__label">A correct answer must show</h4>
          <ul className="check-list">
            {challenge.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </div>

        <div className="challenge-card__outcome">
          <h4 className="challenge-card__label">Expected outcome</h4>
          <p>{challenge.expectedOutcome}</p>
        </div>
      </div>

      {challenge.hints.length > 0 ? (
        <details className="challenge-card__details">
          <summary>Hints ({challenge.hints.length})</summary>
          <ul>
            {challenge.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {reference ? (
        <details className="challenge-card__details">
          <summary>Reference solution — computed live by the {reference.algorithmLabel} engine</summary>
          <div className="reference-solution">
            <p className="reference-solution__note">{reference.note}</p>
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">
                  Reference solution for challenge {index}: {reference.title}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{reference.algorithmLabel}</th>
                    {reference.columns.map((column) => (
                      <th scope="col" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reference.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.cells.map((cell) => (
                        <td key={cell.label}>{cell.formatted}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}

      <footer className="challenge-card__footer">
        <div className="challenge-card__tags">
          {challenge.tags.map((tag) => (
            <Badge tone="neutral" key={tag}>
              {tag}
            </Badge>
          ))}
        </div>

        {lab ? (
          <div className="challenge-card__lab">
            <span className="challenge-card__lab-name">{lab.title}</span>
            <StatusBadge status={lab.status} />
            <ButtonLink
              size="sm"
              variant={runnable ? 'primary' : 'secondary'}
              href={hrefFor(ROUTES.lab(lab.id))}
            >
              {runnable ? 'Open the lab' : 'View the lab'}
            </ButtonLink>
          </div>
        ) : (
          <span className="challenge-card__lab-name">Answer on paper — no lab attached.</span>
        )}
      </footer>
    </Card>
  );
}
