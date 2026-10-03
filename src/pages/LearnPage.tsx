import { useMemo } from 'react';
import { Breadcrumb, Button, ProgressBar, Stat } from '@/components';
import { LESSONS } from '@/content';
import { useDocumentTitle, useLearningProgress } from '@/hooks';
import { ROUTES, formatDuration, percentComplete, summariseProgress } from '@/utils';
import { LessonCard } from '@/features/learning/LessonCard';

/**
 * The guided-learning index.
 *
 * Shows every lesson with its own progress bar, an overall figure, and the one
 * action that matters for local state: reset learning progress. No account is
 * involved — progress is a single localStorage entry.
 */
export function LearnPage() {
  useDocumentTitle('Guided learning');
  const { progress, resetAll, startedCount } = useLearningProgress();

  const rows = useMemo(
    () =>
      LESSONS.map((lesson) => {
        const stageIds = lesson.stages.map((stage) => stage.kind);
        const summary = summariseProgress(progress, lesson.topicId, stageIds);
        return { lesson, summary };
      }),
    [progress],
  );

  const totalStages = rows.reduce((sum, row) => sum + row.summary.total, 0);
  const doneStages = rows.reduce((sum, row) => sum + row.summary.completed, 0);
  const finishedLessons = rows.filter((row) => row.summary.isComplete).length;
  const totalMinutes = LESSONS.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Home', path: ROUTES.home }, { label: 'Guided learning' }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Learn</p>
        <h1 className="page-header__title">Guided learning</h1>
        <p className="page-header__lead">
          Every learning area as a six-stage lesson: understand the concept, see it in the lab, run an
          experiment, follow a worked walkthrough, take a short graded challenge, then reflect. Work through
          the stages in order — progress is saved in this browser only, and you can reset it at any time.
        </p>
      </header>

      <div className="page-stats">
        <Stat label="Lessons" value={LESSONS.length} />
        <Stat label="Stages" value={totalStages} />
        <Stat label="Started" value={startedCount} hint={`of ${LESSONS.length}`} />
        <Stat label="Completed" value={finishedLessons} />
        <Stat label="Guided time" value={formatDuration(totalMinutes * 60)} />
      </div>

      <section className="learn-progress" aria-labelledby="learn-progress-heading">
        <div className="learn-progress__row">
          <h2 className="panel__title" id="learn-progress-heading">
            Your progress
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={resetAll}
            disabled={doneStages === 0}
            aria-label="Reset all guided learning progress"
          >
            Reset learning progress
          </Button>
        </div>
        <ProgressBar
          value={percentComplete(doneStages, totalStages) / 100}
          label="Overall guided learning progress"
        />
        <p className="learn-progress__note" role="status">
          {doneStages} of {totalStages} stages complete across {startedCount} started lesson
          {startedCount === 1 ? '' : 's'}.
        </p>
      </section>

      <ul className="lesson-grid">
        {rows.map(({ lesson, summary }) => (
          <li key={lesson.topicId}>
            <LessonCard
              lesson={lesson}
              completed={summary.completed}
              total={summary.total}
              percent={summary.percent}
              isComplete={summary.isComplete}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
