import { useEffect, useMemo, useState } from 'react';
import type { DifficultyLevel } from '@/types';
import { DIFFICULTY_ORDER } from '@/types';
import { Badge, Button, Card, EmptyState, Stat } from '@/components';
import type { ChallengeGrade, ChallengeResponse, EngineChallenge } from '@/engine';
import {
  ENGINE_CHALLENGES,
  challengesForTopic,
  filterChallenges,
  formatAnswer,
  getChallengeBank,
  gradeChallenge,
  listChallengeBanks,
  progressPercent,
  scoreSession,
} from '@/engine';
import { TOPICS, getLab, getTopic } from '@/content';
import { useLocalStorage } from '@/hooks';
import { DIFFICULTY_LABELS, ROUTES, cn, hrefFor } from '@/utils';

type DifficultyFilter = DifficultyLevel | 'all';

/** Which response variant a question expects, derived from its answer kind. */
function responseKindFor(challenge: EngineChallenge): ChallengeResponse['kind'] {
  switch (challenge.expectedAnswer.kind) {
    case 'decision':
      return 'decision';
    case 'number':
      return 'number';
    case 'sequence':
      return 'sequence';
    default:
      return 'choice';
  }
}

/**
 * Deterministic shuffle of the sequence alternatives.
 *
 * Sequence options are authored in answer order, so they must be presented out
 * of order for the question to be meaningful. Seeding by the challenge id keeps
 * the order stable across re-renders without any randomness.
 */
function shuffleSequence(challenge: EngineChallenge): string[] {
  const ids = (challenge.options ?? []).map((option) => option.id);
  let hash = 0;
  for (let index = 0; index < challenge.id.length; index += 1) {
    hash = (hash * 31 + challenge.id.charCodeAt(index)) >>> 0;
  }
  for (let index = ids.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapWith = hash % (index + 1);
    const temporary = ids[index]!;
    ids[index] = ids[swapWith]!;
    ids[swapWith] = temporary;
  }
  return ids;
}

function labelOf(challenge: EngineChallenge, optionId: string): string {
  return challenge.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

const BANK_OPTIONS = listChallengeBanks();

export interface ChallengeRunnerProps {
  /**
   * When set, the session is restricted to these challenge-engine bank ids and
   * the area/bank pickers are hidden. Used by a guided lesson’s challenge stage.
   */
  readonly restrictToBankIds?: readonly string[];
}

/**
 * A self-contained, graded quiz session.
 *
 * Questions are filtered from the whole catalogue, answered one at a time with
 * immediate feedback and an explanation, and scored across the current session.
 * The only thing persisted is a private “mastered” flag per question id — no
 * personal data ever leaves the browser.
 */
export function ChallengeRunner({ restrictToBankIds }: ChallengeRunnerProps = {}) {
  const restricted = (restrictToBankIds?.length ?? 0) > 0;
  const [topicId, setTopicId] = useState<string>('all');
  const [bankId, setBankId] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<ChallengeResponse | null>(null);
  const [grade, setGrade] = useState<ChallengeGrade | null>(null);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [numberText, setNumberText] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);

  const { value: mastered, setValue: setMastered } = useLocalStorage<Record<string, boolean>>(
    'osvl-quiz-mastered',
    {},
  );

  const session = useMemo<readonly EngineChallenge[]>(() => {
    const base = restricted
      ? ENGINE_CHALLENGES.filter((challenge) => restrictToBankIds!.includes(challenge.bank))
      : topicId === 'all'
        ? ENGINE_CHALLENGES
        : challengesForTopic(topicId);
    return filterChallenges(base, {
      bank: restricted || bankId === 'all' ? undefined : bankId,
      difficulty: difficulty === 'all' ? undefined : difficulty,
    });
  }, [restricted, restrictToBankIds, topicId, bankId, difficulty]);

  const current = session[index];
  const finished = session.length > 0 && index >= session.length;

  // Reset the run whenever the question set changes.
  useEffect(() => {
    setIndex(0);
    setResponse(null);
    setGrade(null);
    setNumberText('');
  }, [session]);

  // Reset the answer whenever the current question changes.
  useEffect(() => {
    setResponse(null);
    setGrade(null);
    setNumberText('');
    setSequenceOrder(current ? shuffleSequence(current) : []);
  }, [current]);

  const banks = useMemo(
    () => (topicId === 'all' ? BANK_OPTIONS : BANK_OPTIONS.filter((bank) => bank.topic === topicId)),
    [topicId],
  );

  const score = scoreSession(session, results);
  const progress = progressPercent(session, Math.min(index, session.length));

  function record(challenge: EngineChallenge, result: ChallengeGrade): void {
    setGrade(result);
    setResults((previous) => ({ ...previous, [challenge.id]: result.correct }));
    if (result.correct) setMastered({ ...mastered, [challenge.id]: true });
  }

  function submit(challenge: EngineChallenge, answer: ChallengeResponse): void {
    setResponse(answer);
    record(challenge, gradeChallenge(challenge, answer));
  }

  function chooseOption(challenge: EngineChallenge, optionId: string): void {
    if (grade) return;
    const answer: ChallengeResponse =
      responseKindFor(challenge) === 'decision' ? { kind: 'decision', optionId } : { kind: 'choice', optionId };
    submit(challenge, answer);
  }

  function submitNumber(challenge: EngineChallenge): void {
    const value = Number(numberText);
    if (numberText.trim() === '' || !Number.isFinite(value)) return;
    submit(challenge, { kind: 'number', value });
  }

  function submitSequence(challenge: EngineChallenge): void {
    if (sequenceOrder.length !== (challenge.options ?? []).length) return;
    submit(challenge, { kind: 'sequence', order: sequenceOrder });
  }

  function moveSequence(from: number, direction: -1 | 1): void {
    if (grade) return;
    const to = from + direction;
    if (to < 0 || to >= sequenceOrder.length) return;
    setSequenceOrder((previous) => {
      const next = [...previous];
      const temporary = next[from]!;
      next[from] = next[to]!;
      next[to] = temporary;
      return next;
    });
  }

  function retry(): void {
    setResponse(null);
    setGrade(null);
  }

  function next(): void {
    setIndex((value) => Math.min(value + 1, session.length));
  }

  function restart(): void {
    setIndex(0);
    setResults({});
    setResponse(null);
    setGrade(null);
  }

  return (
    <div className="challenge-panel quiz">
      <div className="challenge-panel__header">
        <div>
          <h2 className="panel__title">Graded challenge bank</h2>
          <p className="challenge-panel__lead">
            Answer computed by the real simulators — every expected value is derived from the engine, so you
            can reproduce it in the matching lab. Feedback is immediate, and each explanation says why.
          </p>
        </div>
        <span className="challenge-panel__progress" role="status">
          {finished ? `Complete · ${score.correct}/${score.total}` : `Question ${Math.min(index + 1, session.length)} of ${session.length}`}
        </span>
      </div>

      <div className="quiz-toolbar" role="group" aria-label="Filter questions">
        {restricted ? (
          <p className="quiz-field quiz-restricted">
            Focused set: {restrictToBankIds!.map((id) => getChallengeBank(id)?.title ?? id).join(', ')}
          </p>
        ) : (
          <>
            <label className="field quiz-field">
              <span className="field__label">Learning area</span>
              <select
                className="data-table__select"
                value={topicId}
                onChange={(event) => {
                  setTopicId(event.target.value);
                  setBankId('all');
                }}
              >
                <option value="all">All areas</option>
                {TOPICS.map((topic) => (
                  <option value={topic.id} key={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field quiz-field">
              <span className="field__label">Bank</span>
              <select className="data-table__select" value={bankId} onChange={(event) => setBankId(event.target.value)}>
                <option value="all">Every bank</option>
                {banks.map((bank) => (
                  <option value={bank.id} key={bank.id}>
                    {bank.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="field quiz-field">
          <span className="field__label">Difficulty</span>
          <select
            className="data-table__select"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
          >
            <option value="all">Any difficulty</option>
            {DIFFICULTY_ORDER.map((level) => (
              <option value={level} key={level}>
                {DIFFICULTY_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="quiz-scorebar">
        <div className="quiz-progress" aria-hidden="true">
          <div className="quiz-progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="challenge-panel__score">
          {score.correct}/{score.total} correct · {score.answered} answered · {score.percent}%
        </span>
        <Button variant="ghost" size="sm" onClick={restart} disabled={score.answered === 0}>
          Reset session
        </Button>
      </div>

      {session.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="No questions match those filters"
          description="Try a different learning area, bank or difficulty."
        />
      ) : finished ? (
        <CompletionPanel session={session} results={results} onRestart={restart} />
      ) : (
        current && (
          <Card className="challenge-card quiz-question">
            <div className="challenge-card__meta quiz-question__meta">
              <Badge tone="neutral">{getTopic(current.topic)?.title ?? current.topic}</Badge>
              <Badge tone="neutral">{DIFFICULTY_LABELS[current.difficulty]}</Badge>
              <span className="challenge-card__topic">{current.bank.replace(/-/g, ' ')}</span>
              <span className="challenge-card__badge">{questionKindLabel(current)}</span>
              {mastered[current.id] ? <Badge tone="success">Mastered earlier</Badge> : null}
            </div>

            <p className="challenge-card__prompt">{current.question}</p>
            <p className="quiz-scenario">{current.scenario}</p>

            {labFor(current) ? (
              <p className="quiz-lab">
                Reproduce this in <a href={hrefFor(ROUTES.lab(labFor(current)!.id))}>{labFor(current)!.title}</a>
              </p>
            ) : null}

            <AnswerArea
              challenge={current}
              response={response}
              grade={grade}
              numberText={numberText}
              sequenceOrder={sequenceOrder}
              onNumberChange={setNumberText}
              onChoose={chooseOption}
              onMove={moveSequence}
            />

            {grade ? (
              <div className="challenge-feedback">
                <p className={cn('challenge-feedback__verdict', grade.correct ? 'is-right' : 'is-wrong')}>
                  {grade.correct ? 'Correct.' : 'Not quite.'}
                </p>
                <p className="challenge-feedback__hint">
                  Expected: {grade.expected}
                  {!grade.correct ? ` · You answered: ${grade.submitted}` : ''}
                </p>
                <p className="challenge-feedback__reason">{current.explanation}</p>
              </div>
            ) : null}

            <div className="quiz-actions">
              {!grade && responseKindFor(current) === 'number' ? (
                <Button variant="primary" onClick={() => submitNumber(current)} disabled={numberText.trim() === ''}>
                  Check answer
                </Button>
              ) : null}
              {!grade && responseKindFor(current) === 'sequence' ? (
                <Button variant="primary" onClick={() => submitSequence(current)}>
                  Check order
                </Button>
              ) : null}
              {grade ? (
                <Button variant="secondary" onClick={retry}>
                  Retry
                </Button>
              ) : null}
              <span className="quiz-actions__spacer" />
              {!grade ? (
                <Button variant="ghost" onClick={next}>
                  {index + 1 >= session.length ? 'Finish' : 'Skip'}
                </Button>
              ) : (
                <Button variant="primary" onClick={next}>
                  {index + 1 >= session.length ? 'Finish' : 'Next question'}
                </Button>
              )}
            </div>

            <SubmitHint challenge={current} response={response} grade={grade} />
          </Card>
        )
      )}
    </div>
  );
}

interface AnswerAreaProps {
  readonly challenge: EngineChallenge;
  readonly response: ChallengeResponse | null;
  readonly grade: ChallengeGrade | null;
  readonly numberText: string;
  readonly sequenceOrder: readonly string[];
  readonly onNumberChange: (value: string) => void;
  readonly onChoose: (challenge: EngineChallenge, optionId: string) => void;
  readonly onMove: (from: number, direction: -1 | 1) => void;
}

/** Renders the input appropriate to the question's kind. */
function AnswerArea({
  challenge,
  response,
  grade,
  numberText,
  sequenceOrder,
  onNumberChange,
  onChoose,
  onMove,
}: AnswerAreaProps) {
  const kind = responseKindFor(challenge);

  if (kind === 'number') {
    return (
      <div className="quiz-number">
        <label className="field quiz-field">
          <span className="field__label">Your answer{challenge.unit ? ` (${challenge.unit})` : ''}</span>
          <input
            type="number"
            className="data-table__input"
            inputMode="numeric"
            value={numberText}
            disabled={grade !== null}
            onChange={(event) => onNumberChange(event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (kind === 'sequence') {
    return (
      <ol className="quiz-sequence">
        {sequenceOrder.map((optionId, position) => (
          <li className="quiz-sequence__item" key={optionId}>
            <span className="quiz-sequence__index">{position + 1}</span>
            <span className="quiz-sequence__label">{labelOf(challenge, optionId)}</span>
            <span className="quiz-sequence__buttons">
              <button
                type="button"
                className="quiz-sequence__move"
                onClick={() => onMove(position, -1)}
                disabled={grade !== null || position === 0}
                aria-label={`Move ${labelOf(challenge, optionId)} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="quiz-sequence__move"
                onClick={() => onMove(position, 1)}
                disabled={grade !== null || position === sequenceOrder.length - 1}
                aria-label={`Move ${labelOf(challenge, optionId)} later`}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  const expected = challenge.expectedAnswer;
  const correctOptionId = expected.kind === 'choice' || expected.kind === 'decision' ? expected.optionId : null;
  const chosenId = response && (response.kind === 'choice' || response.kind === 'decision') ? response.optionId : null;

  return (
    <ul className="challenge-options">
      {(challenge.options ?? []).map((option) => (
        <li key={option.id}>
          <button
            type="button"
            className={cn(
              'challenge-option',
              grade !== null && option.id === correctOptionId && 'is-correct',
              grade !== null && option.id === chosenId && option.id !== correctOptionId && 'is-wrong',
            )}
            onClick={() => onChoose(challenge, option.id)}
            disabled={grade !== null}
            aria-pressed={chosenId === option.id}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A small prompt telling a learner what to do before they have answered. */
function SubmitHint({
  challenge,
  response,
  grade,
}: {
  readonly challenge: EngineChallenge;
  readonly response: ChallengeResponse | null;
  readonly grade: ChallengeGrade | null;
}) {
  if (grade) return null;
  const kind = responseKindFor(challenge);
  if (kind === 'number') {
    return <p className="challenge-feedback__hint">Enter your answer, then choose “Check answer”.</p>;
  }
  if (kind === 'sequence') {
    return (
      <p className="challenge-feedback__hint">
        Reorder the items with the arrows so the top item happens first, then choose “Check order”.
      </p>
    );
  }
  if (!response) return <p className="challenge-feedback__hint">Choose an option — it is marked immediately.</p>;
  return null;
}

function questionKindLabel(challenge: EngineChallenge): string {
  switch (challenge.kind) {
    case 'numerical':
      return 'Numerical answer';
    case 'prediction':
      return 'Prediction';
    case 'sequence':
      return 'Sequence ordering';
    case 'decision':
      return 'Simulation decision';
    default:
      return 'Multiple choice';
  }
}

/** The end-of-session summary, listing every question and how it went. */
function CompletionPanel({
  session,
  results,
  onRestart,
}: {
  readonly session: readonly EngineChallenge[];
  readonly results: Readonly<Record<string, boolean>>;
  readonly onRestart: () => void;
}) {
  const score = scoreSession(session, results);
  return (
    <div className="quiz-complete">
      <div className="page-stats">
        <Stat label="Correct" value={score.correct} />
        <Stat label="Answered" value={score.answered} hint={`of ${score.total}`} />
        <Stat label="Score" value={`${score.percent}%`} />
      </div>
      <p className="challenge-panel__lead">
        You reached {score.percent}% on this set. Retry any question you missed, or start a fresh session.
      </p>
      <ul className="challenge-review">
        {session.map((challenge) => {
          const correct = results[challenge.id];
          return (
            <li
              className={cn('challenge-review__item', correct === true && 'is-right', correct === false && 'is-wrong')}
              key={challenge.id}
            >
              <span className="challenge-review__mark">
                {correct === true ? '✓' : correct === false ? '✗' : '–'}
              </span>
              <span>
                <span className="challenge-review__title">{challenge.question}</span>
                <span className="challenge-review__answer"> Expected: {formatAnswer(challenge, challenge.expectedAnswer)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="quiz-actions">
        <Button variant="primary" onClick={onRestart}>
          Start a new session
        </Button>
      </div>
    </div>
  );
}

function labFor(challenge: EngineChallenge) {
  return getLab(challenge.relatedLab);
}
