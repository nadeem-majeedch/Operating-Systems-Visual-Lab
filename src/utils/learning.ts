/**
 * Pure helpers for guided-learning progress.
 *
 * Progress is a plain map of `topicId → completed stage ids`, which keeps it
 * trivially serialisable to `localStorage` and easy to unit-test without a DOM.
 * The React hook in `src/hooks/useLearningProgress.ts` wraps these functions.
 */

/** Progress for every lesson, keyed by topic id. */
export type LearningProgress = Readonly<Record<string, readonly string[]>>;

export interface LessonProgressSummary {
  readonly completed: number;
  readonly total: number;
  /** Percentage in `[0, 100]`, rounded. */
  readonly percent: number;
  readonly isComplete: boolean;
  /** Index of the first incomplete stage, or `undefined` when all are done. */
  readonly nextStageIndex: number | undefined;
}

/** Completion percentage for a count of completed stages, clamped to `[0, 100]`. */
export function percentComplete(completed: number, total: number): number {
  if (total <= 0) return 0;
  const safe = Math.max(0, Math.min(completed, total));
  return Math.round((safe / total) * 100);
}

/** The stage ids already completed for one lesson. */
export function completedStageIds(progress: LearningProgress, topicId: string): readonly string[] {
  return progress[topicId] ?? [];
}

/** Is a given stage already marked done? */
export function isStageComplete(progress: LearningProgress, topicId: string, stageId: string): boolean {
  return completedStageIds(progress, topicId).includes(stageId);
}

/**
 * Summarise a lesson's progress against its ordered stage ids.
 *
 * `stageIds` defines the order, so `nextStageIndex` points at the first stage the
 * learner has not finished — which is what the lesson view opens to.
 */
export function summariseProgress(
  progress: LearningProgress,
  topicId: string,
  stageIds: readonly string[],
): LessonProgressSummary {
  const done = new Set(completedStageIds(progress, topicId));
  const completed = stageIds.filter((id) => done.has(id)).length;
  const total = stageIds.length;
  const nextIndex = stageIds.findIndex((id) => !done.has(id));
  return {
    completed,
    total,
    percent: percentComplete(completed, total),
    isComplete: total > 0 && completed === total,
    nextStageIndex: nextIndex === -1 ? undefined : nextIndex,
  };
}

/**
 * Return a new progress map with one stage marked complete or not.
 *
 * Pure and immutable: the input map is never mutated, which keeps React state
 * updates predictable and makes the helper testable in isolation.
 */
export function withStage(
  progress: LearningProgress,
  topicId: string,
  stageId: string,
  completed: boolean,
): Record<string, readonly string[]> {
  const current = new Set(completedStageIds(progress, topicId));
  if (completed) current.add(stageId);
  else current.delete(stageId);
  return { ...progress, [topicId]: [...current] };
}

/** Return a new progress map with one lesson's progress erased. */
export function withoutTopic(progress: LearningProgress, topicId: string): Record<string, readonly string[]> {
  const next = { ...progress };
  delete next[topicId];
  return next;
}

/** Count how many lessons have at least one completed stage. */
export function startedLessonCount(progress: LearningProgress): number {
  return Object.values(progress).filter((ids) => ids.length > 0).length;
}
