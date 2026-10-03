/**
 * Types shared by the in-memory file-system simulation.
 *
 * Nothing here touches the real filesystem: the engine is a self-contained
 * model of a disk with a fixed block count, a fixed inode table, a directory
 * tree and a scripted list of operations. Every operation mutates that model and
 * produces a snapshot, so a session can be stepped through, replayed and tested.
 */

export type AllocationStrategy = 'contiguous' | 'linked' | 'indexed';
export type FsNodeType = 'dir' | 'file';

export type FsEvent =
  | 'init'
  | 'mkdir'
  | 'create'
  | 'delete'
  | 'rename'
  | 'move'
  | 'open'
  | 'close'
  | 'chmod'
  | 'grow'
  | 'shrink'
  | 'failed';

export interface FsMkdirOperation {
  readonly kind: 'mkdir';
  readonly path: string;
}

export interface FsCreateOperation {
  readonly kind: 'create';
  readonly path: string;
  /** File size in bytes. */
  readonly size: number;
  /** Permission bits, 0..0o777. */
  readonly mode: number;
}

export interface FsDeleteOperation {
  readonly kind: 'delete';
  readonly path: string;
}

export interface FsRenameOperation {
  readonly kind: 'rename';
  readonly path: string;
  /** New simple name within the same directory. */
  readonly name: string;
}

export interface FsMoveOperation {
  readonly kind: 'move';
  readonly path: string;
  /** Destination directory path. */
  readonly to: string;
}

export interface FsOpenOperation {
  readonly kind: 'open';
  readonly path: string;
}

export interface FsCloseOperation {
  readonly kind: 'close';
  readonly path: string;
}

export interface FsChmodOperation {
  readonly kind: 'chmod';
  readonly path: string;
  readonly mode: number;
}

/** Append to a file until it reaches `size` bytes. */
export interface FsGrowOperation {
  readonly kind: 'grow';
  readonly path: string;
  /** The new, larger size in bytes. */
  readonly size: number;
}

/** Truncate a file down to `size` bytes. */
export interface FsShrinkOperation {
  readonly kind: 'shrink';
  readonly path: string;
  /** The new, smaller size in bytes. */
  readonly size: number;
}

export type FsOperation =
  | FsMkdirOperation
  | FsCreateOperation
  | FsDeleteOperation
  | FsRenameOperation
  | FsMoveOperation
  | FsOpenOperation
  | FsCloseOperation
  | FsChmodOperation
  | FsGrowOperation
  | FsShrinkOperation;

export interface FsInput {
  readonly allocation: AllocationStrategy;
  /** Total disk blocks. */
  readonly blockCount: number;
  /** Bytes per block. */
  readonly blockSize: number;
  /** Size of the fixed inode table. */
  readonly inodeCount: number;
  readonly operations: readonly FsOperation[];
}

/* -------------------------------------------------------------------------- */
/* Rendered views                                                              */
/* -------------------------------------------------------------------------- */

export interface FsNodeView {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly type: FsNodeType;
  readonly parentId: string | null;
  /** Nesting depth, for indented rendering. */
  readonly depth: number;
  readonly inode: number | null;
  readonly size: number;
  readonly mode: number;
  readonly permissions: string;
  readonly open: boolean;
  readonly blockCount: number;
  readonly active: boolean;
}

export interface FsInodeView {
  readonly number: number;
  readonly used: boolean;
  readonly type: FsNodeType | null;
  readonly path: string | null;
  readonly size: number;
  readonly mode: number;
  readonly permissions: string;
  /** Directory entries, or 1 for a file. */
  readonly links: number;
  readonly openCount: number;
  /** First data block (contiguous and linked allocation). */
  readonly start: number | null;
  /** Direct block pointers (indexed allocation). */
  readonly direct: readonly (number | null)[];
  /** Single-indirect index block (indexed allocation). */
  readonly indirect: number | null;
  /** Data blocks in file order. */
  readonly dataBlocks: readonly number[];
  /** Index blocks that hold pointers rather than data. */
  readonly indexBlocks: readonly number[];
  readonly created: number;
  readonly modified: number;
  readonly accessed: number;
  readonly active: boolean;
}

export type FsBlockState = 'free' | 'data' | 'index';

export interface FsBlockView {
  readonly index: number;
  readonly state: FsBlockState;
  readonly ownerPath: string | null;
  readonly ownerName: string | null;
  /** Inode that owns this block, or null when the block is free. */
  readonly ownerInode: number | null;
  /** Position of this block within its file, or null for a free/index block. */
  readonly fileIndex: number | null;
  /** Next block in a linked chain, or null. */
  readonly next: number | null;
  readonly active: boolean;
}

/** A maximal run of adjacent free blocks. */
export interface FsFreeRunView {
  readonly start: number;
  readonly length: number;
}

export interface FsStepData {
  readonly kind: 'fs';
  readonly allocation: AllocationStrategy;
  readonly event: FsEvent;
  /** Human label of the operation this step came from. */
  readonly operation: string;
  readonly success: boolean | null;
  readonly reason: string;
  readonly blockSize: number;
  readonly blockCount: number;
  readonly nodes: readonly FsNodeView[];
  readonly inodes: readonly FsInodeView[];
  readonly blocks: readonly FsBlockView[];
  readonly openFiles: readonly string[];
  readonly activePath: string | null;
  readonly activeInode: number | null;
  readonly activeBlocks: readonly number[];
  readonly usedBlocks: number;
  readonly freeBlocks: number;
  readonly usedInodes: number;
  readonly freeInodes: number;
  /** Maximal runs of adjacent free blocks, in address order. */
  readonly freeRuns: readonly FsFreeRunView[];
  /** Length of the longest free run — what a contiguous request can actually use. */
  readonly largestFreeRun: number;
  /** 0 when free space is one unbroken run, rising toward 1 as it scatters. */
  readonly externalFragmentation: number;
  /** Bytes currently held in used blocks. */
  readonly usedBytes: number;
  /** Total addressable bytes on the volume. */
  readonly capacityBytes: number;
  readonly summary: string;
}

export const ALLOCATION_STRATEGIES: readonly AllocationStrategy[] = ['contiguous', 'linked', 'indexed'];

export const ALLOCATION_LABELS: Readonly<Record<AllocationStrategy, string>> = {
  contiguous: 'Contiguous',
  linked: 'Linked',
  indexed: 'Indexed',
};

/** Content/registry algorithm ids, one per strategy. */
export const ALLOCATION_ALGORITHM_IDS: Readonly<Record<AllocationStrategy, string>> = {
  contiguous: 'contiguous-allocation',
  linked: 'linked-allocation',
  indexed: 'indexed-allocation',
};

/** A pointer costs four bytes. */
export const POINTER_SIZE = 4;
/** Classic inode direct-pointer count. */
export const DIRECT_BLOCKS = 12;

export const MIN_BLOCK_COUNT = 8;
export const MAX_BLOCK_COUNT = 128;
export const BLOCK_SIZES: readonly number[] = [64, 128, 256, 512, 1024, 4096];
export const MIN_BLOCK_SIZE = 64;
export const MAX_BLOCK_SIZE = 4096;
export const MIN_INODES = 4;
export const MAX_INODES = 32;
export const MIN_FILE_SIZE = 1;
export const MAX_OPERATIONS = 40;
/** Hard cap on produced steps, well above anything the editor can build. */
export const MAX_FS_STEPS = 240;

export const MIN_MODE = 0;
export const MAX_MODE = 0o777;

export const FS_ENGINE_ID = 'file-system-engine';
export const FS_LAB_ID = 'lab-file-allocation';

/** Format permission bits as `rwxr-xr-x`. */
export function formatPermissions(mode: number): string {
  const bits = (value: number, shift: number): string =>
    `${value & (4 << shift) ? 'r' : '-'}${value & (2 << shift) ? 'w' : '-'}${value & (1 << shift) ? 'x' : '-'}`;
  return `${bits(mode, 6)}${bits(mode, 3)}${bits(mode, 0)}`;
}

/** Format permission bits as `755`. */
export function formatOctal(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, '0');
}
