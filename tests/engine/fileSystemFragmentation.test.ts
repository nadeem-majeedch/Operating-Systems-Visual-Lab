import { describe, expect, it } from 'vitest';
import {
  ALLOCATION_STRATEGIES,
  FS_PRESETS,
  FS_STRATEGY_PROFILES,
  allocationProfile,
  buildFsChallenges,
  fsStepMetrics,
  runFileSystem,
  validateFsInput,
  type FsInput,
  type FsOperation,
  type FsStepData,
} from '@/engine';

function input(overrides: Partial<FsInput> = {}): FsInput {
  return {
    allocation: 'contiguous',
    blockCount: 12,
    blockSize: 256,
    inodeCount: 10,
    operations: [],
    ...overrides,
  };
}

function lastData(value: FsInput): FsStepData {
  const run = runFileSystem(value);
  const step = run.steps[run.steps.length - 1];
  if (!step) throw new Error('run produced no steps');
  return step.data;
}

function stepData(value: FsInput, event: string): FsStepData | undefined {
  return runFileSystem(value).steps.find((step) => step.data.event === event)?.data;
}

/* -------------------------------------------------------------------------- */
/* Growing a file                                                              */
/* -------------------------------------------------------------------------- */

describe('growing a file', () => {
  it('extends contiguously in place when the following blocks are free', () => {
    const scenario = input({
      operations: [
        { kind: 'create', path: '/a', size: 512, mode: 0o644 },
        { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        { kind: 'delete', path: '/b' },
        { kind: 'grow', path: '/a', size: 768 },
      ],
    });
    const grown = stepData(scenario, 'grow');
    expect(grown?.success).toBe(true);
    const inode = grown?.inodes.find((item) => item.number === grown.activeInode);
    expect(inode?.dataBlocks).toEqual([0, 1, 2]);
    expect(inode?.size).toBe(768);
    expect(grown?.usedBlocks).toBe(3);
  });

  it('refuses to grow in place under contiguous allocation when a neighbour blocks it', () => {
    const operations: FsOperation[] = [
      { kind: 'create', path: '/a', size: 256, mode: 0o644 },
      { kind: 'create', path: '/b', size: 256, mode: 0o644 },
      { kind: 'grow', path: '/a', size: 512 },
    ];
    // A refused grow is emitted as a `failed` step, so read the run's last step.
    const grown = lastData(input({ allocation: 'contiguous', operations }));
    expect(grown.success).toBe(false);
    expect(grown.reason).toMatch(/external fragmentation/i);
    // /a keeps its single block.
    const inode = grown?.inodes.find((item) => item.number === 1);
    expect(inode?.dataBlocks).toEqual([0]);
  });

  it('grows freely under linked allocation', () => {
    const operations: FsOperation[] = [
      { kind: 'create', path: '/a', size: 256, mode: 0o644 },
      { kind: 'create', path: '/b', size: 256, mode: 0o644 },
      { kind: 'grow', path: '/a', size: 512 },
    ];
    const grown = stepData(input({ allocation: 'linked', operations }), 'grow');
    expect(grown?.success).toBe(true);
    const inode = grown?.inodes.find((item) => item.number === 1);
    expect(inode?.dataBlocks).toEqual([0, 2]);
    // The chain links 0 → 2, skipping the neighbour at 1.
    expect(grown?.blocks.find((block) => block.index === 0)?.next).toBe(2);
  });

  it('grows freely under indexed allocation', () => {
    const operations: FsOperation[] = [
      { kind: 'create', path: '/a', size: 256, mode: 0o644 },
      { kind: 'create', path: '/b', size: 256, mode: 0o644 },
      { kind: 'grow', path: '/a', size: 512 },
    ];
    const grown = stepData(input({ allocation: 'indexed', operations }), 'grow');
    expect(grown?.success).toBe(true);
    const inode = grown?.inodes.find((item) => item.number === 1);
    expect(inode?.dataBlocks).toEqual([0, 2]);
  });

  it('changes only the size when the new size still fits the last block', () => {
    const grown = stepData(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 200, mode: 0o644 },
          { kind: 'grow', path: '/a', size: 250 },
        ],
      }),
      'grow',
    );
    expect(grown?.success).toBe(true);
    const inode = grown?.inodes.find((item) => item.number === grown.activeInode);
    expect(inode?.dataBlocks).toEqual([0]);
    expect(inode?.size).toBe(250);
  });

  it('rejects growing a non-file, or a size that is not larger', () => {
    expect(
      lastData(input({ operations: [{ kind: 'mkdir', path: '/d' }, { kind: 'grow', path: '/d', size: 100 }] })).success,
    ).toBe(false);
    expect(
      lastData(
        input({ operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }, { kind: 'grow', path: '/a', size: 256 }] }),
      ).success,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Shrinking a file                                                            */
/* -------------------------------------------------------------------------- */

describe('shrinking a file', () => {
  it('frees the trailing blocks', () => {
    const scenario = input({
      operations: [
        { kind: 'create', path: '/big', size: 1024, mode: 0o644 },
        { kind: 'shrink', path: '/big', size: 256 },
      ],
    });
    const shrunk = stepData(scenario, 'shrink');
    expect(shrunk?.success).toBe(true);
    expect(shrunk?.usedBlocks).toBe(1);
    const inode = shrunk?.inodes.find((item) => item.number === shrunk.activeInode);
    expect(inode?.dataBlocks).toEqual([0]);
    expect(shrunk?.blocks.filter((block) => block.state === 'free').map((block) => block.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  it('keeps the same blocks when the new size fits the last block', () => {
    const shrunk = stepData(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 400, mode: 0o644 },
          { kind: 'shrink', path: '/a', size: 300 },
        ],
      }),
      'shrink',
    );
    expect(shrunk?.success).toBe(true);
    expect(shrunk?.usedBlocks).toBe(2);
  });

  it('frees the index block once the file drops back under the direct pointers', () => {
    const scenario: FsInput = {
      allocation: 'indexed',
      blockCount: 24,
      blockSize: 256,
      inodeCount: 6,
      operations: [
        { kind: 'create', path: '/big', size: 4000, mode: 0o644 },
        { kind: 'shrink', path: '/big', size: 256 },
      ],
    };
    const before = stepData(scenario, 'create');
    const after = stepData(scenario, 'shrink');
    expect(before?.usedBlocks).toBe(17);
    expect(after?.usedBlocks).toBe(1);
    const inode = after?.inodes.find((item) => item.number === after.activeInode);
    expect(inode?.indexBlocks).toEqual([]);
    expect(inode?.indirect).toBeNull();
    expect(inode?.dataBlocks).toEqual([0]);
  });

  it('leaves the chain terminated correctly under linked allocation', () => {
    const scenario = input({
      allocation: 'linked',
      operations: [
        { kind: 'create', path: '/a', size: 768, mode: 0o644 },
        { kind: 'shrink', path: '/a', size: 256 },
      ],
    });
    const after = stepData(scenario, 'shrink');
    const inode = after?.inodes.find((item) => item.number === after.activeInode);
    expect(inode?.dataBlocks).toEqual([0]);
    expect(after?.blocks.find((block) => block.index === 0)?.next).toBeNull();
  });

  it('rejects shrinking a non-file, or a size that is not smaller', () => {
    expect(
      lastData(
        input({ operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }, { kind: 'shrink', path: '/a', size: 1024 }] }),
      ).success,
    ).toBe(false);
    expect(
      lastData(input({ operations: [{ kind: 'mkdir', path: '/d' }, { kind: 'shrink', path: '/d', size: 1 }] })).success,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation of grow/shrink                                                   */
/* -------------------------------------------------------------------------- */

describe('grow and shrink validation', () => {
  it('accepts a valid resize and rejects a bad size', () => {
    expect(
      validateFsInput(input({ operations: [{ kind: 'grow', path: '/a', size: 512 }] })),
    ).toEqual({ valid: true });
    expect(validateFsInput(input({ operations: [{ kind: 'shrink', path: '/a', size: 0 }] })).valid).toBe(false);
    expect(
      validateFsInput(input({ operations: [{ kind: 'grow', path: 'bad', size: 512 }] })).valid,
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Fragmentation                                                               */
/* -------------------------------------------------------------------------- */

describe('fragmentation', () => {
  it('reports one unbroken run when free space is contiguous', () => {
    const data = lastData(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 512, mode: 0o644 },
          { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        ],
      }),
    );
    expect(data.freeRuns).toEqual([{ start: 3, length: 9 }]);
    expect(data.largestFreeRun).toBe(9);
    expect(data.externalFragmentation).toBe(0);
  });

  it('measures external fragmentation when free blocks scatter', () => {
    const operations: FsOperation[] = [];
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      operations.push({ kind: 'create', path: `/${name}`, size: 256, mode: 0o644 });
    }
    for (const name of ['b', 'd', 'f', 'h']) operations.push({ kind: 'delete', path: `/${name}` });

    const data = lastData(input({ operations }));
    expect(data.usedBlocks).toBe(4);
    expect(data.freeBlocks).toBe(8);
    expect(data.freeRuns.map((run) => run.start)).toEqual([1, 3, 5, 7]);
    expect(data.largestFreeRun).toBe(5);
    expect(data.externalFragmentation).toBeCloseTo(1 - 5 / 8, 5);
  });

  it('reports zero fragmentation when the volume is full', () => {
    const operations: FsOperation[] = [];
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      operations.push({ kind: 'create', path: `/${name}`, size: 256, mode: 0o644 });
    }
    const data = lastData(input({ blockCount: 8, operations }));
    expect(data.freeBlocks).toBe(0);
    expect(data.freeRuns).toEqual([]);
    expect(data.externalFragmentation).toBe(0);
  });

  it('exposes fragmentation through the step metrics and summary', () => {
    const operations: FsOperation[] = [];
    for (const name of ['a', 'b', 'c', 'd']) operations.push({ kind: 'create', path: `/${name}`, size: 256, mode: 0o644 });
    operations.push({ kind: 'delete', path: '/b' });

    const run = runFileSystem(input({ operations }));
    const metrics = fsStepMetrics(lastData(input({ operations })));
    expect(metrics.freeRuns).toBe(2);
    expect(metrics.largestFreeRun).toBeGreaterThan(0);
    expect(run.summary.freeRuns).toBe(2);
    expect(run.summary.externalFragmentation).toBeGreaterThan(0);
  });

  it('exposes byte totals', () => {
    const data = lastData(input({ operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }] }));
    expect(data.usedBytes).toBe(2 * 256);
    expect(data.capacityBytes).toBe(12 * 256);
  });
});

/* -------------------------------------------------------------------------- */
/* Block views                                                                 */
/* -------------------------------------------------------------------------- */

describe('block views', () => {
  it('names the owning inode and file for each used block', () => {
    const data = lastData(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 256, mode: 0o644 },
          { kind: 'create', path: '/b', size: 512, mode: 0o644 },
        ],
      }),
    );
    const block0 = data.blocks[0];
    const block1 = data.blocks[1];
    expect(block0).toMatchObject({ index: 0, state: 'data', ownerPath: '/a', ownerInode: 1, fileIndex: 0 });
    expect(block1).toMatchObject({ index: 1, state: 'data', ownerPath: '/b', ownerInode: 2, fileIndex: 0 });
    expect(data.blocks[3]?.state).toBe('free');
    expect(data.blocks[3]?.ownerInode).toBeNull();
  });

  it('records the next pointer of every linked block', () => {
    const data = lastData(
      input({
        allocation: 'linked',
        operations: [{ kind: 'create', path: '/a', size: 768, mode: 0o644 }],
      }),
    );
    expect(data.blocks[0]?.next).toBe(1);
    expect(data.blocks[1]?.next).toBe(2);
    expect(data.blocks[2]?.next).toBeNull();
  });

  it('marks index blocks as their own state with the owning inode', () => {
    const data = lastData({
      allocation: 'indexed',
      blockCount: 24,
      blockSize: 256,
      inodeCount: 6,
      operations: [
        { kind: 'mkdir', path: '/data' },
        { kind: 'create', path: '/data/big', size: 4000, mode: 0o644 },
      ],
    });
    const indexBlock = data.blocks.find((block) => block.state === 'index');
    expect(indexBlock?.index).toBe(16);
    expect(indexBlock?.ownerPath).toBe('/data/big');
    expect(indexBlock?.ownerInode).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* Presets, profiles and challenges                                            */
/* -------------------------------------------------------------------------- */

describe('grow/shrink presets', () => {
  it('every preset is valid and runs', () => {
    for (const preset of FS_PRESETS) {
      expect(validateFsInput(preset.input)).toEqual({ valid: true });
      expect(() => runFileSystem(preset.input)).not.toThrow();
    }
  });

  it('the blocked-grow preset fails contiguously and succeeds when linked', () => {
    const preset = FS_PRESETS.find((item) => item.id === 'fs-grow-blocked')!;
    const contiguous = runFileSystem(preset.input);
    expect(
      contiguous.steps.some((step) => step.data.event === 'failed' && step.data.operation.includes('/a')),
    ).toBe(true);
    const linked = runFileSystem({ ...preset.input, allocation: 'linked' });
    expect(linked.steps.some((step) => step.data.event === 'failed')).toBe(false);
  });

  it('the shrink preset frees blocks the next file reuses', () => {
    const preset = FS_PRESETS.find((item) => item.id === 'fs-shrink-reuse')!;
    const run = runFileSystem(preset.input);
    const small = run.steps.find((step) => step.data.operation.includes('/small'));
    expect(small?.data.success).toBe(true);
    const inode = small?.data.inodes.find((item) => item.number === small.data.activeInode);
    expect(inode?.dataBlocks).toEqual([1, 2]);
  });
});

describe('allocation profiles', () => {
  it('describes every strategy', () => {
    expect(FS_STRATEGY_PROFILES.map((profile) => profile.strategy)).toEqual([...ALLOCATION_STRATEGIES]);
    for (const profile of FS_STRATEGY_PROFILES) {
      expect(profile.sequential.length).toBeGreaterThan(0);
      expect(profile.random.length).toBeGreaterThan(0);
      expect(profile.growth.length).toBeGreaterThan(0);
    }
  });

  it('looks a profile up by strategy', () => {
    expect(allocationProfile('linked')?.strategy).toBe('linked');
    expect(allocationProfile('nope' as never)).toBeUndefined();
  });
});

describe('predictor challenges', () => {
  const challenges = buildFsChallenges();
  const byId = new Map(challenges.map((challenge) => [challenge.id, challenge]));

  function answer(id: string): string | undefined {
    const challenge = byId.get(id);
    return challenge ? challenge.options[challenge.correctIndex] : undefined;
  }

  it('asks which block a grow will take', () => {
    expect(byId.has('fs-predict-block')).toBe(true);
    expect(answer('fs-predict-block')).toBe('2');
  });

  it('asks how many free runs remain', () => {
    expect(byId.has('fs-fragmentation-runs')).toBe(true);
    expect(answer('fs-fragmentation-runs')).toBe('4');
  });

  it('asks which block a pointer leads to', () => {
    expect(byId.has('fs-pointer-follow')).toBe(true);
    expect(answer('fs-pointer-follow')).toBe('3');
  });

  it('keeps every challenge well-formed', () => {
    expect(challenges).toHaveLength(challenges.length);
    for (const challenge of challenges) {
      expect(validateFsInput(challenge.input)).toEqual({ valid: true });
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(challenge.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});
