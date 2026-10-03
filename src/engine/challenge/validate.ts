import { DIFFICULTY_ORDER } from '@/types';
import { CHALLENGE_KINDS, type Challenge, type ChallengeAnswer } from './types';

/** One problem found while validating a challenge or bank. */
export interface ChallengeIssue {
  /** Dotted path, e.g. `expectedAnswer.optionId`. */
  readonly path: string;
  readonly message: string;
}

const CHOICE_KINDS = new Set(['multiple-choice', 'prediction', 'decision']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateAnswer(challenge: Challenge, issues: ChallengeIssue[]): void {
  const answer = challenge.expectedAnswer as ChallengeAnswer | undefined;
  if (!answer || typeof answer !== 'object') {
    issues.push({ path: 'expectedAnswer', message: 'expectedAnswer is required' });
    return;
  }

  const options = challenge.options ?? [];
  const optionIds = new Set(options.map((option) => option.id));

  switch (answer.kind) {
    case 'choice':
    case 'decision': {
      if (!CHOICE_KINDS.has(challenge.kind)) {
        issues.push({
          path: 'expectedAnswer.kind',
          message: `a ${challenge.kind} challenge cannot have a ${answer.kind} answer`,
        });
      }
      if (!isNonEmptyString(answer.optionId)) {
        issues.push({ path: 'expectedAnswer.optionId', message: 'optionId is required' });
      } else if (!optionIds.has(answer.optionId)) {
        issues.push({
          path: 'expectedAnswer.optionId',
          message: `"${answer.optionId}" is not one of the challenge options`,
        });
      }
      break;
    }
    case 'number': {
      if (challenge.kind !== 'numerical') {
        issues.push({
          path: 'expectedAnswer.kind',
          message: `only a numerical challenge may have a number answer (got ${challenge.kind})`,
        });
      }
      if (!Number.isFinite(answer.value)) {
        issues.push({ path: 'expectedAnswer.value', message: 'value must be a finite number' });
      }
      if (!Number.isFinite(answer.tolerance) || answer.tolerance < 0) {
        issues.push({ path: 'expectedAnswer.tolerance', message: 'tolerance must be >= 0' });
      }
      break;
    }
    case 'sequence': {
      if (challenge.kind !== 'sequence') {
        issues.push({
          path: 'expectedAnswer.kind',
          message: `only a sequence challenge may have a sequence answer (got ${challenge.kind})`,
        });
      }
      if (!Array.isArray(answer.order) || answer.order.length < 2) {
        issues.push({ path: 'expectedAnswer.order', message: 'a sequence needs at least two items' });
        break;
      }
      const seen = new Set<string>();
      answer.order.forEach((id, index) => {
        if (!optionIds.has(id)) {
          issues.push({
            path: `expectedAnswer.order[${index}]`,
            message: `"${id}" is not one of the challenge options`,
          });
        }
        if (seen.has(id)) {
          issues.push({ path: `expectedAnswer.order[${index}]`, message: `"${id}" is repeated` });
        }
        seen.add(id);
      });
      if (answer.order.length !== options.length) {
        issues.push({
          path: 'expectedAnswer.order',
          message: `the answer orders ${answer.order.length} items but the challenge offers ${options.length}`,
        });
      }
      break;
    }
    default:
      issues.push({ path: 'expectedAnswer.kind', message: 'unknown answer kind' });
  }
}

/**
 * Validate one challenge object.
 *
 * Returns every problem found, so a bank test can report them all at once rather
 * than failing on the first malformed entry.
 */
export function validateChallenge(input: unknown): ChallengeIssue[] {
  const issues: ChallengeIssue[] = [];
  if (!input || typeof input !== 'object') {
    return [{ path: '', message: 'challenge must be an object' }];
  }
  const challenge = input as Partial<Challenge>;

  for (const field of ['id', 'topic', 'bank', 'question', 'scenario', 'explanation', 'relatedLab'] as const) {
    if (!isNonEmptyString(challenge[field])) {
      issues.push({ path: field, message: `${field} is required` });
    }
  }

  if (!challenge.difficulty || !DIFFICULTY_ORDER.includes(challenge.difficulty)) {
    issues.push({ path: 'difficulty', message: `difficulty must be one of ${DIFFICULTY_ORDER.join(', ')}` });
  }

  if (!challenge.kind || !CHALLENGE_KINDS.includes(challenge.kind)) {
    issues.push({ path: 'kind', message: `kind must be one of ${CHALLENGE_KINDS.join(', ')}` });
  }

  const options = challenge.options;
  if (options !== undefined) {
    if (!Array.isArray(options) || options.length < 2) {
      issues.push({ path: 'options', message: 'options must contain at least two alternatives' });
    } else {
      const ids = new Set<string>();
      options.forEach((option, index) => {
        if (!isNonEmptyString(option?.id)) {
          issues.push({ path: `options[${index}].id`, message: 'option id is required' });
        } else if (ids.has(option.id)) {
          issues.push({ path: `options[${index}].id`, message: `duplicate option id "${option.id}"` });
        } else {
          ids.add(option.id);
        }
        if (!isNonEmptyString(option?.label)) {
          issues.push({ path: `options[${index}].label`, message: 'option label is required' });
        }
      });
    }
  } else if (challenge.kind && challenge.kind !== 'numerical') {
    issues.push({ path: 'options', message: `a ${challenge.kind} challenge needs options` });
  }

  validateAnswer(challenge as Challenge, issues);
  return issues;
}

/** Validate a whole bank: per-challenge rules plus unique ids. */
export function validateChallengeBank(input: readonly unknown[]): ChallengeIssue[] {
  const issues: ChallengeIssue[] = [];
  const ids = new Map<string, number>();
  input.forEach((entry, index) => {
    for (const issue of validateChallenge(entry)) {
      issues.push({ path: `[${index}].${issue.path}`, message: issue.message });
    }
    const id = (entry as Partial<Challenge> | null)?.id;
    if (typeof id === 'string' && id.length > 0) {
      const previous = ids.get(id);
      if (previous !== undefined) {
        issues.push({ path: `[${index}].id`, message: `duplicate challenge id "${id}" (first at ${previous})` });
      } else {
        ids.set(id, index);
      }
    }
  });
  return issues;
}
