import { useState } from 'react';
import {
  DIRECTIONAL_ALGORITHMS,
  DISK_ALGORITHMS,
  DISK_ALGORITHM_LABELS,
  DISK_DIRECTIONS,
  DISK_DIRECTION_LABELS,
  MAX_DISK_SIZE,
  MAX_REQUESTS,
  MIN_DISK_SIZE,
  MIN_REQUESTS,
  type DiskAlgorithm,
  type DiskDirection,
  type DiskPreset,
} from '@/engine';
import { Button } from '@/components';
import type { DiskDraft } from '../drafts';
import { generateRequests } from '../diskRunners';

export interface DiskEditorProps {
  readonly draft: DiskDraft;
  readonly disabled: boolean;
  readonly presets: readonly DiskPreset[];
  readonly onChange: (draft: DiskDraft) => void;
  readonly onPreset: (preset: DiskPreset) => void;
  readonly onReset: () => void;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Configure the policy, the disk geometry and the request queue.
 *
 * Every field feeds the pure engine, so the axis, the path and the metrics are
 * always a faithful function of what is shown here. Generated queues use a
 * seeded generator, so "Generate" is reproducible rather than random.
 */
export function DiskEditor({ draft, disabled, presets, onChange, onPreset, onReset }: DiskEditorProps) {
  const [count, setCount] = useState(8);
  const [seed, setSeed] = useState(1);

  const directional = DIRECTIONAL_ALGORITHMS.includes(draft.algorithm);
  const set = (patch: Partial<DiskDraft>): void => onChange({ ...draft, ...patch });

  const setDiskSize = (value: number): void => {
    const diskSize = clampInt(value, MIN_DISK_SIZE, MAX_DISK_SIZE);
    const head = Math.min(draft.head, diskSize - 1);
    const requests = draft.requests.map((cylinder) => Math.min(cylinder, diskSize - 1));
    set({ diskSize, head, requests });
  };

  const updateRequest = (index: number, value: number): void => {
    const cylinder = clampInt(value, 0, draft.diskSize - 1);
    set({ requests: draft.requests.map((item, position) => (position === index ? cylinder : item)) });
  };

  const addRequest = (): void => {
    if (draft.requests.length >= MAX_REQUESTS) return;
    set({ requests: [...draft.requests, draft.head] });
  };

  const removeRequest = (index: number): void => {
    if (draft.requests.length <= MIN_REQUESTS) return;
    set({ requests: draft.requests.filter((_, position) => position !== index) });
  };

  const generate = (): void => {
    const requests = generateRequests(draft.diskSize, clampInt(count, MIN_REQUESTS, MAX_REQUESTS), seed);
    set({ requests: requests.length > 0 ? requests : [draft.head] });
    setSeed((value) => value + 1);
  };

  return (
    <div className="disk-editor">
      <div className="disk-editor__presets" role="group" aria-label="Example workloads">
        {presets.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onPreset(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="disk-editor__section">
        <span className="disk-editor__label">Scheduling policy</span>
        <div className="disk-editor__policies" role="group" aria-label="Scheduling policy">
          {DISK_ALGORITHMS.map((algorithm: DiskAlgorithm) => (
            <Button
              key={algorithm}
              size="sm"
              variant={algorithm === draft.algorithm ? 'primary' : 'ghost'}
              aria-pressed={algorithm === draft.algorithm}
              onClick={() => set({ algorithm })}
            >
              {DISK_ALGORITHM_LABELS[algorithm]}
            </Button>
          ))}
        </div>
      </div>

      <div className="disk-editor__section">
        <span className="disk-editor__label">Geometry</span>
        <div className="disk-editor__grid">
          <label className="field">
            <span className="field__label">Disk size (cylinders)</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_DISK_SIZE}
              max={MAX_DISK_SIZE}
              value={draft.diskSize}
              aria-label="Disk size"
              onChange={(event) => setDiskSize(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span className="field__label">Initial head</span>
            <input
              className="data-table__input"
              type="number"
              min={0}
              max={draft.diskSize - 1}
              value={draft.head}
              aria-label="Initial head"
              onChange={(event) => set({ head: clampInt(Number(event.target.value), 0, draft.diskSize - 1) })}
            />
          </label>

          <div className="field">
            <span className="field__label">Initial direction</span>
            <div className="disk-editor__direction" role="group" aria-label="Initial direction">
              {DISK_DIRECTIONS.map((direction: DiskDirection) => (
                <Button
                  key={direction}
                  size="sm"
                  variant={direction === draft.direction ? 'primary' : 'ghost'}
                  aria-pressed={direction === draft.direction}
                  disabled={!directional}
                  title={DISK_DIRECTION_LABELS[direction]}
                  onClick={() => set({ direction })}
                >
                  {direction === 'up' ? '▲ Up' : '▼ Down'}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <p className="disk-editor__hint">
          {directional
            ? `Cylinders 0–${draft.diskSize - 1}; the sweep starts ${draft.direction}.`
            : `${DISK_ALGORITHM_LABELS[draft.algorithm]} ignores the direction — only the sweep policies read it.`}
        </p>
      </div>

      <div className="disk-editor__section">
        <span className="disk-editor__label">Request queue (arrival order)</span>
        <ul className="disk-editor__requests">
          {draft.requests.map((cylinder, index) => (
            <li key={`req-${index}`}>
              <label className="field">
                <span className="field__label">#{index + 1}</span>
                <input
                  className="data-table__input"
                  type="number"
                  min={0}
                  max={draft.diskSize - 1}
                  value={cylinder}
                  aria-label={`Request ${index + 1}`}
                  onChange={(event) => updateRequest(index, Number(event.target.value))}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove request ${index + 1}`}
                disabled={draft.requests.length <= MIN_REQUESTS}
                onClick={() => removeRequest(index)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        <div className="disk-editor__actions">
          <Button size="sm" disabled={draft.requests.length >= MAX_REQUESTS} onClick={addRequest}>
            + Add request
          </Button>
        </div>
      </div>

      <div className="disk-editor__section">
        <span className="disk-editor__label">Generate requests</span>
        <div className="disk-editor__generate">
          <label className="field">
            <span className="field__label">Count</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_REQUESTS}
              max={MAX_REQUESTS}
              value={count}
              aria-label="Generated request count"
              onChange={(event) => setCount(clampInt(Number(event.target.value), MIN_REQUESTS, MAX_REQUESTS))}
            />
          </label>
          <label className="field">
            <span className="field__label">Seed</span>
            <input
              className="data-table__input"
              type="number"
              min={0}
              value={seed}
              aria-label="Generator seed"
              onChange={(event) => setSeed(clampInt(Number(event.target.value), 0, 999999))}
            />
          </label>
          <Button size="sm" onClick={generate}>
            Generate
          </Button>
        </div>
        <p className="disk-editor__hint">
          Seeded, so the same seed always produces the same queue — press Generate again to step the seed.
        </p>
      </div>

      <div className="disk-editor__section disk-editor__actions">
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
        <span className="disk-editor__hint">
          {draft.requests.length} request{draft.requests.length === 1 ? '' : 's'}
        </span>
        {disabled ? <span className="disk-editor__hint">Fix the input to run the simulation.</span> : null}
      </div>
    </div>
  );
}
