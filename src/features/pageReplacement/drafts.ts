import type { PageReplacementInput, PageReplacementPreset, ReplacementAlgorithm } from '@/engine';

/** Editable state behind the page-replacement workstation. */
export interface ReplacementDraft {
  algorithm: ReplacementAlgorithm;
  frameCount: number;
  referenceString: number[];
}

export function draftFromPreset(preset: PageReplacementPreset): ReplacementDraft {
  return draftFromInput(preset.input);
}

export function draftFromInput(input: PageReplacementInput): ReplacementDraft {
  return {
    algorithm: input.algorithm,
    frameCount: input.frameCount,
    referenceString: [...input.referenceString],
  };
}
