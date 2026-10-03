import { useState } from 'react';
import type { FitPolicy, MemoryPreset, PartitionMode } from '@/engine';
import {
  FIT_POLICIES,
  FIT_POLICY_LABELS,
  MAX_OPERATIONS,
  MAX_PARTITIONS,
  MAX_REQUEST_SIZE,
  MIN_PARTITION_SIZE,
  MIN_REQUEST_SIZE,
} from '@/engine';
import { Button } from '@/components';
import type { MemoryDraft } from '../drafts';

export interface MemoryEditorProps {
  readonly mode: PartitionMode;
  readonly policy: FitPolicy;
  readonly draft: MemoryDraft;
  readonly resident: readonly string[];
  readonly disabled: boolean;
  readonly onPolicyChange: (policy: FitPolicy) => void;
  readonly onDraftChange: (next: MemoryDraft) => void;
  readonly onAllocate: (name: string, size: number) => void;
  readonly onDeallocate: (name: string) => void;
  readonly onCompact: () => void;
  readonly onReset: () => void;
  readonly onPreset: (preset: MemoryPreset) => void;
  readonly presets: readonly MemoryPreset[];
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * The control panel: choose a placement policy, create a process, allocate it,
 * free resident processes, compact, and reset. Every action appends to the
 * operation script the engine replays, so the whole session is deterministic and
 * can be stepped through afterwards.
 */
export function MemoryEditor({
  mode,
  policy,
  draft,
  resident,
  disabled,
  onPolicyChange,
  onDraftChange,
  onAllocate,
  onDeallocate,
  onCompact,
  onReset,
  onPreset,
  presets,
}: MemoryEditorProps) {
  const [name, setName] = useState('P1');
  const [size, setSize] = useState(150);
  const full = draft.operations.length >= MAX_OPERATIONS;

  const allocate = (): void => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || size < MIN_REQUEST_SIZE) return;
    onAllocate(trimmed, clampInt(size, MIN_REQUEST_SIZE, MAX_REQUEST_SIZE));
    // Suggest the next default name.
    const match = /^P(\d+)$/.exec(trimmed);
    setName(match ? `P${Number(match[1]) + 1}` : `${trimmed}-2`);
  };

  const updatePartition = (index: number, value: number): void => {
    const partitions = draft.partitions.map((entry, position) =>
      position === index ? clampInt(value, MIN_PARTITION_SIZE, 4096) : entry,
    );
    onDraftChange({
      ...draft,
      partitions,
      totalSize: partitions.reduce((sum, entry) => sum + entry, 0),
    });
  };

  const addPartition = (): void => {
    if (draft.partitions.length >= MAX_PARTITIONS) return;
    const partitions = [...draft.partitions, 200];
    onDraftChange({
      ...draft,
      partitions,
      totalSize: partitions.reduce((sum, entry) => sum + entry, 0),
    });
  };

  const removePartition = (index: number): void => {
    if (draft.partitions.length <= 1) return;
    const partitions = draft.partitions.filter((_, position) => position !== index);
    onDraftChange({
      ...draft,
      partitions,
      totalSize: partitions.reduce((sum, entry) => sum + entry, 0),
    });
  };

  return (
    <div className="memory-editor">
      <div className="memory-editor__presets" role="group" aria-label="Example workloads">
        {presets.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onPreset(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="memory-editor__section">
        <span className="memory-editor__label">Placement policy</span>
        <div className="memory-editor__policies" role="group" aria-label="Placement policy">
          {FIT_POLICIES.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={item === policy ? 'primary' : 'ghost'}
              aria-pressed={item === policy}
              onClick={() => onPolicyChange(item)}
            >
              {FIT_POLICY_LABELS[item]}
            </Button>
          ))}
        </div>
      </div>

      {mode === 'fixed' ? (
        <div className="memory-editor__section">
          <span className="memory-editor__label">Partitions</span>
          <div className="memory-editor__partitions">
            {draft.partitions.map((partition, index) => (
              <label className="field" key={`partition-${index}`}>
                <span className="field__label">#{index + 1}</span>
                <input
                  className="data-table__input"
                  type="number"
                  min={MIN_PARTITION_SIZE}
                  value={partition}
                  aria-label={`Partition ${index + 1} size`}
                  onChange={(event) => updatePartition(index, Number(event.target.value))}
                />
              </label>
            ))}
            <Button size="sm" onClick={addPartition} disabled={draft.partitions.length >= MAX_PARTITIONS}>
              + Add partition
            </Button>
            {draft.partitions.length > 1 ? (
              <Button size="sm" variant="ghost" onClick={() => removePartition(draft.partitions.length - 1)}>
                − Remove last
              </Button>
            ) : null}
          </div>
          <p className="memory-editor__hint">
            Total memory: {draft.totalSize} units across {draft.partitions.length} partition
            {draft.partitions.length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : null}

      <div className="memory-editor__section">
        <span className="memory-editor__label">Create and allocate a process</span>
        <div className="memory-editor__create">
          <label className="field">
            <span className="field__label">Name</span>
            <input
              className="field__control"
              type="text"
              value={name}
              maxLength={8}
              aria-label="New process name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Size</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_REQUEST_SIZE}
              max={MAX_REQUEST_SIZE}
              value={size}
              aria-label="New process size"
              onChange={(event) => setSize(clampInt(Number(event.target.value), MIN_REQUEST_SIZE, MAX_REQUEST_SIZE))}
            />
          </label>
          <Button size="sm" onClick={allocate} disabled={disabled || full}>
            Allocate
          </Button>
        </div>
      </div>

      <div className="memory-editor__section">
        <span className="memory-editor__label">Resident processes</span>
        {disabled ? (
          <p className="memory-editor__hint">Fix the layout or request before allocating.</p>
        ) : resident.length === 0 ? (
          <p className="memory-editor__hint">No process is resident yet.</p>
        ) : (
          <ul className="memory-editor__resident">
            {resident.map((processName) => (
              <li key={processName}>
                <span className="chip chip--static">{processName}</span>
                <Button size="sm" variant="ghost" onClick={() => onDeallocate(processName)}>
                  Free
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="memory-editor__actions">
        <Button size="sm" onClick={onCompact} disabled={disabled || full || mode === 'fixed'}>
          Compact
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
        <span className="memory-editor__hint">
          {draft.operations.length} / {MAX_OPERATIONS} operations
        </span>
      </div>
    </div>
  );
}
