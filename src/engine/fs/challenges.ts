import type { FsInput, FsStepData } from './types';
import { MAX_MODE, MIN_MODE, formatPermissions } from './types';
import { FS_PRESETS, findFsPreset } from './presets';
import { runFileSystem, blocksForSize, maxFileBlocks } from './fileSystem';
import { compareFsAllocation, type FsScenario } from './comparison';
import type { SimulationStep } from '@/types';

export type FsChallengeKind =
  | 'blocks'
  | 'allocation'
  | 'inode'
  | 'permissions'
  | 'space'
  | 'behaviour'
  | 'fragmentation'
  | 'pointer';

export interface FsChallenge {
  readonly id: string;
  readonly kind: FsChallengeKind;
  readonly title: string;
  readonly prompt: string;
  /** The volume and script the question is about; the panel can replay it. */
  readonly input: FsInput;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

function presetInput(id: string): FsInput {
  const preset = findFsPreset(id);
  if (!preset) throw new Error(`missing file-system preset ${id}`);
  return preset.input;
}

function scenarioOf(id: string): FsScenario {
  const input = presetInput(id);
  return {
    blockCount: input.blockCount,
    blockSize: input.blockSize,
    inodeCount: input.inodeCount,
    operations: input.operations,
  };
}

function stepsOf(id: string): readonly SimulationStep<FsStepData>[] {
  return runFileSystem(presetInput(id)).steps;
}

function inodeView(step: SimulationStep<FsStepData> | undefined) {
  if (!step || step.data.activeInode === null) return undefined;
  return step.data.inodes.find((inode) => inode.number === step.data.activeInode);
}

function numericOptions(
  correct: number,
  candidates: readonly number[],
): { options: string[]; correctIndex: number } {
  const values = [...new Set([correct, ...candidates.filter((value) => value >= 0)])].sort((a, b) => a - b);
  return { options: values.map(String), correctIndex: values.indexOf(correct) };
}

function choiceOptions(
  correct: string,
  choices: readonly string[],
): { options: string[]; correctIndex: number } {
  const options = [...new Set([correct, ...choices])];
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * The file-system challenge set.
 *
 * Numeric and policy answers are read out of the engine's own run, so a learner
 * can reproduce every one by loading the matching preset and stepping through.
 */
export function buildFsChallenges(): FsChallenge[] {
  const challenges: FsChallenge[] = [];

  // A small scenario used to answer the allocation arithmetic questions.
  const bigInput: FsInput = {
    allocation: 'indexed',
    blockCount: 24,
    blockSize: 256,
    inodeCount: 6,
    operations: [{ kind: 'create', path: '/big', size: 4000, mode: 0o644 }],
  };
  const bigRun = runFileSystem(bigInput);
  const bigCreate = bigRun.steps.find((step) => step.data.event === 'create');
  const bigInode = inodeView(bigCreate);

  // 1 — data blocks for a size.
  {
    const correct = blocksForSize(4000, 256);
    const { options, correctIndex } = numericOptions(correct, [correct - 4, correct + 1, correct + 8]);
    challenges.push({
      id: 'fs-data-blocks',
      kind: 'blocks',
      title: 'Blocks for a 4000-byte file',
      prompt: 'With 256-byte blocks, how many data blocks does a 4000-byte file occupy?',
      input: bigInput,
      options,
      correctIndex,
      explanation:
        'The file needs ⌈4000 ÷ 256⌉ = 16 data blocks: fifteen full blocks and one partial block, which still consumes a whole block.',
    });
  }

  // 2 — does the file need an index block?
  {
    const needsIndex = (bigInode?.indexBlocks.length ?? 0) > 0;
    const { options, correctIndex } = choiceOptions(needsIndex ? 'Yes — one index block' : 'No', [
      'No',
      'Yes — one index block',
      'Yes — two index blocks',
    ]);
    challenges.push({
      id: 'fs-index-block',
      kind: 'allocation',
      title: 'Does it need an index block?',
      prompt:
        'The inode has 12 direct pointers and 256-byte blocks (4-byte pointers). Does a 16-block file need an index block?',
      input: bigInput,
      options,
      correctIndex,
      explanation: `Direct pointers cover 12 blocks, and the file needs 16, so the remaining blocks live behind a single-indirect block. One extra block is reserved purely for pointers, so the file consumes 17 blocks in total. An inode can address ${maxFileBlocks(
        256,
      )} data blocks before double-indirect pointers are needed.`,
    });
  }

  // 3 — contiguous allocation on a fragmented disk.
  {
    const outcomes = compareFsAllocation(scenarioOf('fs-contiguous'));
    const contiguous = outcomes.find((outcome) => outcome.strategy === 'contiguous');
    const failed = (contiguous?.failed ?? 0) > 0;
    const { options, correctIndex } = choiceOptions(
      failed ? 'No — the two free blocks are not adjacent' : 'Yes — it fits',
      ['Yes — it fits', 'No — the two free blocks are not adjacent', 'No — the disk is completely full'],
    );
    challenges.push({
      id: 'fs-contiguous-frag',
      kind: 'allocation',
      title: 'Contiguous allocation after deletions',
      prompt:
        'The disk is full, then /b and /d are deleted leaving blocks 1 and 3 free. Does a 2-block file fit under contiguous allocation?',
      input: presetInput('fs-contiguous'),
      options,
      correctIndex,
      explanation:
        'Contiguous allocation needs one unbroken run, and the two free blocks are separated by live data — external fragmentation. Two blocks are free, yet no two-block file can be placed. Freeing an intervening file joins the holes and the request then succeeds.',
    });
  }

  // 4 — linked allocation on the same disk.
  {
    const outcomes = compareFsAllocation(scenarioOf('fs-contiguous'));
    const linked = outcomes.find((outcome) => outcome.strategy === 'linked');
    const succeeded = (linked?.failed ?? 1) === 0;
    const { options, correctIndex } = choiceOptions(
      succeeded ? 'Yes — linked blocks need no adjacency' : 'No — there is no room',
      ['Yes — linked blocks need no adjacency', 'No — there is no room', 'Only after compaction'],
    );
    challenges.push({
      id: 'fs-linked-frag',
      kind: 'allocation',
      title: 'Linked allocation on the same disk',
      prompt: 'With the same two isolated holes, does the 2-block file fit under linked allocation?',
      input: presetInput('fs-linked'),
      options,
      correctIndex,
      explanation:
        'Linked allocation chains any free blocks together with a pointer in each one, so isolated holes are perfectly usable. It never suffers external fragmentation — at the cost of random-access reads, which must follow the chain.',
    });
  }

  // 5 — inode number of the first directory created.
  {
    const firstMkdir = stepsOf('fs-tree').find((step) => step.data.event === 'mkdir');
    const correct = firstMkdir?.data.activeInode ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct + 2, correct + 3]);
    challenges.push({
      id: 'fs-first-inode',
      kind: 'inode',
      title: 'Which inode?',
      prompt:
        'In the "Directories, rename and move" preset, which inode number does the first directory created receive?',
      input: presetInput('fs-tree'),
      options,
      correctIndex,
      explanation:
        'Inode 0 is reserved for the root directory, so the next entry created takes inode 1. Inodes are handed out from the free list in ascending order, and returned to it when a file is deleted.',
    });
  }

  // 6 — permission string.
  {
    const mode = 0o640;
    const { options, correctIndex } = choiceOptions(formatPermissions(mode), [
      'rw-r--r--',
      'rwxr-xr-x',
      'rw-------',
    ]);
    challenges.push({
      id: 'fs-permissions-rw',
      kind: 'permissions',
      title: 'Reading a mode',
      prompt: 'What do the permission bits 640 mean in symbols?',
      input: presetInput('fs-permissions'),
      options,
      correctIndex,
      explanation:
        '6 = read + write for the owner, 4 = read for the group, 0 = nothing for everyone else: rw-r-----. Permissions are stored in the inode, split three bits per class.',
    });
  }

  // 7 — free blocks after the script.
  {
    const free = runFileSystem(presetInput('fs-contiguous')).summary.freeBlocks ?? 0;
    const { options, correctIndex } = numericOptions(free, [free + 1, free + 2, Math.max(0, free - 1)]);
    challenges.push({
      id: 'fs-free-blocks',
      kind: 'space',
      title: 'Free space at the end',
      prompt: 'After the "Contiguous — fragmentation" script runs to completion, how many blocks are free?',
      input: presetInput('fs-contiguous'),
      options,
      correctIndex,
      explanation:
        'The final script frees two more files and then creates a 2-block file, so the bitmap settles with the freed space partly reused. Step to the end and read the free-space bitmap to check.',
    });
  }

  // 8 — inode capacity.
  {
    const successes = stepsOf('fs-inode-limit').filter(
      (step) => step.data.success === true && step.data.event === 'create',
    ).length;
    const { options, correctIndex } = numericOptions(successes, [successes + 1, successes + 2, successes - 1]);
    challenges.push({
      id: 'fs-inode-capacity',
      kind: 'inode',
      title: 'Files an inode table holds',
      prompt:
        'The "Running out of inodes" volume has a 5-entry inode table. How many files can it hold, given the root directory also needs an inode?',
      input: presetInput('fs-inode-limit'),
      options,
      correctIndex,
      explanation:
        'One inode is reserved for the root, leaving four for files. The fifth create is refused even though plenty of blocks are free — a disk can run out of inodes before it runs out of space.',
    });
  }

  // 9 — deleting a non-empty directory.
  {
    const { options, correctIndex } = choiceOptions('It is refused — the directory is not empty', [
      'The directory and its contents are deleted',
      'The directory is deleted but its children are orphaned',
    ]);
    challenges.push({
      id: 'fs-delete-nonempty',
      kind: 'behaviour',
      title: 'Deleting a non-empty directory',
      prompt: 'What does this model do when asked to delete a directory that still contains entries?',
      input: presetInput('fs-tree'),
      options,
      correctIndex,
      explanation:
        'Removing a non-empty directory would detach its children from the tree, so most file systems refuse and make the caller empty it first. The same rule catches a file that is still open.',
    });
  }

  // 10 — what rename and move cost.
  {
    const { options, correctIndex } = choiceOptions('Only directory entries change — the inode and its blocks are untouched', [
      'The file’s data blocks are copied to the new location',
      'The inode is reallocated and the file is rewritten',
    ]);
    challenges.push({
      id: 'fs-rename-cost',
      kind: 'behaviour',
      title: 'The cost of rename and move',
      prompt: 'When a file is renamed or moved within the volume, what actually changes?',
      input: presetInput('fs-tree'),
      options,
      correctIndex,
      explanation:
        'A name lives in a directory entry, not in the inode. Renaming or moving edits those entries only, so the inode number, size, permissions, timestamps and data blocks are all preserved — which is why such operations are instant regardless of file size.',
    });
  }

  // 11 — predict which block a grow will receive.
  {
    const input: FsInput = {
      allocation: 'linked',
      blockCount: 8,
      blockSize: 256,
      inodeCount: 8,
      operations: [
        { kind: 'create', path: '/a', size: 256, mode: 0o644 },
        { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        { kind: 'grow', path: '/a', size: 512 },
      ],
    };
    const run = runFileSystem(input);
    const growStep = run.steps.find((step) => step.data.event === 'grow');
    const inode = growStep ? inodeView(growStep) : undefined;
    const correct = inode?.dataBlocks[1] ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct - 1, correct + 2]);
    challenges.push({
      id: 'fs-predict-block',
      kind: 'blocks',
      title: 'Which block will grow take?',
      prompt:
        'Under linked allocation /a holds block 0 and /b holds block 1. When /a grows to 512 bytes, which block does it receive?',
      input,
      options,
      correctIndex,
      explanation:
        'Linked allocation takes the lowest-numbered free block regardless of adjacency, so /a grows into block 2. Under contiguous allocation this exact grow would be refused: it needs block 1, which /b holds — external fragmentation in action.',
    });
  }

  // 12 — predict how fragmentation changes.
  {
    const fragInput: FsInput = {
      allocation: 'contiguous',
      blockCount: 12,
      blockSize: 256,
      inodeCount: 10,
      operations: [
        { kind: 'create', path: '/a', size: 256, mode: 0o644 },
        { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        { kind: 'create', path: '/c', size: 256, mode: 0o644 },
        { kind: 'create', path: '/d', size: 256, mode: 0o644 },
        { kind: 'create', path: '/e', size: 256, mode: 0o644 },
        { kind: 'create', path: '/f', size: 256, mode: 0o644 },
        { kind: 'create', path: '/g', size: 256, mode: 0o644 },
        { kind: 'create', path: '/h', size: 256, mode: 0o644 },
        { kind: 'delete', path: '/b' },
        { kind: 'delete', path: '/d' },
        { kind: 'delete', path: '/f' },
        { kind: 'delete', path: '/h' },
      ],
    };
    const run = runFileSystem(fragInput);
    const correct = run.summary.freeRuns ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct - 1, correct + 1, correct + 2]);
    challenges.push({
      id: 'fs-fragmentation-runs',
      kind: 'fragmentation',
      title: 'How many holes?',
      prompt:
        'After /b, /d, /f and /h are deleted, how many separate free runs (holes) does the volume have?',
      input: fragInput,
      options,
      correctIndex,
      explanation: `Each deleted file leaves an isolated single-block hole, and the untouched tail is one long run: ${correct} free runs in total, the largest ${run.summary.largestFreeRun} blocks. A contiguous request for two blocks can use the tail but not the scattered singles, even though more than two blocks are free — external fragmentation.`,
    });
  }

  // 13 — predict which block a pointer leads to.
  {
    const input = presetInput('fs-linked');
    const run = runFileSystem(input);
    const last = run.steps[run.steps.length - 1]?.data;
    const correct = last?.blocks.find((block) => block.index === 1)?.next ?? 0;
    const { options, correctIndex } = numericOptions(correct, [correct + 1, correct - 1, correct + 2]);
    challenges.push({
      id: 'fs-pointer-follow',
      kind: 'pointer',
      title: 'Follow the chain through a hole',
      prompt:
        'Under linked allocation /i lives in blocks 1 and 3; block 2 belongs to another file. Which block does block 1’s next pointer lead to?',
      input,
      options,
      correctIndex,
      explanation:
        'A linked file chains its blocks by a pointer stored inside each one, so the chain happily jumps the block-2 hole: block 1 points straight to block 3. Reading block 3 still costs two pointer follows, which is why linked allocation gives up O(1) random access.',
    });
  }

  return challenges;
}

/** Clamp helper kept close to the challenges so the mode range stays in one place. */
export const FS_MODE_RANGE = { min: MIN_MODE, max: MAX_MODE } as const;

/** The presets the challenge panel draws on, exported for tests. */
export const FS_PRESET_IDS = FS_PRESETS.map((preset) => preset.id);

/** Stable count used by tests and the UI's progress copy. */
export const FS_CHALLENGE_COUNT = buildFsChallenges().length;
