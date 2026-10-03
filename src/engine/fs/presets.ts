import type { FsInput, FsOperation } from './types';

export interface FsPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: FsInput;
}

/** Eight single-block files that together fill an eight-block disk. */
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

/**
 * The fragmentation script: fill the disk, punch two isolated holes, then ask
 * for two *adjacent* blocks. Contiguous allocation fails while linked and
 * indexed allocation succeed — the clearest possible statement of what external
 * fragmentation means.
 */
const FRAGMENT: FsOperation[] = [
  ...FILL,
  { kind: 'delete', path: '/b' },
  { kind: 'delete', path: '/d' },
  { kind: 'create', path: '/i', size: 512, mode: 0o644 },
  { kind: 'delete', path: '/c' },
  { kind: 'delete', path: '/e' },
  { kind: 'create', path: '/j', size: 512, mode: 0o644 },
];

const SMALL_VOLUME = { blockCount: 8, blockSize: 256, inodeCount: 12 } as const;

export const FS_PRESETS: readonly FsPreset[] = [
  {
    id: 'fs-contiguous',
    name: 'Contiguous — fragmentation',
    description: 'Two isolated holes cannot satisfy a two-block file; freeing more repairs it.',
    input: { allocation: 'contiguous', ...SMALL_VOLUME, operations: FRAGMENT },
  },
  {
    id: 'fs-linked',
    name: 'Linked — grows anywhere',
    description: 'The same script succeeds: linked blocks need no adjacency.',
    input: { allocation: 'linked', ...SMALL_VOLUME, operations: FRAGMENT },
  },
  {
    id: 'fs-indexed',
    name: 'Indexed — pointers in the inode',
    description: 'Also succeeds, and the inode records every block pointer directly.',
    input: { allocation: 'indexed', ...SMALL_VOLUME, operations: FRAGMENT },
  },
  {
    id: 'fs-indexed-large',
    name: 'Indexed — the index block',
    description: 'A file larger than twelve blocks needs an extra block just to hold pointers.',
    input: {
      allocation: 'indexed',
      blockCount: 24,
      blockSize: 256,
      inodeCount: 6,
      operations: [
        { kind: 'mkdir', path: '/data' },
        { kind: 'create', path: '/data/big', size: 4000, mode: 0o644 },
        { kind: 'create', path: '/data/small', size: 200, mode: 0o644 },
      ],
    },
  },
  {
    id: 'fs-tree',
    name: 'Directories, rename and move',
    description: 'Build a tree, then rename and move entries without touching their inodes.',
    input: {
      allocation: 'indexed',
      blockCount: 24,
      blockSize: 256,
      inodeCount: 12,
      operations: [
        { kind: 'mkdir', path: '/home' },
        { kind: 'mkdir', path: '/home/user' },
        { kind: 'mkdir', path: '/home/user/docs' },
        { kind: 'create', path: '/home/user/readme.txt', size: 300, mode: 0o644 },
        { kind: 'open', path: '/home/user/readme.txt' },
        { kind: 'close', path: '/home/user/readme.txt' },
        { kind: 'rename', path: '/home/user/readme.txt', name: 'readme.md' },
        { kind: 'move', path: '/home/user/docs', to: '/home' },
        { kind: 'create', path: '/home/docs/notes.txt', size: 500, mode: 0o644 },
      ],
    },
  },
  {
    id: 'fs-permissions',
    name: 'Permissions as metadata',
    description: 'Mode bits live in the inode; changing them moves no data blocks.',
    input: {
      allocation: 'indexed',
      blockCount: 16,
      blockSize: 256,
      inodeCount: 8,
      operations: [
        { kind: 'create', path: '/secret.txt', size: 100, mode: 0o600 },
        { kind: 'create', path: '/public.txt', size: 100, mode: 0o644 },
        { kind: 'mkdir', path: '/bin' },
        { kind: 'chmod', path: '/bin', mode: 0o755 },
        { kind: 'chmod', path: '/secret.txt', mode: 0o640 },
      ],
    },
  },
  {
    id: 'fs-inode-limit',
    name: 'Running out of inodes',
    description: 'A small inode table fills before the disk does, and create is refused.',
    input: {
      allocation: 'indexed',
      blockCount: 32,
      blockSize: 256,
      inodeCount: 5,
      operations: [
        { kind: 'create', path: '/one', size: 100, mode: 0o644 },
        { kind: 'create', path: '/two', size: 100, mode: 0o644 },
        { kind: 'create', path: '/three', size: 100, mode: 0o644 },
        { kind: 'create', path: '/four', size: 100, mode: 0o644 },
        { kind: 'create', path: '/five', size: 100, mode: 0o644 },
      ],
    },
  },
  {
    id: 'fs-grow-blocked',
    name: 'Growing into a taken block',
    description:
      'A file needs the block directly after it, but a neighbour holds it — contiguous growth fails where linked and indexed allocation succeed.',
    input: {
      allocation: 'contiguous',
      blockCount: 8,
      blockSize: 256,
      inodeCount: 8,
      operations: [
        { kind: 'create', path: '/a', size: 256, mode: 0o644 },
        { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        { kind: 'grow', path: '/a', size: 512 },
      ],
    },
  },
  {
    id: 'fs-grow-in-place',
    name: 'Growing in place',
    description: 'A file extends straight into the free blocks that follow it — contiguous growth at its best.',
    input: {
      allocation: 'contiguous',
      blockCount: 8,
      blockSize: 256,
      inodeCount: 8,
      operations: [
        { kind: 'create', path: '/a', size: 512, mode: 0o644 },
        { kind: 'create', path: '/b', size: 256, mode: 0o644 },
        { kind: 'delete', path: '/b' },
        { kind: 'grow', path: '/a', size: 768 },
      ],
    },
  },
  {
    id: 'fs-shrink-reuse',
    name: 'Shrinking frees blocks',
    description: 'Truncating a file returns its trailing blocks to the bitmap, where the next file can reuse them.',
    input: {
      allocation: 'contiguous',
      blockCount: 8,
      blockSize: 256,
      inodeCount: 8,
      operations: [
        { kind: 'create', path: '/big', size: 1024, mode: 0o644 },
        { kind: 'shrink', path: '/big', size: 256 },
        { kind: 'create', path: '/small', size: 512, mode: 0o644 },
      ],
    },
  },
  {
    id: 'fs-reuse',
    name: 'Delete frees and reuse',
    description: 'Deleting returns blocks to the bitmap and the inode to the free list.',
    input: {
      allocation: 'linked',
      blockCount: 16,
      blockSize: 256,
      inodeCount: 6,
      operations: [
        { kind: 'create', path: '/log.txt', size: 800, mode: 0o644 },
        { kind: 'create', path: '/tmp.bin', size: 1200, mode: 0o600 },
        { kind: 'delete', path: '/tmp.bin' },
        { kind: 'create', path: '/cache.db', size: 600, mode: 0o644 },
      ],
    },
  },
];

export function findFsPreset(id: string): FsPreset | undefined {
  return FS_PRESETS.find((preset) => preset.id === id);
}
