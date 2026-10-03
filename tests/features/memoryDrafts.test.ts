import { describe, expect, it } from 'vitest';
import {
  CONTIGUOUS_PRESETS,
  FIXED_PARTITION_PRESETS,
  runMemory,
  validateMemoryInput,
  type MemoryInput,
} from '@/engine';
import { algorithmIdFor, memoryInput } from '@/features/memory/memoryRunners';
import { draftFromInput, draftFromPreset } from '@/features/memory/drafts';

function inputFromDraft(
  mode: 'fixed' | 'variable',
  policy: MemoryInput['policy'],
  draft: ReturnType<typeof draftFromPreset>,
): MemoryInput {
  return memoryInput(mode, policy, draft.totalSize, draft.partitions, draft.operations);
}

describe('memory draft adapters', () => {
  it('round-trips every variable preset and keeps it valid', () => {
    for (const preset of CONTIGUOUS_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.totalSize).toBe(preset.totalSize);
      expect(draft.partitions).toEqual([]);
      expect(draft.operations).toEqual(preset.operations);
      expect(validateMemoryInput(inputFromDraft('variable', 'first-fit', draft))).toEqual({
        valid: true,
      });
    }
  });

  it('round-trips every fixed preset with its partitions', () => {
    for (const preset of FIXED_PARTITION_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.partitions).toEqual(preset.partitions);
      expect(validateMemoryInput(inputFromDraft('fixed', 'first-fit', draft))).toEqual({ valid: true });
    }
  });

  it('does not alias the preset operations', () => {
    const draft = draftFromPreset(CONTIGUOUS_PRESETS[0]!);
    draft.operations[0] = { kind: 'allocate', name: 'ZZ', size: 1 };
    expect(CONTIGUOUS_PRESETS[0]!.operations[0]).toMatchObject({ name: 'A' });
  });

  it('rebuilds a draft from a full input and reproduces the run', () => {
    const source = CONTIGUOUS_PRESETS.find((preset) => preset.id === 'mem-strategies')!;
    const input = inputFromDraft('variable', 'worst-fit', draftFromPreset(source));
    const draft = draftFromInput(input);
    const rebuilt = inputFromDraft('variable', 'worst-fit', draft);
    expect(runMemory(rebuilt).summary).toEqual(runMemory(input).summary);
  });
});

describe('memory runner helpers', () => {
  it('maps a mode and policy to the engine algorithm id', () => {
    expect(algorithmIdFor('variable', 'first-fit')).toBe('first-fit');
    expect(algorithmIdFor('variable', 'next-fit')).toBe('next-fit');
    expect(algorithmIdFor('fixed', 'best-fit')).toBe('fixed-partitions');
  });

  it('omits partitions for variable memory', () => {
    const input = memoryInput('variable', 'first-fit', 800, [200, 200], []);
    expect(input.partitions).toBeUndefined();
  });
});
