import { useState } from 'react';
import {
  ALLOCATION_LABELS,
  ALLOCATION_STRATEGIES,
  BLOCK_SIZES,
  MAX_BLOCK_COUNT,
  MAX_INODES,
  MAX_OPERATIONS,
  MIN_BLOCK_COUNT,
  MIN_INODES,
  MIN_FILE_SIZE,
  isValidPath,
  maxFileBlocks,
  type AllocationStrategy,
  type FsOperation,
  type FsPreset,
} from '@/engine';
import { Button } from '@/components';
import type { FsDraft } from '../drafts';

export interface FsEditorProps {
  readonly draft: FsDraft;
  readonly disabled: boolean;
  readonly presets: readonly FsPreset[];
  readonly onChange: (draft: FsDraft) => void;
  readonly onPreset: (preset: FsPreset) => void;
  readonly onReset: () => void;
}

type OperationKind = FsOperation['kind'];

const OPERATION_KINDS: readonly { readonly kind: OperationKind; readonly label: string }[] = [
  { kind: 'mkdir', label: 'mkdir' },
  { kind: 'create', label: 'create file' },
  { kind: 'delete', label: 'delete' },
  { kind: 'rename', label: 'rename' },
  { kind: 'move', label: 'move' },
  { kind: 'open', label: 'open' },
  { kind: 'close', label: 'close' },
  { kind: 'grow', label: 'grow file' },
  { kind: 'shrink', label: 'shrink file' },
  { kind: 'chmod', label: 'chmod' },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function operationLabel(operation: FsOperation): string {
  switch (operation.kind) {
    case 'mkdir':
      return `mkdir ${operation.path}`;
    case 'create':
      return `create ${operation.path} (${operation.size} B, ${operation.mode.toString(8).padStart(3, '0')})`;
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
      return `chmod ${operation.path} ${operation.mode.toString(8).padStart(3, '0')}`;
    case 'grow':
      return `grow ${operation.path} → ${operation.size} B`;
    case 'shrink':
      return `shrink ${operation.path} → ${operation.size} B`;
  }
}

/**
 * The workload builder: allocation strategy, geometry, and the operation script.
 *
 * Every operation the learner adds is appended to a script the engine replays,
 * so the tree, block map, bitmap and inode table are a faithful function of the
 * list shown here — and the whole session can be reset or replaced by a preset.
 */
export function FsEditor({ draft, disabled, presets, onChange, onPreset, onReset }: FsEditorProps) {
  const [kind, setKind] = useState<OperationKind>('mkdir');
  const [path, setPath] = useState('/notes');
  const [size, setSize] = useState(256);
  const [mode, setMode] = useState('644');
  const [name, setName] = useState('renamed');
  const [to, setTo] = useState('/');

  const set = (patch: Partial<FsDraft>): void => onChange({ ...draft, ...patch });

  const maxSize = maxFileBlocks(draft.blockSize) * draft.blockSize;
  const modeValid = /^[0-7]{1,3}$/.test(mode);
  const parsedMode = modeValid ? parseInt(mode, 8) : 0;
  const pathValid = isValidPath(path);

  const needsPath = true;
  const needsSize = kind === 'create' || kind === 'grow' || kind === 'shrink';
  const needsMode = kind === 'create' || kind === 'chmod';
  const needsName = kind === 'rename';
  const needsTarget = kind === 'move';

  const issues: string[] = [];
  if (!pathValid) issues.push('path must look like /dir/file');
  if (needsMode && !modeValid) issues.push('mode must be octal 000–777');
  if (needsName && !isValidPath(`/${name}`)) issues.push('new name must be a simple name');
  if (needsTarget && !isValidPath(to)) issues.push('target must be a directory path');
  if (draft.operations.length >= MAX_OPERATIONS) issues.push('operation limit reached');

  const add = (): void => {
    if (issues.length > 0) return;
    const operation = buildOperation();
    if (!operation) return;
    set({ operations: [...draft.operations, operation] });
  };

  function buildOperation(): FsOperation | null {
    switch (kind) {
      case 'mkdir':
        return { kind: 'mkdir', path };
      case 'create':
        return { kind: 'create', path, size, mode: parsedMode };
      case 'grow':
        return { kind: 'grow', path, size };
      case 'shrink':
        return { kind: 'shrink', path, size };
      case 'delete':
        return { kind: 'delete', path };
      case 'open':
        return { kind: 'open', path };
      case 'close':
        return { kind: 'close', path };
      case 'rename':
        return { kind: 'rename', path, name };
      case 'move':
        return { kind: 'move', path, to };
      case 'chmod':
        return { kind: 'chmod', path, mode: parsedMode };
      default:
        return null;
    }
  }

  const removeAt = (index: number): void => {
    set({ operations: draft.operations.filter((_, position) => position !== index) });
  };

  return (
    <div className="fs-editor">
      <div className="fs-editor__presets" role="group" aria-label="Predefined examples">
        {presets.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onPreset(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="fs-editor__section">
        <span className="fs-editor__label">Allocation strategy</span>
        <div className="fs-editor__strategies" role="group" aria-label="Allocation strategy">
          {ALLOCATION_STRATEGIES.map((strategy: AllocationStrategy) => (
            <Button
              key={strategy}
              size="sm"
              variant={strategy === draft.allocation ? 'primary' : 'ghost'}
              aria-pressed={strategy === draft.allocation}
              onClick={() => set({ allocation: strategy })}
            >
              {ALLOCATION_LABELS[strategy]}
            </Button>
          ))}
        </div>
      </div>

      <div className="fs-editor__section">
        <span className="fs-editor__label">Volume geometry</span>
        <div className="fs-editor__grid">
          <label className="field">
            <span className="field__label">Blocks</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_BLOCK_COUNT}
              max={MAX_BLOCK_COUNT}
              value={draft.blockCount}
              aria-label="Block count"
              onChange={(event) =>
                set({ blockCount: clampInt(Number(event.target.value), MIN_BLOCK_COUNT, MAX_BLOCK_COUNT) })
              }
            />
          </label>

          <label className="field">
            <span className="field__label">Block size</span>
            <select
              className="data-table__select"
              value={draft.blockSize}
              aria-label="Block size"
              onChange={(event) => set({ blockSize: Number(event.target.value) })}
            >
              {BLOCK_SIZES.map((value) => (
                <option key={value} value={value}>
                  {value} B
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Inodes</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_INODES}
              max={MAX_INODES}
              value={draft.inodeCount}
              aria-label="Inode count"
              onChange={(event) =>
                set({ inodeCount: clampInt(Number(event.target.value), MIN_INODES, MAX_INODES) })
              }
            />
          </label>
        </div>
        <p className="fs-editor__hint">
          {draft.blockCount} × {draft.blockSize} B = {draft.blockCount * draft.blockSize} bytes ·{' '}
          {draft.inodeCount} inodes · largest file {maxSize} B
        </p>
      </div>

      <div className="fs-editor__section">
        <span className="fs-editor__label">New operation</span>
        <div className="fs-editor__kinds" role="group" aria-label="Operation kind">
          {OPERATION_KINDS.map((entry) => (
            <Button
              key={entry.kind}
              size="sm"
              variant={entry.kind === kind ? 'primary' : 'ghost'}
              aria-pressed={entry.kind === kind}
              onClick={() => setKind(entry.kind)}
            >
              {entry.label}
            </Button>
          ))}
        </div>

        <div className="fs-editor__grid">
          {needsPath ? (
            <label className="field">
              <span className="field__label">Path</span>
              <input
                className="data-table__input"
                type="text"
                value={path}
                aria-label="Operation path"
                onChange={(event) => setPath(event.target.value)}
              />
            </label>
          ) : null}

          {needsTarget ? (
            <label className="field">
              <span className="field__label">Move to directory</span>
              <input
                className="data-table__input"
                type="text"
                value={to}
                aria-label="Move target directory"
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          ) : null}

          {needsName ? (
            <label className="field">
              <span className="field__label">New name</span>
              <input
                className="data-table__input"
                type="text"
                value={name}
                aria-label="New name"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}

          {needsSize ? (
            <label className="field">
              <span className="field__label">
                {kind === 'create' ? 'Size (bytes)' : 'New size (bytes)'}
              </span>
              <input
                className="data-table__input"
                type="number"
                min={MIN_FILE_SIZE}
                max={maxSize}
                value={size}
                aria-label="File size"
                onChange={(event) => setSize(clampInt(Number(event.target.value), MIN_FILE_SIZE, maxSize))}
              />
            </label>
          ) : null}

          {needsMode ? (
            <label className="field">
              <span className="field__label">Mode (octal)</span>
              <input
                className="data-table__input"
                type="text"
                value={mode}
                aria-label="Permission mode"
                onChange={(event) => setMode(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        {issues.length > 0 ? (
          <p className="fs-editor__issue" role="status">
            {issues.join('; ')}
          </p>
        ) : null}

        <div className="fs-editor__actions">
          <Button size="sm" onClick={add} disabled={issues.length > 0}>
            + Add operation
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={draft.operations.length === 0}
            onClick={() => set({ operations: draft.operations.slice(0, -1) })}
          >
            Undo last
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={draft.operations.length === 0}
            onClick={() => set({ operations: [] })}
          >
            Clear script
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="fs-editor__section">
        <span className="fs-editor__label">
          Operation script ({draft.operations.length}/{MAX_OPERATIONS})
        </span>
        {draft.operations.length === 0 ? (
          <p className="fs-editor__hint">No operations yet — add one above or load a preset.</p>
        ) : (
          <ol className="fs-script">
            {draft.operations.map((operation, index) => (
              <li key={`${operation.kind}-${index}`} className="fs-script__item">
                <span className="fs-script__index">{index + 1}</span>
                <span className="fs-script__text">{operationLabel(operation)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove operation ${index + 1}`}
                  onClick={() => removeAt(index)}
                >
                  ×
                </Button>
              </li>
            ))}
          </ol>
        )}
        {disabled ? <p className="fs-editor__hint">Fix the volume to run the simulation.</p> : null}
      </div>
    </div>
  );
}
