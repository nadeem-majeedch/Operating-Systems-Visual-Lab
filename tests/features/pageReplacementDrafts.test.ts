import { describe, expect, it } from 'vitest';
import {
  PAGE_REPLACEMENT_PRESETS,
  REPLACEMENT_ALGORITHMS,
  REPLACEMENT_ALGORITHM_IDS,
  runPageReplacement,
  validatePageReplacementInput,
} from '@/engine';
import {
  algorithmForAlgorithmId,
  replacementInput,
} from '@/features/pageReplacement/replacementRunners';
import { draftFromInput, draftFromPreset } from '@/features/pageReplacement/drafts';

describe('page-replacement draft adapters', () => {
  it('round-trips every preset and keeps it valid', () => {
    for (const preset of PAGE_REPLACEMENT_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.algorithm).toBe(preset.input.algorithm);
      expect(draft.frameCount).toBe(preset.input.frameCount);
      expect(draft.referenceString).toEqual(preset.input.referenceString);
      expect(validatePageReplacementInput(replacementInput(draft))).toEqual({ valid: true });
    }
  });

  it('does not alias the preset reference string', () => {
    const draft = draftFromPreset(PAGE_REPLACEMENT_PRESETS[0]!);
    draft.referenceString[0] = 99;
    expect(PAGE_REPLACEMENT_PRESETS[0]!.input.referenceString[0]).not.toBe(99);
  });

  it('rebuilds a draft from a full input and reproduces the run', () => {
    const source = PAGE_REPLACEMENT_PRESETS.find((preset) => preset.id === 'repl-belady')!;
    const input = replacementInput(draftFromPreset(source));
    const rebuilt = replacementInput(draftFromInput(input));
    expect(runPageReplacement(rebuilt).summary).toEqual(runPageReplacement(input).summary);
  });

  it('maps lab algorithm ids back to their policy', () => {
    for (const algorithm of REPLACEMENT_ALGORITHMS) {
      expect(algorithmForAlgorithmId(REPLACEMENT_ALGORITHM_IDS[algorithm])).toBe(algorithm);
    }
    expect(algorithmForAlgorithmId('does-not-exist')).toBeUndefined();
  });
});
