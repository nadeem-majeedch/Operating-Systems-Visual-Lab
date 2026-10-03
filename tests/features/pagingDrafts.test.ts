import { describe, expect, it } from 'vitest';
import { PAGING_PRESETS, runPaging, validatePagingInput } from '@/engine';
import { pagingInput } from '@/features/paging/pagingRunners';
import { draftFromInput, draftFromPreset } from '@/features/paging/drafts';

describe('paging draft adapters', () => {
  it('round-trips every preset and keeps it valid', () => {
    for (const preset of PAGING_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.pageSize).toBe(preset.input.pageSize);
      expect(draft.references).toEqual(preset.input.references);
      expect(validatePagingInput(pagingInput(draft))).toEqual({ valid: true });
    }
  });

  it('does not alias the preset references', () => {
    const draft = draftFromPreset(PAGING_PRESETS[0]!);
    draft.references[0] = 999;
    expect(PAGING_PRESETS[0]!.input.references[0]).toBe(0);
  });

  it('rebuilds a draft from a full input and reproduces the run', () => {
    const source = PAGING_PRESETS.find((preset) => preset.id === 'paging-tlb-evict-lru')!;
    const input = pagingInput(draftFromPreset(source));
    const rebuilt = pagingInput(draftFromInput(input));
    expect(runPaging(rebuilt).summary).toEqual(runPaging(input).summary);
  });
});
