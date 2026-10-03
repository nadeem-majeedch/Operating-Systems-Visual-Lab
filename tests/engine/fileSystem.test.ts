import { describe, expect, it } from 'vitest';
import {
  ALLOCATION_ALGORITHM_IDS,
  ALLOCATION_STRATEGIES,
  DIRECT_BLOCKS,
  FS_CHALLENGE_COUNT,
  FS_ENGINE_ID,
  FS_LAB_ID,
  FS_PRESETS,
  POINTER_SIZE,
  blocksForSize,
  buildFsChallenges,
  compareFsAllocation,
  fileSystemEngine,
  findFsPreset,
  fsStepMetrics,
  isValidPath,
  maxFileBlocks,
  runFileSystem,
  validateFsInput,
  type FsInput,
  type FsOperation,
} from '@/engine';

function input(overrides: Partial<FsInput> = {}): FsInput {
  return {
    allocation: 'indexed',
    blockCount: 16,
    blockSize: 256,
    inodeCount: 8,
    operations: [],
    ...overrides,
  };
}

const FILL: FsOperation[] = [
  { kind: 'create', path: '/a', size: 256, mode: 0o644 },
  { kind: 'create', path: '/b', size: 256, mode: 0o644 },
  { kind: 'create', path: '/c', size: 256, mode: 0o644 },
  { kind: 'create', path: '/d', size: 256, mode: 0o644 },
  { kind: 'create', path: '/e', size: 256, mode: 0o644 },
  { kind: 'create', path: '/f', size: 256, mode: 0o644 },
  { kind: 'create', path: '/g', size: 256, mode: 0o644 },
  { kind: 'create', path: '/h', size: 256, mode: 0o644 },
];

const FRAGMENT: FsOperation[] = [
  ...FILL,
  { kind: 'delete', path: '/b' },
  { kind: 'delete', path: '/d' },
  { kind: 'create', path: '/i', size: 512, mode: 0o644 },
  { kind: 'delete', path: '/c' },
  { kind: 'delete', path: '/e' },
  { kind: 'create', path: '/j', size: 512, mode: 0o644 },
];

function fragmentInput(allocation: FsInput['allocation']): FsInput {
  return { allocation, blockCount: 8, blockSize: 256, inodeCount: 12, operations: FRAGMENT };
}

function lastStepData(value: FsInput) {
  const run = runFileSystem(value);
  const step = run.steps[run.steps.length - 1];
  if (!step) throw new Error('run produced no steps');
  return step.data;
}

/* -------------------------------------------------------------------------- */
/* Structure                                                                   */
/* -------------------------------------------------------------------------- */

describe('file system run structure', () => {
  it('emits an initial mount step plus one step per operation', () => {
    const run = runFileSystem(input({ operations: FILL }));
    expect(run.steps[0]?.data.event).toBe('init');
    expect(run.steps.length).toBe(FILL.length + 1);
    expect(run.labId).toBe(FS_LAB_ID);
  });

  it('derives the algorithm id from the allocation strategy', () => {
    for (const strategy of ALLOCATION_STRATEGIES) {
      const run = runFileSystem(input({ allocation: strategy }));
      expect(run.algorithmId).toBe(ALLOCATION_ALGORITHM_IDS[strategy]);
    }
  });

  it('reports summary counts', () => {
    const run = runFileSystem(input({ operations: [{ kind: 'create', path: '/a', size: 256, mode: 0o644 }] }));
    expect(run.summary.operations).toBe(1);
    expect(run.summary.usedBlocks).toBe(1);
    expect(run.summary.freeBlocks).toBe(15);
    expect(run.summary.usedInodes).toBe(2); // root + the file
    expect(run.summary.steps).toBe(2);
  });

  it('exposes engine metadata', () => {
    expect(fileSystemEngine.id).toBe(FS_ENGINE_ID);
    expect(fileSystemEngine.labId).toBe(FS_LAB_ID);
    expect(fileSystemEngine.validate).toBe(validateFsInput);
  });

  it('computes step metrics', () => {
    const data = lastStepData(input({ blockCount: 16, inodeCount: 12, operations: FILL }));
    const metrics = fsStepMetrics(data);
    expect(metrics.usedBlocks).toBe(8);
    expect(metrics.freeBlocks).toBe(8);
    expect(metrics.nodes).toBe(data.nodes.length);
  });
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

describe('validateFsInput', () => {
  it('accepts a well-formed volume', () => {
    expect(validateFsInput(input())).toEqual({ valid: true });
  });

  it('rejects an unknown allocation strategy', () => {
    const result = validateFsInput({ ...input(), allocation: 'raid' as never });
    expect(result.valid).toBe(false);
  });

  it('rejects out-of-range geometry', () => {
    expect(validateFsInput({ ...input(), blockCount: 2 }).valid).toBe(false);
    expect(validateFsInput({ ...input(), blockSize: 100 }).valid).toBe(false);
    expect(validateFsInput({ ...input(), inodeCount: 1 }).valid).toBe(false);
  });

  it('rejects bad paths, names and modes', () => {
    expect(validateFsInput({ ...input(), operations: [{ kind: 'mkdir', path: 'nope' }] }).valid).toBe(false);
    expect(
      validateFsInput({ ...input(), operations: [{ kind: 'rename', path: '/a', name: 'bad/name' }] }).valid,
    ).toBe(false);
    expect(
      validateFsInput({ ...input(), operations: [{ kind: 'chmod', path: '/a', mode: 0o1000 }] }).valid,
    ).toBe(false);
  });

  it('rejects a file larger than an inode can address', () => {
    const size = maxFileBlocks(256) * 256 + 1;
    const result = validateFsInput({
      ...input(),
      operations: [{ kind: 'create', path: '/huge', size, mode: 0o644 }],
    });
    expect(result.valid).toBe(false);
  });

  it('throws through the engine for invalid input', () => {
    expect(() => runFileSystem({ ...input(), blockCount: 0 })).toThrow(/File system/);
  });
});

/* -------------------------------------------------------------------------- */
/* Allocation strategies                                                       */
/* -------------------------------------------------------------------------- */

describe('allocation strategies', () => {
  it('contiguous allocation refuses a file that needs a run it cannot find', () => {
    const data = lastStepData(fragmentInput('contiguous'));
    const failed = data.nodes.find((node) => node.path === '/i');
    expect(failed).toBeUndefined();

    const run = runFileSystem(fragmentInput('contiguous'));
    const refusals = run.steps.filter((step) => step.data.success === false);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.data.operation).toContain('/i');

    // The later request succeeds once neighbouring holes merge.
    expect(run.summary.freeBlocks).toBe(2);
    expect(data.freeBlocks).toBe(2);
  });

  it('contiguous allocation places a file in one unbroken run', () => {
    const run = runFileSystem(
      input({ allocation: 'contiguous', operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }] }),
    );
    const data = lastStepData(input({ allocation: 'contiguous', operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }] }));
    expect(data.activeBlocks).toEqual([0, 1]);
    const inode = data.inodes.find((item) => item.number === data.activeInode);
    expect(inode?.dataBlocks).toEqual([0, 1]);
    expect(run.summary.usedBlocks).toBe(2);
  });

  it('linked allocation succeeds on the fragmented disk and chains blocks', () => {
    const run = runFileSystem(fragmentInput('linked'));
    expect(run.steps.some((step) => step.data.success === false)).toBe(false);
    expect(run.summary.freeBlocks).toBe(0);

    const data = lastStepData(fragmentInput('linked'));
    const chained = data.blocks.filter((block) => block.next !== null);
    expect(chained.length).toBeGreaterThan(0);
    // A linked block's next pointer is a real block index, not null.
    for (const block of chained) {
      expect(block.next).toBeGreaterThanOrEqual(0);
      expect(block.next).toBeLessThan(data.blockCount);
    }
  });

  it('indexed allocation succeeds and records an index block past the direct pointers', () => {
    const big: FsInput = {
      allocation: 'indexed',
      blockCount: 24,
      blockSize: 256,
      inodeCount: 6,
      operations: [
        { kind: 'mkdir', path: '/data' },
        { kind: 'create', path: '/data/big', size: 4000, mode: 0o644 },
      ],
    };
    const run = runFileSystem(big);
    expect(run.steps.some((step) => step.data.success === false)).toBe(false);

    const createStep = run.steps.find((step) => step.data.event === 'create');
    const inode = createStep?.data.inodes.find((item) => item.number === createStep.data.activeInode);
    expect(inode?.dataBlocks).toHaveLength(blocksForSize(4000, 256));
    expect(inode?.indexBlocks).toHaveLength(1);
    expect(inode?.indirect).not.toBeNull();
    // 16 data blocks plus one index block.
    expect(createStep?.data.usedBlocks).toBe(17);
  });

  it('does not need an index block for a small file', () => {
    const run = runFileSystem(
      input({ allocation: 'indexed', operations: [{ kind: 'create', path: '/a', size: 256 * DIRECT_BLOCKS, mode: 0o644 }] }),
    );
    const step = run.steps.find((item) => item.data.event === 'create');
    const inode = step?.data.inodes.find((item) => item.number === step.data.activeInode);
    expect(inode?.indexBlocks).toHaveLength(0);
    expect(step?.data.usedBlocks).toBe(DIRECT_BLOCKS);
  });
});

/* -------------------------------------------------------------------------- */
/* Tree operations                                                             */
/* -------------------------------------------------------------------------- */

describe('directory tree operations', () => {
  it('mkdir creates a nested directory with inode 1', () => {
    const run = runFileSystem(
      input({ operations: [{ kind: 'mkdir', path: '/home' }, { kind: 'mkdir', path: '/home/user' }] }),
    );
    const last = run.steps[run.steps.length - 1];
    const paths = last?.data.nodes.map((node) => node.path);
    expect(paths).toContain('/home');
    expect(paths).toContain('/home/user');
    expect(run.steps[1]?.data.activeInode).toBe(1);
  });

  it('refuses mkdir under a missing parent', () => {
    const run = runFileSystem(input({ operations: [{ kind: 'mkdir', path: '/a/b' }] }));
    expect(run.steps[1]?.data.success).toBe(false);
  });

  it('refuses a duplicate create', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 100, mode: 0o644 },
          { kind: 'create', path: '/a', size: 100, mode: 0o644 },
        ],
      }),
    );
    expect(run.steps[1]?.data.success).toBe(true);
    expect(run.steps[2]?.data.success).toBe(false);
  });

  it('delete frees the blocks and the inode', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 512, mode: 0o644 },
          { kind: 'delete', path: '/a' },
        ],
      }),
    );
    expect(run.summary.usedBlocks).toBe(0);
    expect(run.summary.usedInodes).toBe(1);
  });

  it('refuses to delete a non-empty directory', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'mkdir', path: '/d' },
          { kind: 'create', path: '/d/a', size: 100, mode: 0o644 },
          { kind: 'delete', path: '/d' },
        ],
      }),
    );
    expect(run.steps[3]?.data.success).toBe(false);
  });

  it('refuses to delete an open file', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 100, mode: 0o644 },
          { kind: 'open', path: '/a' },
          { kind: 'delete', path: '/a' },
        ],
      }),
    );
    expect(run.steps[3]?.data.success).toBe(false);
  });

  it('rename keeps the inode and blocks unchanged', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 512, mode: 0o644 },
          { kind: 'rename', path: '/a', name: 'b' },
        ],
      }),
    );
    const created = run.steps[1]?.data.inodes.find((inode) => inode.number === run.steps[1]!.data.activeInode);
    const renamed = run.steps[2]?.data.inodes.find((inode) => inode.number === run.steps[2]!.data.activeInode);
    expect(renamed?.number).toBe(created?.number);
    expect(renamed?.dataBlocks).toEqual(created?.dataBlocks);
    expect(run.steps[2]?.data.activePath).toBe('/b');
  });

  it('move changes the path but no blocks', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'mkdir', path: '/d' },
          { kind: 'create', path: '/a', size: 256, mode: 0o644 },
          { kind: 'move', path: '/a', to: '/d' },
        ],
      }),
    );
    const moved = run.steps[3]?.data;
    expect(moved?.activePath).toBe('/d/a');
    expect(moved?.usedBlocks).toBe(1);
  });

  it('refuses to move a directory inside itself', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'mkdir', path: '/a' },
          { kind: 'mkdir', path: '/a/b' },
          { kind: 'move', path: '/a', to: '/a/b' },
        ],
      }),
    );
    expect(run.steps[3]?.data.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Open / close                                                                */
/* -------------------------------------------------------------------------- */

describe('open and close', () => {
  it('tracks the open count and refuses closing an unopened file', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 100, mode: 0o644 },
          { kind: 'open', path: '/a' },
          { kind: 'open', path: '/a' },
          { kind: 'close', path: '/a' },
          { kind: 'close', path: '/a' },
          { kind: 'close', path: '/a' },
        ],
      }),
    );
    // After the first close one handle remains; after the second none do.
    expect(run.steps[4]?.data.openFiles).toEqual(['/a']);
    expect(run.steps[5]?.data.openFiles).toEqual([]);
    expect(run.steps[6]?.data.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Permissions and timestamps                                                  */
/* -------------------------------------------------------------------------- */

describe('permissions and metadata', () => {
  it('chmod changes the mode without moving blocks', () => {
    const run = runFileSystem(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 512, mode: 0o644 },
          { kind: 'chmod', path: '/a', mode: 0o600 },
        ],
      }),
    );
    const before = run.steps[1]?.data;
    const after = run.steps[2]?.data;
    expect(after?.usedBlocks).toBe(before?.usedBlocks);
    const inode = after?.inodes.find((item) => item.number === after.activeInode);
    expect(inode?.mode).toBe(0o600);
    expect(inode?.permissions).toBe('rw-------');
  });

  it('stamps created, modified and accessed on create', () => {
    const run = runFileSystem(input({ operations: [{ kind: 'create', path: '/a', size: 100, mode: 0o644 }] }));
    const inode = run.steps[1]?.data.inodes.find((item) => item.number === run.steps[1]!.data.activeInode);
    expect(inode?.created).toBeGreaterThan(0);
    expect(inode?.modified).toBe(inode?.created);
    expect(inode?.accessed).toBe(inode?.created);
  });
});

/* -------------------------------------------------------------------------- */
/* Inodes and free space                                                       */
/* -------------------------------------------------------------------------- */

describe('inodes and free space', () => {
  it('reserves inode 0 for the root directory', () => {
    const data = lastStepData(input());
    const root = data.inodes[0];
    expect(root?.used).toBe(true);
    expect(root?.type).toBe('dir');
    expect(root?.path).toBe('/');
  });

  it('runs out of inodes before blocks', () => {
    const run = runFileSystem({
      allocation: 'indexed',
      blockCount: 32,
      blockSize: 256,
      inodeCount: 5,
      operations: [1, 2, 3, 4, 5].map((n) => ({
        kind: 'create' as const,
        path: `/f${n}`,
        size: 100,
        mode: 0o644,
      })),
    });
    expect(run.summary.usedInodes).toBe(5);
    const successes = run.steps.filter((step) => step.data.event === 'create' && step.data.success).length;
    expect(successes).toBe(4);
    expect(run.summary.freeBlocks).toBeGreaterThan(0);
  });

  it('the bitmap marks used blocks and clears them on delete', () => {
    const created = lastStepData(input({ operations: [{ kind: 'create', path: '/a', size: 512, mode: 0o644 }] }));
    expect(created.blocks.filter((block) => block.state === 'data')).toHaveLength(2);
    expect(created.freeBlocks).toBe(14);

    const deleted = lastStepData(
      input({
        operations: [
          { kind: 'create', path: '/a', size: 512, mode: 0o644 },
          { kind: 'delete', path: '/a' },
        ],
      }),
    );
    expect(deleted.blocks.every((block) => block.state === 'free')).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

describe('helpers', () => {
  it('computes blocks for a size', () => {
    expect(blocksForSize(0, 256)).toBe(0);
    expect(blocksForSize(1, 256)).toBe(1);
    expect(blocksForSize(256, 256)).toBe(1);
    expect(blocksForSize(257, 256)).toBe(2);
  });

  it('computes the addressable blocks per inode', () => {
    expect(maxFileBlocks(256)).toBe(DIRECT_BLOCKS + 256 / POINTER_SIZE);
    expect(maxFileBlocks(1024)).toBe(DIRECT_BLOCKS + 1024 / POINTER_SIZE);
  });

  it('validates paths', () => {
    expect(isValidPath('/')).toBe(true);
    expect(isValidPath('/a/b/c')).toBe(true);
    expect(isValidPath('a')).toBe(false);
    expect(isValidPath('/a/')).toBe(false);
    expect(isValidPath('/a//b')).toBe(false);
    expect(isValidPath('/a/..')).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Presets, comparison and challenges                                          */
/* -------------------------------------------------------------------------- */

describe('presets', () => {
  it('every preset is valid and runs', () => {
    expect(FS_PRESETS.length).toBeGreaterThan(0);
    for (const preset of FS_PRESETS) {
      expect(validateFsInput(preset.input)).toEqual({ valid: true });
      expect(() => runFileSystem(preset.input)).not.toThrow();
    }
  });

  it('finds a preset by id', () => {
    expect(findFsPreset('fs-indexed-large')?.input.blockCount).toBe(24);
    expect(findFsPreset('nope')).toBeUndefined();
  });
});

describe('compareFsAllocation', () => {
  it('runs every strategy and summarizes outcomes', () => {
    const outcomes = compareFsAllocation({ blockCount: 8, blockSize: 256, inodeCount: 12, operations: FRAGMENT });
    expect(outcomes.map((outcome) => outcome.strategy)).toEqual([...ALLOCATION_STRATEGIES]);

    const contiguous = outcomes.find((outcome) => outcome.strategy === 'contiguous');
    const linked = outcomes.find((outcome) => outcome.strategy === 'linked');
    const indexed = outcomes.find((outcome) => outcome.strategy === 'indexed');
    expect(contiguous?.failed).toBe(1);
    expect(linked?.failed).toBe(0);
    expect(indexed?.failed).toBe(0);
    expect(contiguous?.failures[0]).toContain('/i');
  });
});

describe('buildFsChallenges', () => {
  const challenges = buildFsChallenges();

  it('produces a stable, non-empty challenge set', () => {
    expect(challenges.length).toBe(FS_CHALLENGE_COUNT);
    expect(challenges.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every challenge a well-formed answer', () => {
    const ids = new Set<string>();
    for (const challenge of challenges) {
      expect(challenge.options.length).toBeGreaterThanOrEqual(2);
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(challenge.explanation.length).toBeGreaterThan(10);
      expect(validateFsInput(challenge.input)).toEqual({ valid: true });
      ids.add(challenge.id);
    }
    expect(ids.size).toBe(challenges.length);
  });
});
