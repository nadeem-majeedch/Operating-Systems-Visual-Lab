import { describe, expect, it } from 'vitest';
import {
  DISK_ALGORITHMS,
  DISK_ALGORITHM_IDS,
  DISK_PRESETS,
  runDiskScheduling,
  validateDiskInput,
} from '@/engine';
import {
  algorithmForAlgorithmId,
  diskInput,
  generateRequests,
} from '@/features/disk/diskRunners';
import { draftFromInput, draftFromPreset } from '@/features/disk/drafts';

describe('disk draft adapters', () => {
  it('round-trips every preset and keeps it valid', () => {
    for (const preset of DISK_PRESETS) {
      const draft = draftFromPreset(preset);
      expect(draft.algorithm).toBe(preset.input.algorithm);
      expect(draft.diskSize).toBe(preset.input.diskSize);
      expect(draft.head).toBe(preset.input.head);
      expect(draft.direction).toBe(preset.input.direction);
      expect(draft.requests).toEqual(preset.input.requests);
      expect(validateDiskInput(diskInput(draft))).toEqual({ valid: true });
    }
  });

  it('does not alias the preset request queue', () => {
    const draft = draftFromPreset(DISK_PRESETS[0]!);
    draft.requests[0] = 999;
    expect(DISK_PRESETS[0]!.input.requests[0]).not.toBe(999);
  });

  it('rebuilds a draft from a full input and reproduces the run', () => {
    const source = DISK_PRESETS.find((preset) => preset.id === 'disk-scan')!;
    const input = diskInput(draftFromPreset(source));
    const rebuilt = diskInput(draftFromInput(input));
    expect(runDiskScheduling(rebuilt).summary).toEqual(runDiskScheduling(input).summary);
  });

  it('maps lab algorithm ids back to their policy', () => {
    for (const algorithm of DISK_ALGORITHMS) {
      expect(algorithmForAlgorithmId(DISK_ALGORITHM_IDS[algorithm])).toBe(algorithm);
    }
    expect(algorithmForAlgorithmId('nope')).toBeUndefined();
  });
});

describe('generateRequests', () => {
  it('produces the requested count inside the disk range', () => {
    const requests = generateRequests(200, 12, 7);
    expect(requests).toHaveLength(12);
    for (const cylinder of requests) {
      expect(cylinder).toBeGreaterThanOrEqual(0);
      expect(cylinder).toBeLessThan(200);
      expect(Number.isInteger(cylinder)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateRequests(200, 10, 42)).toEqual(generateRequests(200, 10, 42));
    expect(generateRequests(200, 10, 42)).not.toEqual(generateRequests(200, 10, 43));
  });

  it('never produces a request outside the disk, even for tiny disks', () => {
    const requests = generateRequests(16, 24, 5);
    expect(Math.max(...requests)).toBeLessThan(16);
  });
});
