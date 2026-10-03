import { Breadcrumb, Stat } from '@/components';
import { ENGINE_CHALLENGES, listChallengeBanks } from '@/engine';
import { ChallengeRunner } from '@/features/challenge';
import { useDocumentTitle } from '@/hooks';
import { ROUTES, formatDuration } from '@/utils';

/**
 * The graded quiz bank.
 *
 * Every question is answered against a value computed by the real simulation
 * engines, so this page is a practice surface for the labs rather than a trivia
 * sheet. Progress is scored per session and only a private “mastered” flag is
 * kept locally.
 */
export function QuizPage() {
  useDocumentTitle('Quiz bank');

  const banks = listChallengeBanks();
  const labs = new Set(ENGINE_CHALLENGES.map((challenge) => challenge.relatedLab));
  const kinds = new Set(ENGINE_CHALLENGES.map((challenge) => challenge.kind));
  const averageSeconds = ENGINE_CHALLENGES.length * 45;

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Home', path: ROUTES.home }, { label: 'Quiz bank' }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Practice</p>
        <h1 className="page-header__title">Graded challenge bank</h1>
        <p className="page-header__lead">
          Multiple-choice, numerical, prediction, sequence and simulation-decision questions across every
          learning area. Each expected answer is computed by the same engine that powers the lab it links to,
          so nothing here can contradict the simulator. Answer, get instant feedback and an explanation,
          retry when it goes wrong, and track your score for the session.
        </p>
      </header>

      <div className="page-stats">
        <Stat label="Questions" value={ENGINE_CHALLENGES.length} />
        <Stat label="Banks" value={banks.length} hint="grouped by idea" />
        <Stat label="Question types" value={kinds.size} />
        <Stat label="Labs covered" value={labs.size} />
        <Stat label="Self-study time" value={formatDuration(averageSeconds)} hint="at ~45s each" />
      </div>

      <ChallengeRunner />
    </div>
  );
}
