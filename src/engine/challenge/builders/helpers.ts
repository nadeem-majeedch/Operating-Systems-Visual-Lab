import type { ChallengeAlternative, ChallengeAnswer } from '../types';

/** Turn a list of labels into alternatives with stable ids. */
export function makeAlternatives(labels: readonly string[]): ChallengeAlternative[] {
  return labels.map((label, index) => ({ id: `o${index}`, label }));
}

/** The id of the alternative whose label matches, falling back to the first. */
export function idFor(options: readonly ChallengeAlternative[], label: string): string {
  return options.find((option) => option.label === label)?.id ?? options[0]!.id;
}

/**
 * Alternatives with the correct label inserted at a chosen position.
 *
 * Placing the answer at a different index for each question stops the runner
 * from ever looking like "the first option is correct".
 */
export function choiceSet(
  correct: string,
  distractors: readonly string[],
  position = 0,
): { options: ChallengeAlternative[]; correctId: string } {
  const labels = [...distractors];
  const at = Math.max(0, Math.min(position, labels.length));
  labels.splice(at, 0, correct);
  const options = makeAlternatives(labels);
  return { options, correctId: options[at]!.id };
}

/** Unique, ascending numeric alternatives containing the correct value. */
export function numericAlternatives(
  correct: number,
  candidates: readonly number[],
): { options: ChallengeAlternative[]; correctId: string } {
  const values = [...new Set([correct, ...candidates.filter((value) => Number.isFinite(value))])].sort(
    (a, b) => a - b,
  );
  const options = values.map((value) => ({ id: `n${value}`, label: String(value) }));
  return { options, correctId: `n${correct}` };
}

/**
 * Alternatives plus the correct ordering of their labels.
 *
 * The answer must order every alternative exactly once, so the caller passes the
 * full label set; validation rejects anything shorter.
 */
export function sequenceSet(
  labels: readonly string[],
  correctOrder: readonly string[],
): { options: ChallengeAlternative[]; order: string[] } {
  const options = makeAlternatives(labels);
  return { options, order: correctOrder.map((label) => idFor(options, label)) };
}

/* -------------------------------------------------------------------------- */
/* Answer constructors — keep the discriminated-union literals in one place.  */
/* -------------------------------------------------------------------------- */

export function numberAnswer(value: number, tolerance = 0): ChallengeAnswer {
  return { kind: 'number', value, tolerance };
}

export function choiceAnswer(optionId: string): ChallengeAnswer {
  return { kind: 'choice', optionId };
}

export function decisionAnswer(optionId: string): ChallengeAnswer {
  return { kind: 'decision', optionId };
}

export function sequenceAnswer(order: readonly string[]): ChallengeAnswer {
  return { kind: 'sequence', order };
}
