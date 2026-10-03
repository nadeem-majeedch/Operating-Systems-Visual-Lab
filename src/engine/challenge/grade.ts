import type { Challenge, ChallengeAnswer, ChallengeKind, ChallengeResponse } from './types';

/** The outcome of marking one response. */
export interface ChallengeGrade {
  readonly challengeId: string;
  readonly kind: ChallengeKind;
  readonly correct: boolean;
  /** Human-readable expected answer, suitable for the feedback panel. */
  readonly expected: string;
  /** Human-readable submitted answer. */
  readonly submitted: string;
}

function labelFor(challenge: Challenge, optionId: string): string {
  return challenge.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

/** Render an answer (expected or submitted) as the learner should read it. */
export function formatAnswer(challenge: Challenge, answer: ChallengeAnswer): string {
  switch (answer.kind) {
    case 'choice':
    case 'decision':
      return labelFor(challenge, answer.optionId);
    case 'number':
      return `${answer.value}${challenge.unit ? ` ${challenge.unit}` : ''}`;
    case 'sequence':
      return answer.order.map((id) => labelFor(challenge, id)).join(' → ');
  }
}

export function formatResponse(challenge: Challenge, response: ChallengeResponse): string {
  switch (response.kind) {
    case 'choice':
    case 'decision':
      return labelFor(challenge, response.optionId);
    case 'number':
      return `${response.value}${challenge.unit ? ` ${challenge.unit}` : ''}`;
    case 'sequence':
      return response.order.map((id) => labelFor(challenge, id)).join(' → ');
  }
}

/**
 * Mark one response.
 *
 * The comparison is strict on kind: a numerical answer is compared within its
 * tolerance, a sequence element-by-element, and a choice by option id. Anything
 * that does not match the expected answer's kind is marked incorrect rather than
 * throwing, so a malformed submission can never crash the runner.
 */
export function gradeChallenge(challenge: Challenge, response: ChallengeResponse): ChallengeGrade {
  const expected = challenge.expectedAnswer;
  let correct = false;

  if (expected.kind === 'number' && response.kind === 'number') {
    correct = Math.abs(response.value - expected.value) <= expected.tolerance;
  } else if (expected.kind === 'sequence' && response.kind === 'sequence') {
    correct =
      response.order.length === expected.order.length &&
      response.order.every((id, index) => id === expected.order[index]);
  } else if (
    (expected.kind === 'choice' || expected.kind === 'decision') &&
    (response.kind === 'choice' || response.kind === 'decision')
  ) {
    correct = response.optionId === expected.optionId;
  }

  return {
    challengeId: challenge.id,
    kind: challenge.kind,
    correct,
    expected: formatAnswer(challenge, expected),
    submitted: formatResponse(challenge, response),
  };
}
