import type { FsInput, FsStepData } from '../../fs';
import {
  compareFsAllocation,
  findFsPreset,
  formatPermissions,
  maxFileBlocks,
  runFileSystem,
  blocksForSize,
} from '../../fs';
import type { SimulationStep } from '@/types';
import type { Challenge } from '../types';
import { choiceAnswer, choiceSet, decisionAnswer, numberAnswer } from './helpers';

const TOPIC = 'file-systems';
const LAB = 'lab-file-allocation';

function presetInput(id: string): FsInput {
  const preset = findFsPreset(id);
  if (!preset) throw new Error(`missing file-system preset ${id}`);
  return preset.input;
}

function scenarioOf(id: string) {
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

function activeInode(step: SimulationStep<FsStepData> | undefined) {
  if (!step || step.data.activeInode === null) return undefined;
  return step.data.inodes.find((inode) => inode.number === step.data.activeInode);
}

/**
 * The file-system bank.
 *
 * Block counts, inode numbers, free space and pointer targets are read out of
 * the virtual file system the lab runs, so each answer can be reproduced by
 * loading the matching preset and stepping through the operation.
 */
export function fileSystemsChallenges(): Challenge[] {
  const challenges: Challenge[] = [];

  const bigInput: FsInput = {
    allocation: 'indexed',
    blockCount: 24,
    blockSize: 256,
    inodeCount: 6,
    operations: [{ kind: 'create', path: '/big', size: 4000, mode: 0o644 }],
  };
  const bigRun = runFileSystem(bigInput);
  const bigCreate = bigRun.steps.find((step) => step.data.event === 'create');
  const bigInode = activeInode(bigCreate);

  {
    const correct = blocksForSize(4000, 256);
    challenges.push({
      id: 'fs-data-blocks',
      topic: TOPIC,
      bank: 'allocation',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'With 256-byte blocks, how many data blocks does a 4000-byte file occupy?',
      scenario: 'A single file created on a volume with 256-byte blocks.',
      unit: 'blocks',
      expectedAnswer: numberAnswer(correct),
      explanation: `⌈4000 ÷ 256⌉ = ${correct} data blocks: fifteen full blocks and one partial block, which still consumes a whole block. Files are allocated in blocks, so the last block’s unused tail is internal fragmentation inside the file.`,
      relatedLab: LAB,
    });
  }

  {
    const needsIndex = (bigInode?.indexBlocks.length ?? 0) > 0;
    const correct = needsIndex ? 'Yes — one index block' : 'No';
    const { options, correctId } = choiceSet(correct, [
      'No',
      'Yes — one index block',
      'Yes — two index blocks',
    ], 0);
    challenges.push({
      id: 'fs-index-block',
      topic: TOPIC,
      bank: 'allocation',
      difficulty: 'intermediate',
      kind: 'prediction',
      question: 'Does a 16-block file need an index block?',
      scenario: `The inode has 12 direct pointers and 256-byte blocks with 4-byte pointers.`,
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation: `Direct pointers cover 12 blocks and the file needs ${blocksForSize(4000, 256)}, so the overflow lives behind a single-indirect block — one extra block reserved purely for pointers. An inode can address ${maxFileBlocks(256)} data blocks before double-indirect pointers are required, so the file consumes 17 blocks in total.`,
      relatedLab: LAB,
    });
  }

  {
    const contiguous = compareFsAllocation(scenarioOf('fs-contiguous')).find(
      (outcome) => outcome.strategy === 'contiguous',
    );
    const failed = (contiguous?.failed ?? 0) > 0;
    const correct = failed ? 'No — the free blocks are not adjacent' : 'Yes — it fits';
    const { options, correctId } = choiceSet(correct, [
      'Yes — it fits',
      'No — the free blocks are not adjacent',
      'No — the disk is completely full',
    ], 1);
    challenges.push({
      id: 'fs-contiguous-frag',
      topic: TOPIC,
      bank: 'allocation',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'The disk is full, then /b and /d are freed leaving two isolated blocks. Does a 2-block file fit under contiguous allocation?',
      scenario: 'A fragmented volume with two separate single-block holes.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'Contiguous allocation needs one unbroken run, and the two free blocks are separated by live data — external fragmentation. Two blocks are free yet no 2-block file can be placed, which is exactly why the strategy is fragile under churn.',
      relatedLab: LAB,
    });
  }

  {
    const linked = compareFsAllocation(scenarioOf('fs-contiguous')).find(
      (outcome) => outcome.strategy === 'linked',
    );
    const succeeded = (linked?.failed ?? 1) === 0;
    const correct = succeeded ? 'Yes — linked blocks need no adjacency' : 'No — there is no room';
    const { options, correctId } = choiceSet(correct, [
      'Yes — linked blocks need no adjacency',
      'No — there is no room',
      'Only after compaction',
    ], 0);
    challenges.push({
      id: 'fs-linked-frag',
      topic: TOPIC,
      bank: 'allocation',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'On the same fragmented volume, does the 2-block file fit under linked allocation?',
      scenario: 'Linked allocation over the two isolated holes.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'Linked allocation chains any free blocks with a pointer inside each one, so isolated holes are perfectly usable. It never suffers external fragmentation, but loses O(1) random access — reading block n means following n pointers.',
      relatedLab: LAB,
    });
  }

  {
    const firstMkdir = stepsOf('fs-tree').find((step) => step.data.event === 'mkdir');
    const correct = firstMkdir?.data.activeInode ?? 0;
    challenges.push({
      id: 'fs-first-inode',
      topic: TOPIC,
      bank: 'inodes',
      difficulty: 'beginner',
      kind: 'numerical',
      question: 'Which inode number does the first directory created receive?',
      scenario: 'The "Directories, rename and move" preset creates /home first.',
      unit: 'inode',
      expectedAnswer: numberAnswer(correct),
      explanation: `Inode 0 is reserved for the root directory, so the first entry created takes inode ${correct}. Inodes are handed out from a free list in ascending order and returned to it when a file is deleted.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = formatPermissions(0o640);
    const { options, correctId } = choiceSet(correct, ['rw-r--r--', 'rwxr-xr-x', 'rw-------'], 2);
    challenges.push({
      id: 'fs-permissions-rw',
      topic: TOPIC,
      bank: 'inodes',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'What do the permission bits 640 mean in symbols?',
      scenario: 'A file created with mode 640.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        '6 = read + write for the owner, 4 = read for the group, 0 = nothing for everyone else, giving rw-r-----. Permissions are stored in the inode, three bits per class, and changing them moves no data blocks.',
      relatedLab: LAB,
    });
  }

  {
    const free = runFileSystem(presetInput('fs-contiguous')).summary.freeBlocks ?? 0;
    challenges.push({
      id: 'fs-free-blocks',
      topic: TOPIC,
      bank: 'space',
      difficulty: 'intermediate',
      kind: 'numerical',
      question: 'After the "Contiguous — fragmentation" script runs to completion, how many blocks are free?',
      scenario: 'The disk is filled, two holes are punched, then more files are deleted and a 2-block file is added.',
      unit: 'blocks',
      expectedAnswer: numberAnswer(free),
      explanation: `The script frees more files and reuses part of the space, settling with ${free} free block${free === 1 ? '' : 's'}. The free-space bitmap tracks exactly which blocks are in use, which is what lets the allocator find a run.`,
      relatedLab: LAB,
    });
  }

  {
    const successes = stepsOf('fs-inode-limit').filter(
      (step) => step.data.success === true && step.data.event === 'create',
    ).length;
    challenges.push({
      id: 'fs-inode-capacity',
      topic: TOPIC,
      bank: 'inodes',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'A volume has a 5-entry inode table. How many files can it hold?',
      scenario: 'The root directory also needs an inode.',
      unit: 'files',
      expectedAnswer: numberAnswer(successes),
      explanation: `One inode is reserved for the root, leaving ${successes} for files — the fifth create is refused even though plenty of blocks are free. A disk can run out of inodes before it runs out of space, which is why mkfs picks the inode count deliberately.`,
      relatedLab: LAB,
    });
  }

  {
    const correct = 'It is refused — the directory is not empty';
    const { options, correctId } = choiceSet(correct, [
      'The directory and its contents are deleted',
      'The directory is deleted and its children are orphaned',
    ], 0);
    challenges.push({
      id: 'fs-delete-nonempty',
      topic: TOPIC,
      bank: 'behaviour',
      difficulty: 'intermediate',
      kind: 'decision',
      question: 'What does this model do when asked to delete a directory that still contains entries?',
      scenario: 'A delete operation targets a non-empty directory.',
      options,
      expectedAnswer: decisionAnswer(correctId),
      explanation:
        'Removing a non-empty directory would detach its children from the tree, so the operation is refused and the caller must empty it first. The same rule catches deleting an open file.',
      relatedLab: LAB,
    });
  }

  {
    const correct = 'Only directory entries change — the inode and its blocks are untouched';
    const { options, correctId } = choiceSet(correct, [
      'The file’s data blocks are copied to the new location',
      'The inode is reallocated and the file rewritten',
    ], 0);
    challenges.push({
      id: 'fs-rename-cost',
      topic: TOPIC,
      bank: 'behaviour',
      difficulty: 'intermediate',
      kind: 'multiple-choice',
      question: 'When a file is renamed or moved, what actually changes?',
      scenario: 'The same volume, a rename then a move of one file.',
      options,
      expectedAnswer: choiceAnswer(correctId),
      explanation:
        'A name lives in a directory entry, not in the inode. Renaming or moving edits those entries only, so the inode number, size, permissions and data blocks are all preserved — which is why those operations are instant no matter how large the file is.',
      relatedLab: LAB,
    });
  }

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
    const inode = activeInode(growStep);
    const correct = inode?.dataBlocks[1] ?? 0;
    challenges.push({
      id: 'fs-predict-block',
      topic: TOPIC,
      bank: 'allocation',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'Under linked allocation, when /a grows to two blocks, which block does it receive?',
      scenario: '/a holds block 0, /b holds block 1, and /a is grown to 512 bytes.',
      unit: 'block',
      expectedAnswer: numberAnswer(correct),
      explanation: `Linked allocation takes the lowest-numbered free block regardless of adjacency, so /a grows into block ${correct}. Under contiguous allocation the same grow is refused because it needs block 1, which /b holds — the same request, a different verdict, purely because of the allocation strategy.`,
      relatedLab: LAB,
    });
  }

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
    challenges.push({
      id: 'fs-fragmentation-runs',
      topic: TOPIC,
      bank: 'space',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'After four alternating files are deleted, how many separate free runs (holes) does the volume have?',
      scenario: '/b, /d, /f and /h are deleted from an otherwise full 12-block disk.',
      unit: 'free runs',
      expectedAnswer: numberAnswer(correct),
      explanation: `Each deleted file leaves an isolated single-block hole, and the untouched tail is one long run: ${correct} free runs in total, the largest ${run.summary.largestFreeRun} blocks. A contiguous request for two blocks can use the tail but not the scattered singles — external fragmentation, measured directly.`,
      relatedLab: LAB,
    });
  }

  {
    const run = runFileSystem(presetInput('fs-linked'));
    const last = run.steps[run.steps.length - 1]?.data;
    const correct = last?.blocks.find((block) => block.index === 1)?.next ?? 0;
    challenges.push({
      id: 'fs-pointer-follow',
      topic: TOPIC,
      bank: 'pointers',
      difficulty: 'advanced',
      kind: 'numerical',
      question: 'A linked file lives in blocks 1 and 3, with block 2 owned by another file. Where does block 1’s next pointer lead?',
      scenario: 'The "Linked — grows anywhere" preset after the script completes.',
      unit: 'block',
      expectedAnswer: numberAnswer(correct),
      explanation: `A linked file chains its blocks with a pointer stored inside each one, so the chain jumps straight over the block-2 hole: block 1 points to block ${correct}. That is why linked allocation never cares about adjacency — and why reading a block costs one pointer follow per preceding block.`,
      relatedLab: LAB,
    });
  }

  return challenges;
}
