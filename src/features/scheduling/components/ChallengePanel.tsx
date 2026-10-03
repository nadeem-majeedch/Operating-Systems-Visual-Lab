import { useMemo, useState } from 'react';
import type { SchedulingChallenge } from '@/engine';
import { buildSchedulingChallenges, priorityOf } from '@/engine';
import { cn } from '@/utils';
import { Button } from '@/components';
import { MiniGantt } from './MiniGantt';

export interface ChallengePanelProps {
  readonly colorFor: (processId: string | null) => string;
  readonly className?: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function WorkloadTable({ challenge }: { readonly challenge: SchedulingChallenge }) {
  return (
    <table className="data-table data-table--compact">
      <caption className="sr-only">Workload the question is about.</caption>
      <thead>
        <tr>
          <th scope="col">Process</th>
          <th scope="col">Arrival</th>
          <th scope="col">Burst</th>
          <th scope="col">Priority</th>
        </tr>
      </thead>
      <tbody>
        {challenge.processes.map((process) => (
          <tr key={process.id}>
            <th scope="row">{process.name}</th>
            <td>{process.arrivalTime}</td>
            <td>{process.burstTime}</td>
            <td>{priorityOf(process)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Challenge mode.
 *
 * Ten deterministic questions are built from the simulation engines on mount, so
 * a question can never disagree with a schedule the learner can run themselves.
 * Each answer is marked immediately and explained; the full set is scored at the
 * end without any invented "best algorithm" judgement.
 */
export function ChallengePanel({ colorFor, className }: ChallengePanelProps) {
  const challenges = useMemo(() => buildSchedulingChallenges(), []);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<readonly (number | null)[]>(() =>
    challenges.map(() => null),
  );
  const [finished, setFinished] = useState(false);

  const challenge = challenges[index];
  if (!challenge) return null;

  const selected = responses[index] ?? null;
  const answered = selected !== null;
  const isCorrect = selected === challenge.correctIndex;
  const score = responses.reduce<number>(
    (total, response, position) =>
      total + (response !== null && response === challenges[position]?.correctIndex ? 1 : 0),
    0,
  );

  const choose = (option: number): void => {
    if (answered) return;
    setResponses((previous) => previous.map((value, position) => (position === index ? option : value)));
  };

  const next = (): void => {
    if (index < challenges.length - 1) setIndex(index + 1);
    else setFinished(true);
  };

  const restart = (): void => {
    setResponses(challenges.map(() => null));
    setIndex(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <section className={cn('challenge-panel', className)} aria-label="Challenge results">
        <header className="challenge-panel__header">
          <h4 className="panel__title">Challenge complete</h4>
          <p className="challenge-panel__score" role="status">
            You answered <strong>{score}</strong> of {challenges.length} correctly.
          </p>
        </header>

        <ol className="challenge-review">
          {challenges.map((item, position) => {
            const response = responses[position] ?? null;
            const right = response === item.correctIndex;
            return (
              <li key={item.id} className={cn('challenge-review__item', right ? 'is-right' : 'is-wrong')}>
                <span className="challenge-review__mark" aria-hidden="true">
                  {right ? '✓' : '✕'}
                </span>
                <div>
                  <p className="challenge-review__title">{item.title}</p>
                  <p className="challenge-review__answer">
                    Correct answer: <strong>{item.options[item.correctIndex]}</strong>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <Button onClick={restart}>Try again</Button>
      </section>
    );
  }

  return (
    <section className={cn('challenge-panel', className)} aria-label="Scheduling challenge">
      <header className="challenge-panel__header">
        <div>
          <h4 className="panel__title">Challenge mode</h4>
          <p className="challenge-panel__lead">
            Questions are generated from the simulation engine — the same schedules you can run above.
          </p>
        </div>
        <p className="challenge-panel__progress">
          Question {index + 1} of {challenges.length} · score {score}
        </p>
      </header>

      <article className="challenge-card">
        <div className="challenge-card__meta">
          <span className="challenge-card__badge">{challenge.algorithmName}</span>
          {challenge.quantum > 0 ? (
            <span className="challenge-card__badge">quantum {challenge.quantum}</span>
          ) : null}
          <span className="challenge-card__topic">{challenge.title}</span>
        </div>

        <WorkloadTable challenge={challenge} />

        {challenge.previewTimeline.length > 0 ? (
          <figure className="challenge-card__preview">
            <figcaption>
              Schedule so far, up to t = {challenge.atClock ?? 0}
            </figcaption>
            <MiniGantt
              timeline={challenge.previewTimeline}
              span={challenge.previewSpan}
              colorFor={colorFor}
              ariaLabel="Partial Gantt chart for this question"
            />
          </figure>
        ) : null}

        <p className="challenge-card__prompt">{challenge.prompt}</p>

        <ul className="challenge-options">
          {challenge.options.map((option, position) => {
            const isChosen = position === selected;
            const isAnswer = position === challenge.correctIndex;
            return (
              <li key={option}>
                <button
                  type="button"
                  className={cn(
                    'challenge-option',
                    answered && isAnswer && 'is-correct',
                    answered && isChosen && !isAnswer && 'is-wrong',
                  )}
                  onClick={() => choose(position)}
                  disabled={answered}
                  aria-pressed={isChosen}
                >
                  <span className="challenge-option__key" aria-hidden="true">
                    {OPTION_LABELS[position] ?? position + 1}
                  </span>
                  <span className="challenge-option__text">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="challenge-feedback" role="status" aria-live="polite">
          {answered ? (
            <>
              <p className={cn('challenge-feedback__verdict', isCorrect ? 'is-right' : 'is-wrong')}>
                {isCorrect
                  ? 'Correct.'
                  : `Not quite — the answer is ${challenge.options[challenge.correctIndex]}.`}
              </p>
              <p className="challenge-feedback__reason">{challenge.explanation}</p>
            </>
          ) : (
            <p className="challenge-feedback__hint">Choose an answer to see the explanation.</p>
          )}
        </div>

        <div className="challenge-card__actions">
          <Button onClick={next} disabled={!answered}>
            {index < challenges.length - 1 ? 'Next question' : 'See results'}
          </Button>
        </div>
      </article>
    </section>
  );
}
