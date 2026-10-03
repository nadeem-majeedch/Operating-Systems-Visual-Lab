import { useState } from 'react';
import {
  MAX_FRAMES,
  MAX_PAGE_NUMBER,
  MAX_REFERENCES,
  MIN_FRAMES,
  MIN_PAGE_NUMBER,
  REPLACEMENT_ALGORITHMS,
  REPLACEMENT_ALGORITHM_LABELS,
  type PageReplacementPreset,
} from '@/engine';
import { Button } from '@/components';
import type { ReplacementDraft } from '../drafts';

export interface ReplacementEditorProps {
  readonly draft: ReplacementDraft;
  readonly disabled: boolean;
  readonly presets: readonly PageReplacementPreset[];
  readonly onChange: (draft: ReplacementDraft) => void;
  readonly onPreset: (preset: PageReplacementPreset) => void;
  readonly onReset: () => void;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Configure the policy, the frame count and the reference string.
 *
 * Every field feeds the pure engine, so the frames, metrics and steps are always
 * a faithful function of what is shown here — nothing is simulated in the UI.
 */
export function ReplacementEditor({
  draft,
  disabled,
  presets,
  onChange,
  onPreset,
  onReset,
}: ReplacementEditorProps) {
  const [bulk, setBulk] = useState('');

  const set = (patch: Partial<ReplacementDraft>): void => onChange({ ...draft, ...patch });

  const updateReference = (index: number, value: number): void => {
    set({
      referenceString: draft.referenceString.map((page, position) =>
        position === index ? clampInt(value, MIN_PAGE_NUMBER, MAX_PAGE_NUMBER) : page,
      ),
    });
  };

  const addReference = (): void => {
    if (draft.referenceString.length >= MAX_REFERENCES) return;
    set({ referenceString: [...draft.referenceString, 1] });
  };

  const removeReference = (index: number): void => {
    set({ referenceString: draft.referenceString.filter((_, position) => position !== index) });
  };

  const applyBulk = (): void => {
    const pages = bulk
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((token) => clampInt(Number(token), MIN_PAGE_NUMBER, MAX_PAGE_NUMBER))
      .slice(0, MAX_REFERENCES);
    if (pages.length === 0) return;
    set({ referenceString: pages });
    setBulk('');
  };

  return (
    <div className="replacement-editor">
      <div className="replacement-editor__presets" role="group" aria-label="Example strings">
        {presets.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onPreset(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="replacement-editor__section">
        <span className="replacement-editor__label">Replacement policy</span>
        <div className="replacement-editor__policies" role="group" aria-label="Replacement policy">
          {REPLACEMENT_ALGORITHMS.map((algorithm) => (
            <Button
              key={algorithm}
              size="sm"
              variant={algorithm === draft.algorithm ? 'primary' : 'ghost'}
              aria-pressed={algorithm === draft.algorithm}
              onClick={() => set({ algorithm })}
            >
              {REPLACEMENT_ALGORITHM_LABELS[algorithm]}
            </Button>
          ))}
        </div>
      </div>

      <div className="replacement-editor__section">
        <span className="replacement-editor__label">Frames</span>
        <label className="field">
          <span className="field__label">Number of frames</span>
          <input
            className="data-table__input"
            type="number"
            min={MIN_FRAMES}
            max={MAX_FRAMES}
            value={draft.frameCount}
            aria-label="Number of frames"
            onChange={(event) =>
              set({ frameCount: clampInt(Number(event.target.value), MIN_FRAMES, MAX_FRAMES) })
            }
          />
        </label>
        <p className="replacement-editor__hint">
          {draft.frameCount} frame{draft.frameCount === 1 ? '' : 's'} · {draft.referenceString.length}{' '}
          reference{draft.referenceString.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="replacement-editor__section">
        <span className="replacement-editor__label">Reference string</span>
        <ul className="replacement-editor__references">
          {draft.referenceString.map((page, index) => (
            <li key={`ref-${index}`}>
              <label className="field">
                <span className="field__label">#{index + 1}</span>
                <input
                  className="data-table__input"
                  type="number"
                  min={MIN_PAGE_NUMBER}
                  max={MAX_PAGE_NUMBER}
                  value={page}
                  aria-label={`Reference ${index + 1}`}
                  onChange={(event) => updateReference(index, Number(event.target.value))}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove reference ${index + 1}`}
                onClick={() => removeReference(index)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        <div className="replacement-editor__string-actions">
          <Button size="sm" disabled={draft.referenceString.length >= MAX_REFERENCES} onClick={addReference}>
            + Add reference
          </Button>
        </div>
      </div>

      <div className="replacement-editor__section">
        <span className="replacement-editor__label">Paste a string (space, comma or dash separated)</span>
        <div className="replacement-editor__bulk">
          <label className="field">
            <span className="field__label">e.g. 7 0 1 2 0 3 0 4</span>
            <input
              className="data-table__input"
              type="text"
              value={bulk}
              placeholder="7 0 1 2 0 3 0 4"
              aria-label="Reference string text"
              onChange={(event) => setBulk(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyBulk();
              }}
            />
          </label>
          <Button size="sm" disabled={bulk.trim().length === 0} onClick={applyBulk}>
            Apply
          </Button>
        </div>
      </div>

      <div className="replacement-editor__actions">
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
        {disabled ? <span className="replacement-editor__hint">Fix the input to run the simulation.</span> : null}
      </div>
    </div>
  );
}
