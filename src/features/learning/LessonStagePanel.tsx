import type { GuidedLesson, LessonStage, LessonStageKind } from '@/types';
import { Badge, Button, ButtonLink, Callout } from '@/components';
import { getLab, getTopic } from '@/content';
import { ROUTES, cn, hrefFor } from '@/utils';
import { ChallengeRunner } from '@/features/challenge';

/** Human label and glyph for each of the six stages. */
const STAGE_META: Readonly<Record<LessonStageKind, { label: string; glyph: string }>> = {
  concept: { label: 'Concept', glyph: '💡' },
  visualization: { label: 'Visualization', glyph: '📊' },
  experiment: { label: 'Interactive experiment', glyph: '🧪' },
  walkthrough: { label: 'Walkthrough', glyph: '🪜' },
  challenge: { label: 'Challenge', glyph: '🎯' },
  reflection: { label: 'Reflection', glyph: '🪞' },
};

export interface LessonStagePanelProps {
  readonly lesson: GuidedLesson;
  readonly stage: LessonStage;
  readonly index: number;
  readonly total: number;
  readonly isOpen: boolean;
  readonly isComplete: boolean;
  readonly onToggle: () => void;
  readonly onComplete: () => void;
  readonly onReopen: () => void;
}

/**
 * One guided-lesson stage.
 *
 * Uses progressive disclosure: the header is a single button that expands the
 * body, so only one stage needs to be read at a time. Everything interactive
 * (the lab link, the graded challenge) is labelled for assistive technology.
 */
export function LessonStagePanel({
  lesson,
  stage,
  index,
  total,
  isOpen,
  isComplete,
  onToggle,
  onComplete,
  onReopen,
}: LessonStagePanelProps) {
  const meta = STAGE_META[stage.kind];
  const headingId = `lesson-stage-${stage.kind}-heading`;
  const panelId = `lesson-stage-${stage.kind}-panel`;

  return (
    <li className={cn('lesson-stage', isComplete && 'is-complete', isOpen && 'is-open')}>
      <h3 className="lesson-stage__heading-wrap">
        <button
          type="button"
          className="lesson-stage__heading"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="lesson-stage__glyph" aria-hidden="true">
            {meta.glyph}
          </span>
          <span className="lesson-stage__text">
            <span className="lesson-stage__step">
              Step {index + 1} of {total} · {meta.label}
            </span>
            <span className="lesson-stage__title" id={headingId}>
              {stage.title}
            </span>
            <span className="lesson-stage__summary">{stage.summary}</span>
          </span>
          <span className="lesson-stage__meta">
            {isComplete ? <Badge tone="success">Done</Badge> : null}
            <span className="lesson-stage__time">{stage.estimatedMinutes} min</span>
            <span className="lesson-stage__chevron" aria-hidden="true">
              {isOpen ? '▾' : '▸'}
            </span>
          </span>
        </button>
      </h3>

      <div className="lesson-stage__body" id={panelId} role="region" aria-labelledby={headingId} hidden={!isOpen}>
        {isOpen ? (
          <>
            <StageBody lesson={lesson} stage={stage} />

            <div className="lesson-stage__actions">
              {isComplete ? (
                <Button variant="ghost" size="sm" onClick={onReopen} aria-label={`Mark “${stage.title}” as not done`}>
                  Mark as not done
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={onComplete} aria-label={`Mark “${stage.title}” as done`}>
                  Mark this stage done
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </li>
  );
}

/** The stage-specific content. Kept in one place so a new stage kind is local. */
function StageBody({ lesson, stage }: { readonly lesson: GuidedLesson; readonly stage: LessonStage }) {
  switch (stage.kind) {
    case 'concept':
      return (
        <div className="lesson-body">
          <p>{stage.intro}</p>
          <ul className="check-list">
            {stage.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <details className="lesson-details">
            <summary>Key terms ({lesson.keyTerms.length})</summary>
            <dl className="lesson-terms">
              {lesson.keyTerms.map((term) => (
                <div className="lesson-terms__row" key={term.term}>
                  <dt>{term.term}</dt>
                  <dd>{term.definition}</dd>
                </div>
              ))}
            </dl>
          </details>

          <details className="lesson-details">
            <summary>Common mistakes to avoid</summary>
            <ul className="lesson-mistakes">
              {lesson.commonMistakes.map((item) => (
                <li key={item.mistake}>
                  <span className="lesson-mistakes__wrong">{item.mistake}</span>{' '}
                  <span className="lesson-mistakes__fix">{item.correction}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      );

    case 'visualization':
    case 'experiment': {
      const lab = getLab(stage.labId);
      const topic = lab ? getTopic(lab.topicId) : undefined;
      return (
        <div className="lesson-body">
          {stage.kind === 'visualization' ? (
            <>
              <p>{stage.note}</p>
              <h4 className="lesson-body__subtitle">Look for</h4>
              <ul className="check-list">
                {stage.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h4 className="lesson-body__subtitle">Set it up</h4>
              <p>{stage.setup}</p>
              <h4 className="lesson-body__subtitle">Then observe</h4>
              <ul className="check-list">
                {stage.observations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {lab ? (
            <Callout tone="tip" title={`Open ${lab.title}`}>
              <p>
                {stage.kind === 'visualization'
                  ? 'Step through the run at a slow speed and connect each step to the idea above.'
                  : 'Run the experiment, then change one setting and predict what happens before you press play.'}
              </p>
              <ButtonLink
                variant="primary"
                size="sm"
                href={hrefFor(ROUTES.lab(lab.id))}
                aria-label={`Open the ${lab.title} lab${topic ? ` in ${topic.title}` : ''}`}
              >
                Open the lab
              </ButtonLink>
            </Callout>
          ) : (
            <Callout tone="warning" title="Lab not found">
              <p>This stage points at a lab that is not in the catalogue.</p>
            </Callout>
          )}
        </div>
      );
    }

    case 'walkthrough':
      return (
        <div className="lesson-body">
          <ol className="lesson-steps">
            {stage.steps.map((step, stepIndex) => (
              <li className="lesson-steps__item" key={step.title}>
                <span className="lesson-steps__index" aria-hidden="true">
                  {stepIndex + 1}
                </span>
                <span>
                  <span className="lesson-steps__title">{step.title}</span>
                  <span className="lesson-steps__detail">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'challenge':
      return (
        <div className="lesson-body">
          <p>{stage.note}</p>
          <ChallengeRunner restrictToBankIds={stage.bankIds} />
        </div>
      );

    case 'reflection':
      return (
        <div className="lesson-body">
          <p>Answer these for yourself — writing them out is where the learning sticks.</p>
          <ol className="lesson-reflection">
            {stage.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ol>
          <label className="field lesson-notes">
            <span className="field__label">Your notes (kept only in this tab)</span>
            <textarea
              className="lesson-notes__input"
              rows={4}
              aria-label="Private reflection notes for this lesson"
              placeholder="Write a sentence or two — nothing is uploaded or saved."
            />
          </label>
        </div>
      );

    default:
      return null;
  }
}
