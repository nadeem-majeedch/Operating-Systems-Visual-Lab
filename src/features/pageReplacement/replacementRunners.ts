import type { SimulationRun } from '@/engine';
import {
  PAGE_REPLACEMENT_LAB_ID,
  PAGE_REPLACEMENT_PRESETS,
  REPLACEMENT_ALGORITHM_IDS,
  REPLACEMENT_ALGORITHMS,
  runPageReplacement,
  type PageReplacementInput,
  type PageReplacementPreset,
  type PageReplacementStepData,
  type ReplacementAlgorithm,
} from '@/engine';
import type { ReplacementDraft } from './drafts';

export const REPLACEMENT_TOPIC_ID = 'virtual-memory';
export const REPLACEMENT_LAB_ID = PAGE_REPLACEMENT_LAB_ID;

export function replacementPresetOptions(): readonly PageReplacementPreset[] {
  return PAGE_REPLACEMENT_PRESETS;
}

/** Assemble an engine input from the workstation's editable draft. */
export function replacementInput(draft: ReplacementDraft): PageReplacementInput {
  return {
    algorithm: draft.algorithm,
    frameCount: draft.frameCount,
    referenceString: [...draft.referenceString],
  };
}

export function runReplacementInput(input: PageReplacementInput): SimulationRun<PageReplacementStepData> {
  return runPageReplacement(input);
}

/** Map a lab's starting algorithm id (e.g. `fifo-page`) back to its policy. */
export function algorithmForAlgorithmId(algorithmId: string): ReplacementAlgorithm | undefined {
  return REPLACEMENT_ALGORITHMS.find(
    (algorithm) => REPLACEMENT_ALGORITHM_IDS[algorithm] === algorithmId,
  );
}
