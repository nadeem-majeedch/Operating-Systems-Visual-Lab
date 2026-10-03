import { useMemo, useState } from 'react';
import type { DifficultyLevel } from '@/types';
import { DIFFICULTY_ORDER } from '@/types';
import { Breadcrumb, EmptyState, Stat } from '@/components';
import { CHALLENGES, getRunnableChallenges } from '@/content';
import { useDocumentTitle } from '@/hooks';
import { DIFFICULTY_LABELS, ROUTES, cn, formatDuration } from '@/utils';
import { ChallengeCard } from '@/features/challenges/ChallengeCard';

type DifficultyFilter = DifficultyLevel | 'all';

const DIFFICULTY_FILTERS: readonly DifficultyFilter[] = ['all', ...DIFFICULTY_ORDER];

/** Practice challenges across every learning area, filtered by difficulty. */
export function ChallengesPage() {
  useDocumentTitle('Challenges');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [onlyRunnable, setOnlyRunnable] = useState(false);

  const runnableIds = useMemo(
    () => new Set(getRunnableChallenges().map((challenge) => challenge.id)),
    [],
  );

  const visible = useMemo(
    () =>
      CHALLENGES.filter((challenge) => {
        if (difficulty !== 'all' && challenge.difficulty !== difficulty) return false;
        if (onlyRunnable && !runnableIds.has(challenge.id)) return false;
        return true;
      }),
    [difficulty, onlyRunnable, runnableIds],
  );

  const totalMinutes = CHALLENGES.reduce((total, challenge) => total + challenge.estimatedMinutes, 0);

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Home', path: ROUTES.home }, { label: 'Challenges' }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Practice</p>
        <h1 className="page-header__title">Challenges</h1>
        <p className="page-header__lead">
          Problems to solve with the lab rather than questions to guess at. Each one states the task,
          the evidence a correct answer must contain and where the work can be done — some are
          answered in a simulator, the rest on paper while their engine is built.
        </p>
      </header>

      <div className="page-stats">
        <Stat label="Challenges" value={CHALLENGES.length} />
        <Stat
          label="Runnable now"
          value={runnableIds.size}
          hint="in a live simulator"
        />
        <Stat label="Learning areas" value={new Set(CHALLENGES.map((c) => c.topicId)).size} />
        <Stat label="Practice time" value={formatDuration(totalMinutes * 60)} />
      </div>

      <div className="challenge-filters" role="group" aria-label="Filter challenges">
        <div className="challenge-filters__row">
          <span className="challenge-filters__label" id="difficulty-filter-label">
            Difficulty
          </span>
          <div className="challenge-filters__buttons" aria-labelledby="difficulty-filter-label">
            {DIFFICULTY_FILTERS.map((option) => (
              <button
                type="button"
                key={option}
                className={cn('filter-chip', difficulty === option && 'filter-chip--active')}
                aria-pressed={difficulty === option}
                onClick={() => setDifficulty(option)}
              >
                {option === 'all' ? 'All' : DIFFICULTY_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="challenge-filters__row">
          <span className="challenge-filters__label" id="scope-filter-label">
            Scope
          </span>
          <div className="challenge-filters__buttons" aria-labelledby="scope-filter-label">
            <button
              type="button"
              className={cn('filter-chip', !onlyRunnable && 'filter-chip--active')}
              aria-pressed={!onlyRunnable}
              onClick={() => setOnlyRunnable(false)}
            >
              Everything
            </button>
            <button
              type="button"
              className={cn('filter-chip', onlyRunnable && 'filter-chip--active')}
              aria-pressed={onlyRunnable}
              onClick={() => setOnlyRunnable(true)}
            >
              Runnable in a lab
            </button>
          </div>
        </div>
      </div>

      <p className="challenge-count" role="status">
        Showing {visible.length} of {CHALLENGES.length} challenges
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No challenges match those filters"
          description="Try a different difficulty or include the challenges whose simulators are still being built."
        />
      ) : (
        <ul className="challenge-list">
          {visible.map((challenge, index) => (
            <li key={challenge.id}>
              <ChallengeCard challenge={challenge} index={index + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
