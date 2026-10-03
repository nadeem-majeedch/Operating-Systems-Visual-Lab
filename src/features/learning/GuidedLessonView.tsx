import { useMemo, useState } from 'react';
import type { GuidedLesson } from '@/types';
import { Badge, Button, Card, ProgressBar } from '@/components';
import { getTopic } from '@/content';
import { useLearningProgress } from '@/hooks';
import { DIFFICULTY_LABELS, ROUTES, hrefFor, summariseProgress } from '@/utils';
import { LessonStagePanel } from './LessonStagePanel';

export interface GuidedLessonViewProps {
  readonly lesson: GuidedLesson;
}

/**
 * The six-stage guided lesson.
 *
 * A learner works down the stages in order, expanding one at a time. Progress is
 * tracked per stage via the localStorage-backed hook, so the lesson reopens at
 * the first unfinished step. The component is keyed by topic id by its page, so
 * switching lessons resets the open stage without an effect.
 */
export function GuidedLessonView({ lesson }: GuidedLessonViewProps) {
  const { progress, completeStage, reopenStage, resetLesson } = useLearningProgress();
  const stageIds = useMemo(() => lesson.stages.map((stage) => stage.kind), [lesson]);
  const summary = summariseProgress(progress, lesson.topicId, stageIds);
  const [openIndex, setOpenIndex] = useState<number>(summary.nextStageIndex ?? 0);

  const prerequisites = lesson.prerequisites
    .map((id) => getTopic(id))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const digest = stageIds.map((id) => id.toLowerCase());

  function handleComplete(index: number): void {
    const stage = lesson.stages[index];
    if (!stage) return;
    completeStage(lesson.topicId, stage.kind);
    if (index < lesson.stages.length - 1) setOpenIndex(index + 1);
  }

  function handleReopen(stageKind: string): void {
    reopenStage(lesson.topicId, stageKind);
  }

  return (
    <div className="lesson" style={{ ['--topic-accent' as string]: getTopic(lesson.topicId)?.accent }}>
      <header className="page-header page-header--topic">
        <span className="page-header__glyph" aria-hidden="true">
          🧭
        </span>
        <div>
          <p className="page-header__eyebrow">Guided lesson</p>
          <h1 className="page-header__title">{lesson.title}</h1>
          <p className="page-header__lead">{lesson.subtitle}</p>
          <div className="page-header__badges">
            <Badge tone="accent">{DIFFICULTY_LABELS[lesson.difficulty]}</Badge>
            <Badge tone="neutral">{lesson.estimatedMinutes} min</Badge>
            <Badge tone="neutral">{lesson.stages.length} stages</Badge>
            {summary.isComplete ? <Badge tone="success">Completed</Badge> : null}
          </div>
        </div>
      </header>

      <div className="lesson-progress">
        <ProgressBar value={summary.percent / 100} label="Lesson progress" />
        <p className="lesson-progress__note" role="status">
          {summary.completed} of {summary.total} stages done
          {summary.isComplete
            ? ' — nice work.'
            : ` — next up is step ${(summary.nextStageIndex ?? 0) + 1}.`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetLesson(lesson.topicId);
            setOpenIndex(0);
          }}
          disabled={summary.completed === 0}
          aria-label={`Reset progress for ${lesson.title}`}
        >
          Reset this lesson
        </Button>
      </div>

      <div className="lesson-overview">
        <Card className="lesson-panel" aria-labelledby="lesson-objectives-heading">
          <h2 className="panel__title" id="lesson-objectives-heading">
            What you will be able to do
          </h2>
          <ul className="check-list">
            {lesson.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </Card>

        <Card className="lesson-panel" aria-labelledby="lesson-prereq-heading">
          <h2 className="panel__title" id="lesson-prereq-heading">
            Before you start
          </h2>
          {prerequisites.length > 0 ? (
            <ul className="chip-list">
              {prerequisites.map((topic) => (
                <li key={topic.id}>
                  <a className="chip" href={hrefFor(ROUTES.topic(topic.id))}>
                    {topic.glyph} {topic.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel__note">No prerequisites — this is a good place to begin.</p>
          )}
          <p className="panel__note">
            Stages: {digest.join(' → ')}.
          </p>
        </Card>
      </div>

      <ol className="lesson-stages" aria-label="Guided lesson stages">
        {lesson.stages.map((stage, index) => (
          <LessonStagePanel
            key={stage.kind}
            lesson={lesson}
            stage={stage}
            index={index}
            total={lesson.stages.length}
            isOpen={openIndex === index}
            isComplete={summary.completed > 0 && (progress[lesson.topicId] ?? []).includes(stage.kind)}
            onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            onComplete={() => handleComplete(index)}
            onReopen={() => handleReopen(stage.kind)}
          />
        ))}
      </ol>

      <nav className="lesson-nav" aria-label="Stage navigation">
        <Button
          variant="secondary"
          onClick={() => setOpenIndex(Math.max(0, openIndex - 1))}
          disabled={openIndex <= 0}
          aria-label="Previous stage"
        >
          ← Previous stage
        </Button>
        <span className="lesson-nav__status">
          {openIndex >= 0 ? `Viewing stage ${openIndex + 1} of ${lesson.stages.length}` : 'All stages collapsed'}
        </span>
        <Button
          variant="secondary"
          onClick={() => setOpenIndex(Math.min(lesson.stages.length - 1, openIndex + 1))}
          disabled={openIndex >= lesson.stages.length - 1}
          aria-label="Next stage"
        >
          Next stage →
        </Button>
      </nav>
    </div>
  );
}
