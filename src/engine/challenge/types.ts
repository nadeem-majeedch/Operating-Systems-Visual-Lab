import type { DifficultyLevel } from '@/types';

/**
 * The five question shapes the challenge engine can grade.
 *
 * They differ only in how the learner answers and in the kind of comparison the
 * grader performs, so one runner can render and mark every one of them.
 */
export type ChallengeKind = 'multiple-choice' | 'numerical' | 'prediction' | 'sequence' | 'decision';

export const CHALLENGE_KINDS: readonly ChallengeKind[] = [
  'multiple-choice',
  'numerical',
  'prediction',
  'sequence',
  'decision',
];

/** One selectable alternative, for choice-like questions and sequence items. */
export interface ChallengeAlternative {
  readonly id: string;
  readonly label: string;
}

/** The answer the grader compares a response against, discriminated by kind. */
export type ChallengeAnswer =
  | { readonly kind: 'choice'; readonly optionId: string }
  | { readonly kind: 'number'; readonly value: number; readonly tolerance: number }
  | { readonly kind: 'sequence'; readonly order: readonly string[] }
  | { readonly kind: 'decision'; readonly optionId: string };

/** A learner's answer, matching the question's kind. */
export type ChallengeResponse =
  | { readonly kind: 'choice'; readonly optionId: string }
  | { readonly kind: 'decision'; readonly optionId: string }
  | { readonly kind: 'sequence'; readonly order: readonly string[] }
  | { readonly kind: 'number'; readonly value: number };

/**
 * A single graded question.
 *
 * Every bank entry carries the same required fields — id, topic, difficulty,
 * question, scenario, expectedAnswer, explanation, relatedLab — plus the
 * alternatives its kind needs. The expected answer is produced by running the
 * real simulation engine, never typed by hand.
 */
export interface Challenge {
  readonly id: string;
  /** The learning-area id this challenge belongs to (e.g. `virtual-memory`). */
  readonly topic: string;
  /** The finer bank it is grouped under (e.g. `paging`, `page-replacement`). */
  readonly bank: string;
  readonly difficulty: DifficultyLevel;
  readonly kind: ChallengeKind;
  readonly question: string;
  readonly scenario: string;
  readonly expectedAnswer: ChallengeAnswer;
  readonly explanation: string;
  /** The lab where the answer can be reproduced. */
  readonly relatedLab: string;
  /** Alternatives for choice, prediction, decision and sequence questions. */
  readonly options?: readonly ChallengeAlternative[];
  /** Unit suffix for a numerical answer, e.g. `blocks` or `time units`. */
  readonly unit?: string;
}

/** Metadata for one bank, used by the picker and validation. */
export interface ChallengeBankInfo {
  readonly id: string;
  readonly topic: string;
  readonly title: string;
  readonly labId: string;
}
