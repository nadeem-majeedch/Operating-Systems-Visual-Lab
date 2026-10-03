import type { Algorithm } from '@/types';

export interface AlgorithmConcept {
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

/**
 * Build a concept explanation from an algorithm's own catalogue entry.
 *
 * Every line here is derived from declared facts (policy properties, complexity,
 * tags), never invented — this is what an algorithm's page shows when it has no
 * hand-authored prose yet.
 */
export function deriveAlgorithmConcept(algorithm: Algorithm): AlgorithmConcept {
  const points: string[] = [];

  if (algorithm.properties.preemptive !== undefined) {
    points.push(
      algorithm.properties.preemptive
        ? 'Preemptive: a running process can be interrupted mid-burst.'
        : 'Non-preemptive: a running process holds the CPU until its burst finishes.',
    );
  }
  if (algorithm.properties.optimal !== undefined) {
    points.push(
      algorithm.properties.optimal
        ? 'Optimal for its objective given complete information.'
        : 'Greedy: simple and fast, but not optimal.',
    );
  }
  if (algorithm.properties.online !== undefined) {
    points.push(
      algorithm.properties.online
        ? 'Works online, using only past and present information.'
        : 'Needs future knowledge, so it benchmarks real policies rather than replacing them.',
    );
  }
  if (algorithm.properties.timeComplexity) {
    points.push(`Time complexity: ${algorithm.properties.timeComplexity}.`);
  }
  if (algorithm.properties.spaceComplexity) {
    points.push(`Space complexity: ${algorithm.properties.spaceComplexity}.`);
  }
  if (algorithm.tags.length > 0) {
    points.push(`Related ideas: ${algorithm.tags.join(', ')}.`);
  }

  return { paragraphs: [algorithm.description], keyPoints: points };
}
