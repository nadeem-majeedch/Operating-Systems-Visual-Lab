import { useState } from 'react';
import {
  MAX_ADDRESS_BITS,
  MAX_ADDRESS_VALUE,
  MAX_REFERENCES,
  MAX_TLB_SIZE,
  MIN_ADDRESS_BITS,
  MIN_REFERENCES,
  MIN_TLB_SIZE,
  PAGE_SIZES,
  TLB_POLICIES,
  TLB_POLICY_LABELS,
  pagingGeometry,
  type PagingPreset,
} from '@/engine';
import { Button } from '@/components';
import type { PagingDraft } from '../drafts';

export interface PagingEditorProps {
  readonly draft: PagingDraft;
  readonly disabled: boolean;
  readonly presets: readonly PagingPreset[];
  readonly onChange: (draft: PagingDraft) => void;
  readonly onPreset: (preset: PagingPreset) => void;
  readonly onReset: () => void;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Configure the paging geometry and the address stream.
 *
 * Every field feeds the pure engine, so the map, metrics and steps are always a
 * faithful function of what is shown here — nothing is simulated in the UI.
 */
export function PagingEditor({
  draft,
  disabled,
  presets,
  onChange,
  onPreset,
  onReset,
}: PagingEditorProps) {
  const [absentInput, setAbsentInput] = useState(0);

  const geometry = pagingGeometry(draft);
  const validGeometry =
    Number.isInteger(geometry.pageBits) &&
    Number.isInteger(geometry.frameBits) &&
    geometry.pageBits >= 0 &&
    geometry.frameBits >= 0;

  const set = (patch: Partial<PagingDraft>): void => onChange({ ...draft, ...patch });

  const updateReference = (index: number, value: number): void => {
    const references = draft.references.map((reference, position) =>
      position === index ? clampInt(value, 0, MAX_ADDRESS_VALUE) : reference,
    );
    set({ references });
  };

  const addReference = (): void => {
    if (draft.references.length >= MAX_REFERENCES) return;
    set({ references: [...draft.references, 0] });
  };

  const removeReference = (index: number): void => {
    if (draft.references.length <= MIN_REFERENCES) return;
    set({ references: draft.references.filter((_, position) => position !== index) });
  };

  const markAbsent = (): void => {
    const page = clampInt(absentInput, 0, Math.max(0, geometry.pageCount - 1));
    if (!validGeometry || draft.absentPages.includes(page)) return;
    set({ absentPages: [...draft.absentPages, page].sort((a, b) => a - b) });
  };

  const clearAbsent = (page: number): void => {
    set({ absentPages: draft.absentPages.filter((entry) => entry !== page) });
  };

  return (
    <div className="paging-editor">
      <div className="paging-editor__presets" role="group" aria-label="Example workloads">
        {presets.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onPreset(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="paging-editor__section">
        <span className="paging-editor__label">Geometry</span>
        <div className="paging-editor__grid">
          <label className="field">
            <span className="field__label">Page size</span>
            <select
              className="data-table__select"
              value={draft.pageSize}
              aria-label="Page size"
              onChange={(event) => set({ pageSize: Number(event.target.value) })}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} bytes
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Logical address bits</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_ADDRESS_BITS}
              max={MAX_ADDRESS_BITS}
              value={draft.logicalAddressBits}
              aria-label="Logical address bits"
              onChange={(event) =>
                set({ logicalAddressBits: clampInt(Number(event.target.value), MIN_ADDRESS_BITS, MAX_ADDRESS_BITS) })
              }
            />
          </label>

          <label className="field">
            <span className="field__label">Physical address bits</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_ADDRESS_BITS}
              max={MAX_ADDRESS_BITS}
              value={draft.physicalAddressBits}
              aria-label="Physical address bits"
              onChange={(event) =>
                set({ physicalAddressBits: clampInt(Number(event.target.value), MIN_ADDRESS_BITS, MAX_ADDRESS_BITS) })
              }
            />
          </label>

          <label className="field">
            <span className="field__label">TLB entries</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_TLB_SIZE}
              max={MAX_TLB_SIZE}
              value={draft.tlbSize}
              aria-label="TLB entries"
              onChange={(event) => set({ tlbSize: clampInt(Number(event.target.value), MIN_TLB_SIZE, MAX_TLB_SIZE) })}
            />
          </label>

          <div className="field">
            <span className="field__label">TLB replacement</span>
            <div className="paging-editor__policies" role="group" aria-label="TLB replacement policy">
              {TLB_POLICIES.map((policy) => (
                <Button
                  key={policy}
                  size="sm"
                  variant={policy === draft.tlbPolicy ? 'primary' : 'ghost'}
                  aria-pressed={policy === draft.tlbPolicy}
                  onClick={() => set({ tlbPolicy: policy })}
                >
                  {TLB_POLICY_LABELS[policy]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="paging-editor__hint">
          {validGeometry
            ? `${2 ** draft.logicalAddressBits} bytes of logical space → ${geometry.pageCount} pages (${geometry.pageBits} page bits) · ${2 ** draft.physicalAddressBits} bytes physical → ${geometry.frameCount} frames (${geometry.frameBits} bits) · ${geometry.offsetBits} offset bits`
            : 'Address widths must be at least as large as the offset.'}
        </p>
      </div>

      <div className="paging-editor__section">
        <span className="paging-editor__label">Logical addresses to translate</span>
        <ul className="paging-editor__references">
          {draft.references.map((reference, index) => (
            <li key={`ref-${index}`}>
              <label className="field">
                <span className="field__label">#{index + 1}</span>
                <input
                  className="data-table__input"
                  type="number"
                  min={0}
                  max={MAX_ADDRESS_VALUE}
                  value={reference}
                  aria-label={`Reference ${index + 1}`}
                  onChange={(event) => updateReference(index, Number(event.target.value))}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove reference ${index + 1}`}
                disabled={draft.references.length <= MIN_REFERENCES}
                onClick={() => removeReference(index)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        <Button size="sm" disabled={draft.references.length >= MAX_REFERENCES} onClick={addReference}>
          + Add reference
        </Button>
      </div>

      <div className="paging-editor__section">
        <span className="paging-editor__label">Pages that start absent (fault on first use)</span>
        <div className="paging-editor__absent">
          {draft.absentPages.length === 0 ? (
            <span className="paging-editor__hint">Every page is resident.</span>
          ) : (
            draft.absentPages.map((page) => (
              <button
                key={page}
                type="button"
                className="chip chip--button"
                onClick={() => clearAbsent(page)}
                title={`Page ${page} faults on first use — click to make it resident`}
              >
                page {page} ×
              </button>
            ))
          )}
        </div>
        <div className="paging-editor__absent-add">
          <label className="field">
            <span className="field__label">Page</span>
            <input
              className="data-table__input"
              type="number"
              min={0}
              max={validGeometry ? geometry.pageCount - 1 : 0}
              value={absentInput}
              aria-label="Page to mark absent"
              onChange={(event) => setAbsentInput(clampInt(Number(event.target.value), 0, MAX_ADDRESS_VALUE))}
            />
          </label>
          <Button size="sm" disabled={!validGeometry} onClick={markAbsent}>
            Mark absent
          </Button>
        </div>
      </div>

      <div className="paging-editor__actions">
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
        <span className="paging-editor__hint">
          {draft.references.length} reference{draft.references.length === 1 ? '' : 's'}
        </span>
        {disabled ? <span className="paging-editor__hint">Fix the geometry to run the translation.</span> : null}
      </div>
    </div>
  );
}
