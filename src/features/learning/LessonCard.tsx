import type { GuidedLesson } from '@/types';
import { Badge, ButtonLink, Card, ProgressBar } from '@/components';
import { getTopic } from '@/content';
import { DIFFICULTY_LABELS, ROUTES, hrefFor } from '@/utils';

export interface LessonCardProps {
  readonly lesson: GuidedLesson;
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
  readonly isComplete: boolean;
}

/** One guided-lesson entry on the learning index, with its progress. */
export function LessonCard({ lesson, completed, total, percent, isComplete }: LessonCardProps) {
  const topic = getTopic(lesson.topicId);
  const started = completed > 0;
  const headingId = `lesson-card-${lesson.topicId}`;

  return (
    <Card
      className="lesson-card"
      accent={topic?.accent}
      aria-labelledby={headingId}
    >
      <header className="lesson-card__header">
        <span className="lesson-card__glyph" aria-hidden="true">
          {topic?.glyph ?? '🧭'}
        </span>
        <div>
          <h3 className="lesson-card__title" id={headingId}>
            {lesson.title}
          </h3>
          <p className="lesson-card__subtitle">{lesson.subtitle}</p>
        </div>
        <div className="lesson-card__badges">
          <Badge tone="accent">{DIFFICULTY_LABELS[lesson.difficulty]}</Badge>
          <Badge tone="neutral">{lesson.estimatedMinutes} min</Badge>
          {isComplete ? <Badge tone="success">Completed</Badge> : null}
        </div>
      </header>

      <p className="lesson-card__objectives">
        <strong>{lesson.objectives.length} objectives</strong> · {lesson.keyTerms.length} key terms ·{' '}
        {lesson.stages.length} stages
      </p>

      <ProgressBar
        value={percent / 100}
        label={`${topic?.title ?? lesson.topicId} progress`}
        className="lesson-card__progress"
      />

      <footer className="lesson-card__footer">
        <span className="lesson-card__count">
          {completed} of {total} stages
        </span>
        <ButtonLink
          variant={isComplete ? 'secondary' : 'primary'}
          size="sm"
          href={hrefFor(ROUTES.lesson(lesson.topicId))}
          aria-label={`${started ? 'Continue' : 'Start'} the guided lesson ${lesson.title}`}
        >
          {isComplete ? 'Review lesson' : started ? 'Continue lesson' : 'Start lesson'}
        </ButtonLink>
      </footer>
    </Card>
  );
}
