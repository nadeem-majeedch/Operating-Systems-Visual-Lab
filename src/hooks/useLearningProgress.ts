import { useCallback } from 'react';
import { type LearningProgress, startedLessonCount, withStage, withoutTopic } from '@/utils';
import { useLocalStorage } from './useLocalStorage';

/** localStorage key holding the learner’s guided-lesson progress. */
export const LEARNING_PROGRESS_KEY = 'osvl-learning-progress';

export interface UseLearningProgressResult {
  readonly progress: LearningProgress;
  /** Mark one stage of one lesson as completed. */
  completeStage: (topicId: string, stageId: string) => void;
  /** Clear a single stage’s completion. */
  reopenStage: (topicId: string, stageId: string) => void;
  /** Flip a stage between complete and incomplete. */
  toggleStage: (topicId: string, stageId: string) => void;
  /** Forget progress for one lesson. */
  resetLesson: (topicId: string) => void;
  /** Forget all guided-learning progress (the “reset” action). */
  resetAll: () => void;
  /** How many lessons have been started at all. */
  readonly startedCount: number;
}

/**
 * Guided-learning progress, persisted locally.
 *
 * No account is needed and nothing leaves the browser: progress is a map of
 * completed stage ids per topic id, stored under one localStorage key. The hook
 * is deliberately thin — all the arithmetic lives in the pure `@/utils/learning`
 * helpers, so it can be tested without a DOM.
 */
export function useLearningProgress(): UseLearningProgressResult {
  const { value, setValue } = useLocalStorage<LearningProgress>(LEARNING_PROGRESS_KEY, {});

  const completeStage = useCallback(
    (topicId: string, stageId: string) => setValue(withStage(value, topicId, stageId, true)),
    [setValue, value],
  );

  const reopenStage = useCallback(
    (topicId: string, stageId: string) => setValue(withStage(value, topicId, stageId, false)),
    [setValue, value],
  );

  const toggleStage = useCallback(
    (topicId: string, stageId: string) => {
      const done = (value[topicId] ?? []).includes(stageId);
      setValue(withStage(value, topicId, stageId, !done));
    },
    [setValue, value],
  );

  const resetLesson = useCallback(
    (topicId: string) => setValue(withoutTopic(value, topicId)),
    [setValue, value],
  );

  const resetAll = useCallback(() => setValue({}), [setValue]);

  return {
    progress: value,
    completeStage,
    reopenStage,
    toggleStage,
    resetLesson,
    resetAll,
    startedCount: startedLessonCount(value),
  };
}
