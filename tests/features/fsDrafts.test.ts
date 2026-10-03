import { describe, expect, it } from 'vitest';
import {
  ALLOCATION_ALGORITHM_IDS,
  ALLOCATION_STRATEGIES,
  FS_PRESETS,
  runFileSystem,
  validateFsInput,
} from '@/engine';
import { algorithmForAlgorithmId, fsInput, runFsInput } from '@/features/fs/fsRunners';
import { draftFromInput, draftFromPreset } from '@/features/fs/drafts';

describe('file-system draft adapters', () => {
  it('round-trips every preset and keeps it valid', () => {
    for (const preset of FS_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.allocation).toBe(preset.input.allocation);
      expect(draft.blockCount).toBe(preset.input.blockCount);
      expect(draft.blockSize).toBe(preset.input.blockSize);
      expect(draft.inodeCount).toBe(preset.input.inodeCount);
      expect(draft.operations).toEqual(preset.input.operations);
      expect(validateFsInput(fsInput(draft))).toEqual({ valid: true });
    }
  });

  it('does not alias the preset operation list', () => {
    const draft = draftFromPreset(FS_PRESETS[0]!);
    draft.operations.pop();
    expect(FS_PRESETS[0]!.input.operations.length).toBeGreaterThan(draft.operations.length);
  });

  it('rebuilds a draft from a full input and reproduces the run', () => {
    const source = FS_PRESETS.find((preset) => preset.id === 'fs-indexed-large')!;
    const input = fsInput(draftFromPreset(source));
    const rebuilt = fsInput(draftFromInput(input));
    expect(runFileSystem(rebuilt).summary).toEqual(runFileSystem(input).summary);
  });

  it('maps lab algorithm ids back to their strategy', () => {
    for (const strategy of ALLOCATION_STRATEGIES) {
      expect(algorithmForAlgorithmId(ALLOCATION_ALGORITHM_IDS[strategy])).toBe(strategy);
    }
    expect(algorithmForAlgorithmId('nope')).toBeUndefined();
  });

  it('runs an input through the runner', () => {
    const run = runFsInput(FS_PRESETS[0]!.input);
    expect(run.labId).toBe('lab-file-allocation');
  });
});
