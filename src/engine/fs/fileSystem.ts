import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  AllocationStrategy,
  FsBlockView,
  FsEvent,
  FsFreeRunView,
  FsInput,
  FsInodeView,
  FsNodeType,
  FsNodeView,
  FsOperation,
  FsStepData,
} from './types';
import {
  ALLOCATION_ALGORITHM_IDS,
  ALLOCATION_LABELS,
  ALLOCATION_STRATEGIES,
  BLOCK_SIZES,
  DIRECT_BLOCKS,
  FS_ENGINE_ID,
  FS_LAB_ID,
  MAX_BLOCK_COUNT,
  MAX_INODES,
  MAX_MODE,
  MAX_OPERATIONS,
  MIN_BLOCK_COUNT,
  MIN_FILE_SIZE,
  MIN_INODES,
  MIN_MODE,
  POINTER_SIZE,
  formatPermissions,
} from './types';

export const FILE_SYSTEM_ALGORITHM_ID = 'linked-allocation';

const ROOT_ID = 'root';
const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Data blocks one inode can address: direct pointers plus one single indirect block. */
export function maxFileBlocks(blockSize: number): number {
  return DIRECT_BLOCKS + Math.floor(blockSize / POINTER_SIZE);
}

export function blocksForSize(size: number, blockSize: number): number {
  return Math.ceil(size / blockSize);
}

function isValidName(name: string): boolean {
  return name.length > 0 && name.length <= 32 && NAME_PATTERN.test(name) && name !== '.' && name !== '..';
}

export function isValidPath(path: string): boolean {
  if (path === '/') return true;
  if (!path.startsWith('/')) return false;
  if (path.endsWith('/')) return false;
  const segments = path.slice(1).split('/');
  return segments.every(isValidName);
}

function isValidMoveTarget(path: string): boolean {
  return path === '/' || isValidPath(path);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export function validateFsInput(input: FsInput): ValidationResult {
  const collector = new ValidationCollector();

  collector.addIf(
    !ALLOCATION_STRATEGIES.includes(input.allocation),
    'allocation',
    `allocation must be one of ${ALLOCATION_STRATEGIES.join(', ')}`,
  );
  collector.addIf(
    !Number.isInteger(input.blockCount) || input.blockCount < MIN_BLOCK_COUNT || input.blockCount > MAX_BLOCK_COUNT,
    'blockCount',
    `blockCount must be an integer between ${MIN_BLOCK_COUNT} and ${MAX_BLOCK_COUNT}`,
  );
  collector.addIf(
    !BLOCK_SIZES.includes(input.blockSize),
    'blockSize',
    `blockSize must be one of ${BLOCK_SIZES.join(', ')}`,
  );
  collector.addIf(
    !Number.isInteger(input.inodeCount) || input.inodeCount < MIN_INODES || input.inodeCount > MAX_INODES,
    'inodeCount',
    `inodeCount must be an integer between ${MIN_INODES} and ${MAX_INODES}`,
  );
  collector.addIf(
    input.operations.length > MAX_OPERATIONS,
    'operations',
    `at most ${MAX_OPERATIONS} operations are supported`,
  );

  const ceiling = maxFileBlocks(input.blockSize) * input.blockSize;
  input.operations.forEach((operation, index) => {
    const path = `operations[${index}]`;
    switch (operation.kind) {
      case 'mkdir':
      case 'delete':
      case 'open':
      case 'close':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        break;
      case 'create':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        collector.addIf(
          !Number.isInteger(operation.size) || operation.size < MIN_FILE_SIZE || operation.size > ceiling,
          `${path}.size`,
          `size must be an integer between ${MIN_FILE_SIZE} and ${ceiling} for a ${input.blockSize}-byte block`,
        );
        collector.addIf(
          !Number.isInteger(operation.mode) || operation.mode < MIN_MODE || operation.mode > MAX_MODE,
          `${path}.mode`,
          'mode must be between 000 and 777 (octal)',
        );
        break;
      case 'rename':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        collector.addIf(!isValidName(operation.name), `${path}.name`, `"${operation.name}" is not a valid name`);
        break;
      case 'move':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        collector.addIf(
          !isValidMoveTarget(operation.to),
          `${path}.to`,
          `"${operation.to}" is not a valid directory path`,
        );
        break;
      case 'chmod':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        collector.addIf(
          !Number.isInteger(operation.mode) || operation.mode < MIN_MODE || operation.mode > MAX_MODE,
          `${path}.mode`,
          'mode must be between 000 and 777 (octal)',
        );
        break;
      case 'grow':
      case 'shrink':
        collector.addIf(!isValidPath(operation.path), `${path}.path`, `"${operation.path}" is not a valid path`);
        collector.addIf(
          !Number.isInteger(operation.size) || operation.size < MIN_FILE_SIZE || operation.size > ceiling,
          `${path}.size`,
          `size must be an integer between ${MIN_FILE_SIZE} and ${ceiling} for a ${input.blockSize}-byte block`,
        );
        break;
    }
  });

  return collector.toResult();
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

interface NodeRecord {
  id: string;
  name: string;
  parentId: string | null;
  type: FsNodeType;
  inode: number;
  mode: number;
  size: number;
  created: number;
  modified: number;
  accessed: number;
  children: string[];
}

interface InodeRecord {
  number: number;
  nodeId: string | null;
  type: FsNodeType;
  size: number;
  mode: number;
  links: number;
  created: number;
  modified: number;
  accessed: number;
  start: number | null;
  direct: (number | null)[];
  indirect: number | null;
  dataBlocks: number[];
  indexBlocks: number[];
  openCount: number;
}

interface BlockRecord {
  index: number;
  state: 'free' | 'data' | 'index';
  ownerNodeId: string | null;
  fileIndex: number | null;
  next: number | null;
}

interface FsState {
  nodes: Map<string, NodeRecord>;
  byPath: Map<string, string>;
  inodes: InodeRecord[];
  blocks: BlockRecord[];
  tick: number;
  nextNodeId: number;
}

function emptyInode(number: number): InodeRecord {
  return {
    number,
    nodeId: null,
    type: 'file',
    size: 0,
    mode: 0o644,
    links: 0,
    created: 0,
    modified: 0,
    accessed: 0,
    start: null,
    direct: [],
    indirect: null,
    dataBlocks: [],
    indexBlocks: [],
    openCount: 0,
  };
}

function createState(input: FsInput): FsState {
  const state: FsState = {
    nodes: new Map(),
    byPath: new Map(),
    inodes: Array.from({ length: input.inodeCount }, (_, index) => emptyInode(index)),
    blocks: Array.from({ length: input.blockCount }, (_, index) => ({
      index,
      state: 'free' as const,
      ownerNodeId: null,
      fileIndex: null,
      next: null,
    })),
    tick: 0,
    nextNodeId: 1,
  };

  state.nodes.set(ROOT_ID, {
    id: ROOT_ID,
    name: '',
    parentId: null,
    type: 'dir',
    inode: 0,
    mode: 0o755,
    size: 0,
    created: 0,
    modified: 0,
    accessed: 0,
    children: [],
  });
  state.inodes[0] = {
    ...emptyInode(0),
    nodeId: ROOT_ID,
    type: 'dir',
    mode: 0o755,
    links: 1,
  };
  state.tick = 1;
  rebuildPaths(state);
  return state;
}

function pathOf(state: FsState, nodeId: string): string {
  const node = state.nodes.get(nodeId);
  if (!node) return '/';
  if (node.parentId === null) return '/';
  const parent = state.nodes.get(node.parentId);
  if (!parent) return `/${node.name}`;
  const parentPath = pathOf(state, parent.id);
  return parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`;
}

function rebuildPaths(state: FsState): void {
  state.byPath = new Map();
  const visit = (id: string): void => {
    const node = state.nodes.get(id);
    if (!node) return;
    state.byPath.set(pathOf(state, id), id);
    for (const childId of node.children) visit(childId);
  };
  visit(ROOT_ID);
}

function resolve(state: FsState, path: string): NodeRecord | undefined {
  const id = state.byPath.get(path);
  return id ? state.nodes.get(id) : undefined;
}

function resolveDir(state: FsState, path: string): NodeRecord | undefined {
  const node = resolve(state, path);
  return node && node.type === 'dir' ? node : undefined;
}

function childByName(state: FsState, parent: NodeRecord, name: string): NodeRecord | undefined {
  for (const childId of parent.children) {
    const child = state.nodes.get(childId);
    if (child && child.name === name) return child;
  }
  return undefined;
}

function parentPathOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

function baseNameOf(path: string): string {
  const index = path.lastIndexOf('/');
  return path.slice(index + 1);
}

function allocateInode(state: FsState): number | null {
  const inode = state.inodes.find((item) => item.nodeId === null);
  return inode ? inode.number : null;
}

function freeBlockIndices(state: FsState): number[] {
  return state.blocks.filter((block) => block.state === 'free').map((block) => block.index);
}

/** Take a block for `nodeId`, marking it as data or an index block. */
function takeBlock(
  state: FsState,
  index: number,
  kind: 'data' | 'index',
  nodeId: string,
  fileIndex: number | null,
  next: number | null,
): void {
  const block = state.blocks[index]!;
  block.state = kind;
  block.ownerNodeId = nodeId;
  block.fileIndex = fileIndex;
  block.next = next;
}

/** Return a single block to the free-space bitmap. */
function releaseBlock(state: FsState, index: number): void {
  const block = state.blocks[index];
  if (!block) return;
  block.state = 'free';
  block.ownerNodeId = null;
  block.fileIndex = null;
  block.next = null;
}

/** Maximal runs of adjacent free blocks, in address order. */
function freeRunViews(state: FsState): FsFreeRunView[] {
  const runs: FsFreeRunView[] = [];
  let start = -1;
  for (let index = 0; index < state.blocks.length; index += 1) {
    const free = state.blocks[index]!.state === 'free';
    if (free && start < 0) start = index;
    if (!free && start >= 0) {
      runs.push({ start, length: index - start });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ start, length: state.blocks.length - start });
  return runs;
}

/**
 * External fragmentation: 0 when the free blocks form one unbroken run, rising
 * toward 1 as they scatter into ever smaller pieces. It measures how much of the
 * free space a contiguous request is *unable* to use.
 */
function fragmentationOf(runs: readonly FsFreeRunView[], freeBlocks: number): number {
  if (freeBlocks <= 0) return 0;
  const largest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  return 1 - largest / freeBlocks;
}

function releaseFileBlocks(state: FsState, nodeId: string): number[] {
  const freed: number[] = [];
  for (const block of state.blocks) {
    if (block.ownerNodeId !== nodeId) continue;
    block.state = 'free';
    block.ownerNodeId = null;
    block.fileIndex = null;
    block.next = null;
    freed.push(block.index);
  }
  return freed;
}

function freeInode(state: FsState, number: number): void {
  state.inodes[number] = emptyInode(number);
}

/* -------------------------------------------------------------------------- */
/* Allocation strategies                                                       */
/* -------------------------------------------------------------------------- */

interface AllocationResult {
  readonly dataBlocks: number[];
  readonly indexBlocks: number[];
}

type AllocationOutcome = AllocationResult | { readonly error: string };

function allocateContiguous(state: FsState, nodeId: string, count: number): AllocationOutcome {
  for (let start = 0; start + count <= state.blocks.length; start += 1) {
    let runFree = true;
    for (let offset = 0; offset < count; offset += 1) {
      if (state.blocks[start + offset]!.state !== 'free') {
        runFree = false;
        break;
      }
    }
    if (!runFree) continue;
    const dataBlocks: number[] = [];
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      takeBlock(state, index, 'data', nodeId, offset, null);
      dataBlocks.push(index);
    }
    return { dataBlocks, indexBlocks: [] };
  }
  const free = freeBlockIndices(state).length;
  return {
    error: `Contiguous allocation needs ${count} adjacent free block${count === 1 ? '' : 's'}, but the free space is fragmented — ${free} block${free === 1 ? '' : 's'} are free but no run of ${count} exists. This is external fragmentation.`,
  };
}

function allocateLinked(state: FsState, nodeId: string, count: number): AllocationOutcome {
  const free = freeBlockIndices(state);
  if (free.length < count) {
    return { error: `Only ${free.length} free block${free.length === 1 ? '' : 's'} remain, but ${count} are needed.` };
  }
  const chosen = free.slice(0, count);
  chosen.forEach((index, position) => {
    takeBlock(state, index, 'data', nodeId, position, position + 1 < count ? chosen[position + 1]! : null);
  });
  return { dataBlocks: chosen, indexBlocks: [] };
}

function allocateIndexed(state: FsState, nodeId: string, count: number): AllocationOutcome {
  const needsIndirect = count > DIRECT_BLOCKS;
  const free = freeBlockIndices(state);
  const required = count + (needsIndirect ? 1 : 0);
  if (free.length < required) {
    return {
      error: `Indexed allocation needs ${count} data block${count === 1 ? '' : 's'}${
        needsIndirect ? ' plus one index block' : ''
      }, but only ${free.length} block${free.length === 1 ? '' : 's'} are free.`,
    };
  }
  const dataBlocks = free.slice(0, count);
  dataBlocks.forEach((index, position) => takeBlock(state, index, 'data', nodeId, position, null));
  const indexBlocks: number[] = [];
  if (needsIndirect) {
    const index = free[count]!;
    takeBlock(state, index, 'index', nodeId, null, null);
    indexBlocks.push(index);
  }
  return { dataBlocks, indexBlocks };
}

function allocate(
  strategy: AllocationStrategy,
  state: FsState,
  nodeId: string,
  count: number,
): AllocationOutcome {
  switch (strategy) {
    case 'contiguous':
      return allocateContiguous(state, nodeId, count);
    case 'linked':
      return allocateLinked(state, nodeId, count);
    case 'indexed':
      return allocateIndexed(state, nodeId, count);
  }
}

/* -------------------------------------------------------------------------- */
/* Snapshots                                                                   */
/* -------------------------------------------------------------------------- */

interface ActiveView {
  path: string;
  inode: number | null;
  blocks: readonly number[];
}

function nodeView(state: FsState, node: NodeRecord, depth: number, activePath: string): FsNodeView {
  const inode = state.inodes[node.inode];
  const path = pathOf(state, node.id);
  return {
    id: node.id,
    name: node.name,
    path,
    type: node.type,
    parentId: node.parentId,
    depth,
    inode: node.inode,
    size: node.size,
    mode: node.mode,
    permissions: formatPermissions(node.mode),
    open: (inode?.openCount ?? 0) > 0,
    blockCount: inode?.dataBlocks.length ?? 0,
    active: path === activePath,
  };
}

function flattenNodes(state: FsState, activePath: string): FsNodeView[] {
  const views: FsNodeView[] = [];
  const visit = (id: string, depth: number): void => {
    const node = state.nodes.get(id);
    if (!node) return;
    views.push(nodeView(state, node, depth, activePath));
    for (const childId of node.children) visit(childId, depth + 1);
  };
  visit(ROOT_ID, 0);
  return views;
}

function inodeViews(state: FsState, activeInode: number | null): FsInodeView[] {
  return state.inodes.map((inode) => {
    const node = inode.nodeId ? state.nodes.get(inode.nodeId) : undefined;
    return {
      number: inode.number,
      used: inode.nodeId !== null,
      type: inode.nodeId ? inode.type : null,
      path: node ? pathOf(state, node.id) : null,
      size: inode.size,
      mode: inode.mode,
      permissions: formatPermissions(inode.mode),
      links: inode.links,
      openCount: inode.openCount,
      start: inode.start,
      direct: inode.direct.length > 0 ? [...inode.direct] : new Array<number | null>(DIRECT_BLOCKS).fill(null),
      indirect: inode.indirect,
      dataBlocks: [...inode.dataBlocks],
      indexBlocks: inode.indexBlocks ?? [],
      created: inode.created,
      modified: inode.modified,
      accessed: inode.accessed,
      active: inode.number === activeInode,
    };
  });
}

function blockViews(state: FsState, activeBlocks: readonly number[]): FsBlockView[] {
  const active = new Set(activeBlocks);
  return state.blocks.map((block) => {
    const owner = block.ownerNodeId ? state.nodes.get(block.ownerNodeId) : undefined;
    return {
      index: block.index,
      state: block.state,
      ownerPath: owner ? pathOf(state, owner.id) : null,
      ownerName: owner ? owner.name || '/' : null,
      ownerInode: owner ? owner.inode : null,
      fileIndex: block.fileIndex,
      next: block.next,
      active: active.has(block.index),
    };
  });
}

function openPaths(state: FsState): string[] {
  const paths: string[] = [];
  for (const inode of state.inodes) {
    if (inode.openCount > 0 && inode.nodeId) {
      const node = state.nodes.get(inode.nodeId);
      if (node) paths.push(pathOf(state, node.id));
    }
  }
  return paths.sort();
}

function snapshot(
  state: FsState,
  input: FsInput,
  event: FsEvent,
  operation: string,
  success: boolean | null,
  reason: string,
  active: ActiveView,
  summary: string,
): FsStepData {
  const nodes = flattenNodes(state, active.path);
  const inodes = inodeViews(state, active.inode);
  const blocks = blockViews(state, active.blocks);
  const usedBlocks = state.blocks.filter((block) => block.state !== 'free').length;
  const usedInodes = state.inodes.filter((inode) => inode.nodeId !== null).length;
  const runs = freeRunViews(state);
  const freeBlocks = state.blocks.length - usedBlocks;
  const largestFreeRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  return {
    kind: 'fs',
    allocation: input.allocation,
    event,
    operation,
    success,
    reason,
    blockSize: input.blockSize,
    blockCount: input.blockCount,
    nodes,
    inodes,
    blocks,
    openFiles: openPaths(state),
    activePath: active.path,
    activeInode: active.inode,
    activeBlocks: [...active.blocks],
    usedBlocks,
    freeBlocks,
    usedInodes,
    freeInodes: state.inodes.length - usedInodes,
    freeRuns: runs,
    largestFreeRun,
    externalFragmentation: fragmentationOf(runs, freeBlocks),
    usedBytes: usedBlocks * input.blockSize,
    capacityBytes: input.blockCount * input.blockSize,
    summary,
  };
}

export function fsStepMetrics(data: FsStepData): Record<string, number> {
  return {
    nodes: data.nodes.length,
    usedBlocks: data.usedBlocks,
    freeBlocks: data.freeBlocks,
    usedInodes: data.usedInodes,
    freeInodes: data.freeInodes,
    openFiles: data.openFiles.length,
    freeRuns: data.freeRuns.length,
    largestFreeRun: data.largestFreeRun,
    fragmentation: data.externalFragmentation,
    usedBytes: data.usedBytes,
  };
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

interface OpOutcome {
  readonly event: FsEvent;
  readonly operation: string;
  readonly label: string;
  readonly description: string;
  readonly explanation: string;
  readonly reason: string;
  readonly success: boolean;
}

function operationLabel(operation: FsOperation): string {
  switch (operation.kind) {
    case 'mkdir':
      return `mkdir ${operation.path}`;
    case 'create':
      return `create ${operation.path} (${operation.size} B)`;
    case 'delete':
      return `delete ${operation.path}`;
    case 'rename':
      return `rename ${operation.path} → ${operation.name}`;
    case 'move':
      return `move ${operation.path} → ${operation.to}`;
    case 'open':
      return `open ${operation.path}`;
    case 'close':
      return `close ${operation.path}`;
    case 'chmod':
      return `chmod ${operation.path} ${operation.mode.toString(8)}`;
    case 'grow':
      return `grow ${operation.path} → ${operation.size} B`;
    case 'shrink':
      return `shrink ${operation.path} → ${operation.size} B`;
  }
}

function reject(operation: FsOperation, label: string, description: string, explanation: string): OpOutcome {
  return {
    event: 'failed',
    operation: operationLabel(operation),
    label,
    description,
    explanation,
    reason: explanation,
    success: false,
  };
}

function applyOperation(state: FsState, input: FsInput, operation: FsOperation): OpOutcome {
  state.tick += 1;
  const allocation = input.allocation;

  switch (operation.kind) {
    case 'mkdir': {
      const parentPath = parentPathOf(operation.path);
      const name = baseNameOf(operation.path);
      const parent = resolveDir(state, parentPath);
      if (!parent) {
        return reject(
          operation,
          'mkdir failed',
          `Directory ${parentPath} does not exist.`,
          `a mkdir needs an existing parent directory; ${parentPath} is not one. The path must be created top-down.`,
        );
      }
      if (childByName(state, parent, name)) {
        return reject(
          operation,
          'mkdir failed',
          `${operation.path} already exists.`,
          'The name is already taken inside the parent directory, so the new directory cannot be created.',
        );
      }
      const inodeNumber = allocateInode(state);
      if (inodeNumber === null) {
        return reject(
          operation,
          'mkdir failed',
          'The inode table is full.',
          'Every inode is in use, so no metadata can be allocated. Free a file or directory before creating another.',
        );
      }
      const id = `n${state.nextNodeId}`;
      state.nextNodeId += 1;
      state.nodes.set(id, {
        id,
        name,
        parentId: parent.id,
        type: 'dir',
        inode: inodeNumber,
        mode: 0o755,
        size: 0,
        created: state.tick,
        modified: state.tick,
        accessed: state.tick,
        children: [],
      });
      parent.children = [...parent.children, id];
      parent.modified = state.tick;
      state.inodes[inodeNumber] = {
        ...emptyInode(inodeNumber),
        nodeId: id,
        type: 'dir',
        mode: 0o755,
        links: 1,
        created: state.tick,
        modified: state.tick,
        accessed: state.tick,
      };
      rebuildPaths(state);
      return {
        event: 'mkdir',
        operation: operationLabel(operation),
        label: `mkdir ${operation.path}`,
        description: `${operation.path} created as an empty directory using inode ${inodeNumber}.`,
        explanation: `A directory is a file whose data is a list of (name, inode) entries. This model gives the directory inode ${inodeNumber} but allocates it no disk blocks: its entries are part of the tree, which keeps the block map focused on file data.`,
        reason: `Directory ${operation.path} created with inode ${inodeNumber}; no data blocks are consumed by directories here.`,
        success: true,
      };
    }

    case 'create': {
      const parentPath = parentPathOf(operation.path);
      const name = baseNameOf(operation.path);
      const parent = resolveDir(state, parentPath);
      if (!parent) {
        return reject(
          operation,
          'create failed',
          `Directory ${parentPath} does not exist.`,
          'the parent directory must exist before a file can be created inside it.',
        );
      }
      if (childByName(state, parent, name)) {
        return reject(
          operation,
          'create failed',
          `${operation.path} already exists.`,
          'A file or directory with that name is already present, so the create is refused.',
        );
      }
      const count = blocksForSize(operation.size, input.blockSize);
      const cap = maxFileBlocks(input.blockSize);
      if (count > cap) {
        return reject(
          operation,
          'create failed',
          `${operation.size} bytes needs ${count} blocks, beyond the ${cap} an inode can address.`,
          `With ${DIRECT_BLOCKS} direct pointers and ${Math.floor(input.blockSize / POINTER_SIZE)} pointers per ${input.blockSize}-byte block, one single-indirect block lets an inode address ${cap} data blocks (${cap * input.blockSize} bytes). Bigger files need double indirect pointers.`,
        );
      }
      const inodeNumber = allocateInode(state);
      if (inodeNumber === null) {
        return reject(
          operation,
          'create failed',
          'The inode table is full.',
          'No free inode remains, so the file cannot be given metadata and the create is refused.',
        );
      }
      const id = `n${state.nextNodeId}`;
      state.nextNodeId += 1;
      state.nodes.set(id, {
        id,
        name,
        parentId: parent.id,
        type: 'file',
        inode: inodeNumber,
        mode: operation.mode,
        size: operation.size,
        created: state.tick,
        modified: state.tick,
        accessed: state.tick,
        children: [],
      });

      const result = allocate(allocation, state, id, count);
      if ('error' in result) {
        // Roll the inode and the directory entry back: the create fails atomically.
        state.nodes.delete(id);
        freeInode(state, inodeNumber);
        return reject(
          operation,
          'create failed — out of space',
          `${operation.path} needs ${count} block${count === 1 ? '' : 's'} and could not be allocated.`,
          `${result.error} ${
            allocation === 'contiguous'
              ? 'Linked and indexed allocation do not need adjacency, so the same request would succeed under either of them.'
              : 'Freeing another file, or deleting one, would release enough blocks.'
          }`,
        );
      }

      parent.children = [...parent.children, id];
      parent.modified = state.tick;
      const inode = state.inodes[inodeNumber]!;
      inode.nodeId = id;
      inode.type = 'file';
      inode.size = operation.size;
      inode.mode = operation.mode;
      inode.links = 1;
      inode.created = state.tick;
      inode.modified = state.tick;
      inode.accessed = state.tick;
      inode.dataBlocks = result.dataBlocks;
      inode.indexBlocks = result.indexBlocks;
      inode.start = result.dataBlocks[0] ?? null;
      inode.indirect = result.indexBlocks[0] ?? null;
      inode.direct =
        allocation === 'indexed'
          ? Array.from({ length: DIRECT_BLOCKS }, (_, index) => result.dataBlocks[index] ?? null)
          : [];
      rebuildPaths(state);

      const indexNote =
        result.indexBlocks.length > 0
          ? ` Because the file needs ${count} > ${DIRECT_BLOCKS} data blocks, one extra block (${result.indexBlocks[0]}) is reserved as an index block — pointers cost space.`
          : '';
      const strategyNote =
        allocation === 'contiguous'
          ? ` Contiguous allocation placed the file in the single run ${result.dataBlocks[0]}–${result.dataBlocks[result.dataBlocks.length - 1]}, so a sequential read needs one seek.`
          : allocation === 'linked'
            ? ` Linked allocation chained the blocks ${result.dataBlocks.join(' → ')}, so the file grows without fragmentation but a random read must follow the chain.`
            : ` Indexed allocation scattered the data across blocks ${result.dataBlocks.join(', ')} and keeps their pointers in the inode, so any block can be reached directly.`;
      return {
        event: 'create',
        operation: operationLabel(operation),
        label: `create ${operation.path}`,
        description: `${operation.path} created: ${operation.size} bytes in ${count} data block${
          count === 1 ? '' : 's'
        } (${result.dataBlocks.join(', ')}).`,
        explanation: `The inode table gave inode ${inodeNumber} to ${operation.path}.${strategyNote}${indexNote}`,
        reason: `inode ${inodeNumber}; ${count} data block${count === 1 ? '' : 's'} ${
          result.dataBlocks.join(', ')
        }${result.indexBlocks.length > 0 ? `; index block ${result.indexBlocks.join(', ')}` : ''}.`,
        success: true,
      };
    }

    case 'delete': {
      const node = resolve(state, operation.path);
      if (!node) {
        return reject(
          operation,
          'delete failed',
          `${operation.path} does not exist.`,
          'there is nothing at that path to remove.',
        );
      }
      if (node.id === ROOT_ID) {
        return reject(
          operation,
          'delete failed',
          'The root directory cannot be removed.',
          'The root is the anchor of the tree; removing it would detach every path.',
        );
      }
      if (node.type === 'dir' && node.children.length > 0) {
        return reject(
          operation,
          'delete failed',
          `${operation.path} is not empty.`,
          'Most file systems refuse to remove a non-empty directory, because doing so would orphan its children. Remove its contents first.',
        );
      }
      const inode = state.inodes[node.inode];
      if (inode && inode.openCount > 0) {
        return reject(
          operation,
          'delete failed',
          `${operation.path} is still open.`,
          'The file has open file handles, so the unlink is refused. Close it before deleting.',
        );
      }
      const freed = releaseFileBlocks(state, node.id);
      freeInode(state, node.inode);
      const parent = node.parentId ? state.nodes.get(node.parentId) : undefined;
      if (parent) {
        parent.children = parent.children.filter((childId) => childId !== node.id);
        parent.modified = state.tick;
      }
      state.nodes.delete(node.id);
      rebuildPaths(state);
      return {
        event: 'delete',
        operation: operationLabel(operation),
        label: `delete ${operation.path}`,
        description: `${operation.path} removed; ${freed.length} block${freed.length === 1 ? '' : 's'} freed and inode ${node.inode} released.`,
        explanation: `Deleting a file frees both kinds of resource: its ${freed.length} disk block${
          freed.length === 1 ? '' : 's'
        } (${freed.length > 0 ? freed.join(', ') : 'none'}) return to the free-space bitmap, and its inode ${node.inode} returns to the free list. The directory entry is dropped from ${parentPathOf(operation.path)}.`,
        reason: `freed blocks ${freed.length > 0 ? freed.join(', ') : '—'}; inode ${node.inode} released.`,
        success: true,
      };
    }

    case 'rename': {
      const node = resolve(state, operation.path);
      if (!node || node.id === ROOT_ID) {
        return reject(
          operation,
          'rename failed',
          `${operation.path} does not exist.`,
          'only an existing entry can be renamed.',
        );
      }
      const parent = node.parentId ? state.nodes.get(node.parentId) : undefined;
      if (!parent) {
        return reject(operation, 'rename failed', 'The parent directory is missing.', 'the entry has no directory to rename within.');
      }
      if (operation.name === node.name) {
        return reject(
          operation,
          'rename failed',
          `The name is unchanged.`,
          'Renaming to the same name is a no-op, so nothing would change.',
        );
      }
      if (childByName(state, parent, operation.name)) {
        return reject(
          operation,
          'rename failed',
          `${operation.name} already exists in this directory.`,
          'the target name is taken, so the rename would collide.',
        );
      }
      const oldPath = pathOf(state, node.id);
      node.name = operation.name;
      node.modified = state.tick;
      const inode = state.inodes[node.inode];
      if (inode) inode.modified = state.tick;
      rebuildPaths(state);
      return {
        event: 'rename',
        operation: operationLabel(operation),
        label: `rename ${operation.path}`,
        description: `${oldPath} is now ${pathOf(state, node.id)}.`,
        explanation: `A rename only changes a name in a directory entry — the inode is untouched, so the data blocks, size and timestamps stay exactly as they were. That is why renaming a large file is instant.`,
        reason: `directory entry ${baseNameOf(oldPath)} → ${operation.name}; inode ${node.inode} unchanged.`,
        success: true,
      };
    }

    case 'move': {
      const node = resolve(state, operation.path);
      if (!node || node.id === ROOT_ID) {
        return reject(operation, 'move failed', `${operation.path} does not exist.`, 'only an existing entry can be moved.');
      }
      const destination = resolveDir(state, operation.to);
      if (!destination) {
        return reject(
          operation,
          'move failed',
          `${operation.to} is not a directory.`,
          'the destination of a move must be an existing directory.',
        );
      }
      if (destination.id === node.id || pathOf(state, destination.id).startsWith(`${pathOf(state, node.id)}/`)) {
        return reject(
          operation,
          'move failed',
          `${operation.path} cannot be moved inside itself.`,
          'that would detach the subtree from the tree, so the move is refused.',
        );
      }
      const source = node.parentId ? state.nodes.get(node.parentId) : undefined;
      if (source && childByName(state, destination, node.name)) {
        return reject(
          operation,
          'move failed',
          `${operation.to} already contains ${node.name}.`,
          'the destination already has an entry with that name, so the move would collide.',
        );
      }
      const oldPath = pathOf(state, node.id);
      if (source) source.children = source.children.filter((childId) => childId !== node.id);
      node.parentId = destination.id;
      node.modified = state.tick;
      destination.children = [...destination.children, node.id];
      rebuildPaths(state);
      return {
        event: 'move',
        operation: operationLabel(operation),
        label: `move ${operation.path}`,
        description: `${oldPath} moved to ${pathOf(state, node.id)}.`,
        explanation: `Like rename, a move edits two directory entries — removing the name from the old directory and adding it to the new one — while the inode and its data blocks are untouched. If the destination is on the same volume, no data is copied at all.`,
        reason: `directory entry retargeted from ${parentPathOf(oldPath)} to ${operation.to}; inode ${node.inode} unchanged.`,
        success: true,
      };
    }

    case 'open': {
      const node = resolve(state, operation.path);
      if (!node) {
        return reject(operation, 'open failed', `${operation.path} does not exist.`, 'a file must exist before it can be opened.');
      }
      const inode = state.inodes[node.inode]!;
      inode.openCount += 1;
      inode.accessed = state.tick;
      return {
        event: 'open',
        operation: operationLabel(operation),
        label: `open ${operation.path}`,
        description: `${operation.path} opened; open count is now ${inode.openCount}.`,
        explanation: `Opening a file loads its inode into the in-memory open-file table and returns a handle. The open count lets several processes share one inode while the system knows when the last handle closes.`,
        reason: `inode ${node.inode} open count ${inode.openCount}.`,
        success: true,
      };
    }

    case 'close': {
      const node = resolve(state, operation.path);
      if (!node) {
        return reject(operation, 'close failed', `${operation.path} does not exist.`, 'there is no such entry to close.');
      }
      const inode = state.inodes[node.inode]!;
      if (inode.openCount === 0) {
        return reject(
          operation,
          'close failed',
          `${operation.path} is not open.`,
          'closing a file that has no open handle would corrupt the open count, so it is refused.',
        );
      }
      inode.openCount -= 1;
      const remaining = inode.openCount;
      return {
        event: 'close',
        operation: operationLabel(operation),
        label: `close ${operation.path}`,
        description: `${operation.path} closed; open count is now ${remaining}.`,
        explanation:
          remaining === 0
            ? 'The last handle closed, so the entry leaves the open-file table. The inode itself is unaffected — it is only removed when the file is deleted and the last link is gone.'
            : 'Another handle is still open, so the inode remains in the open-file table.',
        reason: `inode ${node.inode} open count ${remaining}.`,
        success: true,
      };
    }

    case 'chmod': {
      const node = resolve(state, operation.path);
      if (!node) {
        return reject(operation, 'chmod failed', `${operation.path} does not exist.`, 'permissions belong to an existing inode.');
      }
      const before = formatPermissions(node.mode);
      node.mode = operation.mode;
      node.modified = state.tick;
      const inode = state.inodes[node.inode];
      if (inode) inode.mode = operation.mode;
      return {
        event: 'chmod',
        operation: operationLabel(operation),
        label: `chmod ${operation.path}`,
        description: `${operation.path} is now ${formatPermissions(operation.mode)} (${operation.mode.toString(8)}).`,
        explanation: `Permissions live in the inode, split into owner, group and other — three bits each for read, write and execute. ${before} → ${formatPermissions(
          operation.mode,
        )} is a metadata-only change; no data blocks move.`,
        reason: `mode ${before} → ${formatPermissions(operation.mode)}.`,
        success: true,
      };
    }

    case 'grow': {
      const node = resolve(state, operation.path);
      if (!node || node.type !== 'file') {
        return reject(
          operation,
          'grow failed',
          `${operation.path} is not an existing file.`,
          'only an existing file can grow; create it first or point the operation at a file.',
        );
      }
      const inode = state.inodes[node.inode];
      if (!inode) {
        return reject(operation, 'grow failed', 'The inode is missing.', 'the file has no metadata to update.');
      }
      if (operation.size <= node.size) {
        return reject(
          operation,
          'grow failed',
          `${operation.size} B is not larger than the current ${node.size} B.`,
          'grow appends bytes to a file; to reduce a file use shrink.',
        );
      }
      const newCount = blocksForSize(operation.size, input.blockSize);
      const currentCount = inode.dataBlocks.length;
      const cap = maxFileBlocks(input.blockSize);
      if (newCount > cap) {
        return reject(
          operation,
          'grow failed',
          `${operation.size} bytes needs ${newCount} blocks, beyond the ${cap} an inode can address.`,
          `An inode addresses ${cap} data blocks using its ${DIRECT_BLOCKS} direct pointers and one single-indirect block; larger files need double-indirect pointers.`,
        );
      }
      const delta = newCount - currentCount;
      const added: number[] = [];

      if (delta > 0) {
        if (allocation === 'contiguous') {
          const last = inode.dataBlocks[currentCount - 1] ?? -1;
          let extendable = true;
          for (let offset = 1; offset <= delta; offset += 1) {
            const index = last + offset;
            if (index >= state.blocks.length || state.blocks[index]!.state !== 'free') {
              extendable = false;
              break;
            }
          }
          if (!extendable) {
            const free = freeBlockIndices(state).length;
            return reject(
              operation,
              'grow failed — cannot extend in place',
              `${operation.path} needs ${delta} more block${delta === 1 ? '' : 's'} immediately after block ${last}.`,
              `Contiguous allocation can only grow a file into the blocks that directly follow it, and they are not free (${free} block${
                free === 1 ? ' is' : 's are'
              } free elsewhere on the volume). This is external fragmentation: the file would have to be moved to a large enough run, or the disk compacted.`,
            );
          }
          for (let offset = 1; offset <= delta; offset += 1) {
            const index = last + offset;
            takeBlock(state, index, 'data', node.id, currentCount + offset - 1, null);
            added.push(index);
          }
        } else if (allocation === 'linked') {
          const free = freeBlockIndices(state);
          if (free.length < delta) {
            return reject(
              operation,
              'grow failed — out of space',
              `${operation.path} needs ${delta} more block${delta === 1 ? '' : 's'} but only ${free.length} ${
                free.length === 1 ? 'is' : 'are'
              } free.`,
              'Linked allocation can use any free block, so this is a genuinely full volume rather than external fragmentation.',
            );
          }
          const chosen = free.slice(0, delta);
          chosen.forEach((index, position) => {
            takeBlock(
              state,
              index,
              'data',
              node.id,
              currentCount + position,
              position + 1 < delta ? chosen[position + 1]! : null,
            );
          });
          const tail = inode.dataBlocks[currentCount - 1];
          if (tail === undefined) inode.start = chosen[0]!;
          else state.blocks[tail]!.next = chosen[0]!;
          added.push(...chosen);
        } else {
          const needsIndex = newCount > DIRECT_BLOCKS && inode.indexBlocks.length === 0;
          const required = delta + (needsIndex ? 1 : 0);
          const free = freeBlockIndices(state);
          if (free.length < required) {
            return reject(
              operation,
              'grow failed — out of space',
              `${operation.path} needs ${delta} data block${delta === 1 ? '' : 's'}${
                needsIndex ? ' plus one index block' : ''
              }, but only ${free.length} block${free.length === 1 ? '' : 's'} are free.`,
              'Indexed allocation can use any free block and only spends an extra block when the file first crosses the direct-pointer limit.',
            );
          }
          const chosen = free.slice(0, delta);
          chosen.forEach((index, position) => takeBlock(state, index, 'data', node.id, currentCount + position, null));
          if (needsIndex) {
            const indexBlock = free[delta]!;
            takeBlock(state, indexBlock, 'index', node.id, null, null);
            inode.indexBlocks = [indexBlock];
          }
          added.push(...chosen);
        }
      }

      inode.dataBlocks = [...inode.dataBlocks, ...added];
      inode.start = inode.dataBlocks[0] ?? null;
      inode.direct =
        allocation === 'indexed'
          ? Array.from({ length: DIRECT_BLOCKS }, (_, index) => inode.dataBlocks[index] ?? null)
          : [];
      inode.indirect = inode.indexBlocks[0] ?? null;
      inode.size = operation.size;
      inode.modified = state.tick;
      inode.accessed = state.tick;
      node.size = operation.size;
      node.modified = state.tick;

      const grew = delta > 0;
      return {
        event: 'grow',
        operation: operationLabel(operation),
        label: `grow ${operation.path}`,
        description: grew
          ? `${operation.path} extended by ${delta} data block${delta === 1 ? '' : 's'} to ${operation.size} bytes (${added.join(
              ', ',
            )}).`
          : `${operation.path} grew to ${operation.size} bytes; it still fits in its ${currentCount} existing block${
              currentCount === 1 ? '' : 's'
            }.`,
        explanation: grew
          ? `${
              allocation === 'contiguous'
                ? 'Contiguous allocation extended the file in place, because the blocks immediately after it happened to be free.'
                : allocation === 'linked'
                  ? `Linked allocation appended the free blocks ${added.join(' → ')} and pointed the old tail at the first of them.`
                  : `Indexed allocation added the free blocks ${added.join(', ')} and recorded their pointers in the inode${
                      inode.indexBlocks.length > 0 ? ' (the file now uses an index block)' : ''
                    }.`
            } ${
              allocation === 'contiguous'
                ? 'Extending in place is the one thing contiguous allocation cannot always do.'
                : 'Growth needs no adjacency, so the file never external-fragments.'
            }`
          : 'The new size still fits inside the last data block, so no block had to be allocated — only the size recorded in the inode changed.',
        reason: grew
          ? `${currentCount} → ${newCount} data block${newCount === 1 ? '' : 's'}; added ${added.join(', ')}${
              inode.indexBlocks.length > 0 ? `; index block ${inode.indexBlocks.join(', ')}` : ''
            }.`
          : `size only; ${newCount} block${newCount === 1 ? '' : 's'} still suffice.`,
        success: true,
      };
    }

    case 'shrink': {
      const node = resolve(state, operation.path);
      if (!node || node.type !== 'file') {
        return reject(
          operation,
          'shrink failed',
          `${operation.path} is not an existing file.`,
          'only a file can be truncated; directories change size by gaining or losing entries.',
        );
      }
      const inode = state.inodes[node.inode];
      if (!inode) {
        return reject(operation, 'shrink failed', 'The inode is missing.', 'the file has no metadata to update.');
      }
      if (operation.size >= node.size) {
        return reject(
          operation,
          'shrink failed',
          `${operation.size} B is not smaller than the current ${node.size} B.`,
          'shrink truncates a file; to extend a file use grow.',
        );
      }
      const newCount = blocksForSize(operation.size, input.blockSize);
      const currentCount = inode.dataBlocks.length;
      const removed = inode.dataBlocks.slice(newCount);
      for (const index of removed) releaseBlock(state, index);
      const freedIndex: number[] = [];
      if (allocation === 'indexed' && newCount <= DIRECT_BLOCKS) {
        for (const index of inode.indexBlocks) {
          releaseBlock(state, index);
          freedIndex.push(index);
        }
        inode.indexBlocks = [];
      }
      if (allocation === 'linked' && removed.length > 0 && newCount > 0) {
        const newTail = inode.dataBlocks[newCount - 1];
        if (newTail !== undefined) state.blocks[newTail]!.next = null;
      }
      inode.dataBlocks = inode.dataBlocks.slice(0, newCount);
      inode.start = inode.dataBlocks[0] ?? null;
      inode.direct =
        allocation === 'indexed'
          ? Array.from({ length: DIRECT_BLOCKS }, (_, index) => inode.dataBlocks[index] ?? null)
          : [];
      inode.indirect = inode.indexBlocks[0] ?? null;
      inode.size = operation.size;
      inode.modified = state.tick;
      inode.accessed = state.tick;
      node.size = operation.size;
      node.modified = state.tick;

      const trimmed = currentCount - newCount;
      return {
        event: 'shrink',
        operation: operationLabel(operation),
        label: `shrink ${operation.path}`,
        description:
          trimmed > 0
            ? `${operation.path} truncated to ${operation.size} bytes; ${trimmed} data block${
                trimmed === 1 ? '' : 's'
              } freed (${removed.join(', ')}).`
            : `${operation.path} truncated to ${operation.size} bytes; the last block is only partially used, so no block was freed.`,
        explanation:
          trimmed > 0
            ? `Truncating returns the file's trailing blocks to the free-space bitmap.${
                freedIndex.length > 0
                  ? ` The index block ${freedIndex.join(', ')} is no longer needed and is freed too.`
                  : ''
              } Those newly freed blocks are the raw material a later contiguous request may — or may not — be able to use, depending on whether they are adjacent.`
            : 'The new size still occupies the same number of blocks, so the bitmap is unchanged and only the inode size moved.',
        reason:
          trimmed > 0
            ? `${currentCount} → ${newCount} data block${newCount === 1 ? '' : 's'}; freed ${removed.join(', ')}${
                freedIndex.length > 0 ? `; freed index block ${freedIndex.join(', ')}` : ''
              }.`
            : `size only; ${newCount} block${newCount === 1 ? '' : 's'}.`,
        success: true,
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Run                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Replay a script of file-system operations over an in-memory disk.
 *
 * Nothing here touches the host filesystem: the disk is a fixed array of blocks,
 * the inode table a fixed array of records, and the directory tree a plain map.
 * The run is deterministic, so the same script always produces the same tree,
 * bitmap and inode table.
 */
export function runFileSystem(
  input: FsInput,
  config: SimulationConfig = {},
): SimulationRun<FsStepData> {
  assertValid(validateFsInput(input), 'File system');

  const state = createState(input);
  const drafts: StepDraft<FsStepData>[] = [];
  const active: ActiveView = { path: '/', inode: 0, blocks: [] };

  const push = (
    event: FsEvent,
    operation: string,
    success: boolean | null,
    reason: string,
    label: string,
    description: string,
    explanation: string,
  ): void => {
    const data = snapshot(state, input, event, operation, success, reason, active, label);
    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights: [],
      metrics: fsStepMetrics(data),
    });
  };

  /* --------------------------------------------------------------------- init */
  push(
    'init',
    'Mount the volume',
    true,
    `Volume mounted: ${input.blockCount} blocks of ${input.blockSize} bytes, ${input.inodeCount} inodes, ${ALLOCATION_LABELS[input.allocation]} allocation.`,
    'Empty volume',
    `${input.blockCount} blocks × ${input.blockSize} bytes (${input.blockCount * input.blockSize} bytes) with a ${input.inodeCount}-entry inode table.`,
    `The disk begins completely free: the free-space bitmap is all zeros and every inode is unused except inode 0, which is reserved for the root directory. Allocation strategy: ${ALLOCATION_LABELS[input.allocation]}. ${
      input.allocation === 'contiguous'
        ? 'A new file will need one unbroken run of blocks, so fragmentation will eventually matter.'
        : input.allocation === 'linked'
          ? 'A new file can use any free blocks, chained together by a pointer in each block.'
          : 'A new file can use any free blocks, with the inode (and one index block if needed) holding their pointers.'
    }`,
  );

  /* ---------------------------------------------------------------- operations */
  for (const operation of input.operations) {
    const outcome = applyOperation(state, input, operation);
    active.path = outcome.success ? activePathFor(operation) : active.path;
    active.inode = activeInodeFor(state, operation, outcome.success);
    active.blocks = activeBlocksFor(state, active.inode);

    push(
      outcome.event,
      outcome.operation,
      outcome.success,
      outcome.reason,
      outcome.label,
      outcome.description,
      outcome.explanation,
    );
  }

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ??
    snapshot(state, input, 'init', 'Mount the volume', true, '', active, '')) as FsStepData;

  return {
    algorithmId: ALLOCATION_ALGORITHM_IDS[input.allocation],
    labId: FS_LAB_ID,
    input: {
      allocation: input.allocation,
      blockCount: input.blockCount,
      blockSize: input.blockSize,
      inodeCount: input.inodeCount,
      operations: input.operations.length,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<FsStepData>({
      labId: FS_LAB_ID,
      algorithmId: ALLOCATION_ALGORITHM_IDS[input.allocation],
      steps,
      parameters: { allocation: input.allocation, blockCount: input.blockCount, blockSize: input.blockSize },
      speed: config.speed,
    }),
    summary: {
      operations: input.operations.length,
      nodes: finalData.nodes.length,
      usedBlocks: finalData.usedBlocks,
      freeBlocks: finalData.freeBlocks,
      usedInodes: finalData.usedInodes,
      fragmentPercent: finalData.blockCount === 0 ? 0 : finalData.usedBlocks / finalData.blockCount,
      freeRuns: finalData.freeRuns.length,
      largestFreeRun: finalData.largestFreeRun,
      externalFragmentation: finalData.externalFragmentation,
      steps: steps.length,
    },
  };
}

function activePathFor(operation: FsOperation): string {
  switch (operation.kind) {
    case 'mkdir':
    case 'create':
      return operation.path;
    case 'rename': {
      const parent = parentPathOf(operation.path);
      return parent === '/' ? `/${operation.name}` : `${parent}/${operation.name}`;
    }
    case 'move': {
      const name = baseNameOf(operation.path);
      return operation.to === '/' ? `/${name}` : `${operation.to}/${name}`;
    }
    default:
      return operation.path;
  }
}

function activeInodeFor(state: FsState, operation: FsOperation, success: boolean): number | null {
  if (!success) return null;
  const path = activePathFor(operation);
  const node = resolve(state, path);
  return node ? node.inode : null;
}

function activeBlocksFor(state: FsState, inodeNumber: number | null): number[] {
  if (inodeNumber === null) return [];
  const inode = state.inodes[inodeNumber];
  if (!inode) return [];
  return [...inode.dataBlocks, ...inode.indexBlocks];
}

export const fileSystemEngine: SimulationEngine<FsInput, FsStepData> = {
  id: FS_ENGINE_ID,
  algorithmId: FILE_SYSTEM_ALGORITHM_ID,
  labId: FS_LAB_ID,
  name: 'File Allocation & Inodes',
  description:
    'Build a directory tree and store files across a block device under contiguous, linked or indexed allocation, tracking inodes and free space.',
  validate: validateFsInput,
  run: runFileSystem,
};
