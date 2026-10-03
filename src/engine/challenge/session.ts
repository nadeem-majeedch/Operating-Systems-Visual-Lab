import type { Challenge } from './types';

/** Progress and score for the current session. */
export interface SessionScore {
  readonly answered: number;
  readonly correct: number;
  readonly total: number;
  /** Percentage of the whole set answered correctly, rounded. */
  readonly percent: number;
}

/**
 * Score a set of challenges against the recorded results.
 *
 * `results` maps a challenge id to whether it was answered correctly. A missing
 * id means the question is still unanswered, so it never counts against the
 * learner — only the whole set is the denominator.
 */
export function scoreSession(
  challenges: readonly Challenge[],
  results: Readonly<Record<string, boolean>>,
): SessionScore {
  const total = challenges.length;
  let answered = 0;
  let correct = 0;
  for (const challenge of challenges) {
    const result = results[challenge.id];
    if (result === undefined) continue;
    answered += 1;
    if (result) correct += 1;
  }
  return {
    answered,
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}

/** Percentage of the set the learner has reached, for the progress bar. */
export function progressPercent(challenges: readonly Challenge[], index: number): number {
  if (challenges.length === 0) return 0;
  const clamped = Math.max(0, Math.min(index, challenges.length));
  return Math.round((clamped / challenges.length) * 100);
}
