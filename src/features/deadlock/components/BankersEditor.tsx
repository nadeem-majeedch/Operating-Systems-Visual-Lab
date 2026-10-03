import type { BankersInput } from '@/engine';
import {
  BANKERS_PRESETS,
  MAX_BANKER_PROCESSES,
  MAX_BANKER_RESOURCES,
  MAX_MATRIX_VALUE,
} from '@/engine';
import { Button } from '@/components';
import { draftFromInput, type BankersDraft } from '../drafts';

export interface BankersEditorProps {
  readonly draft: BankersDraft;
  readonly onChange: (next: BankersDraft) => void;
}

function clampCell(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_MATRIX_VALUE, Math.max(0, Math.trunc(value)));
}

function nextProcessName(processes: readonly string[]): string {
  let highest = 0;
  for (const name of processes) {
    const match = /^P(\d+)$/.exec(name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `P${highest + 1}`;
}

function nextResourceName(resources: readonly string[]): string {
  const used = new Set(resources);
  for (let code = 65; code <= 90; code += 1) {
    const candidate = String.fromCharCode(code);
    if (!used.has(candidate)) return candidate;
  }
  return `R${resources.length + 1}`;
}

/**
 * Editable Available / Max / Allocation / Need matrices.
 *
 * Learners can add and remove processes and resource types, edit any cell, and
 * attach a single pending request. `Need` is not editable — it is always derived
 * as `Max − Allocation`, which the board makes explicit.
 */
export function BankersEditor({ draft, onChange }: BankersEditorProps) {
  const processCount = draft.processes.length;
  const resourceCount = draft.resources.length;

  const updateAllocation = (row: number, column: number, value: number): void => {
    onChange({
      ...draft,
      allocation: draft.allocation.map((entries, index) =>
        index === row ? entries.map((entry, c) => (c === column ? clampCell(value) : entry)) : entries,
      ),
    });
  };

  const updateMax = (row: number, column: number, value: number): void => {
    onChange({
      ...draft,
      max: draft.max.map((entries, index) =>
        index === row ? entries.map((entry, c) => (c === column ? clampCell(value) : entry)) : entries,
      ),
    });
  };

  const updateAvailable = (column: number, value: number): void => {
    onChange({
      ...draft,
      available: draft.available.map((entry, index) => (index === column ? clampCell(value) : entry)),
    });
  };

  const updateRequest = (column: number, value: number): void => {
    onChange({
      ...draft,
      request: draft.request.map((entry, index) => (index === column ? clampCell(value) : entry)),
    });
  };

  const addProcess = (): void => {
    if (processCount >= MAX_BANKER_PROCESSES) return;
    onChange({
      ...draft,
      processes: [...draft.processes, nextProcessName(draft.processes)],
      allocation: [...draft.allocation, Array.from({ length: resourceCount }, () => 0)],
      max: [...draft.max, Array.from({ length: resourceCount }, () => 0)],
    });
  };

  const removeProcess = (row: number): void => {
    if (processCount <= 1) return;
    onChange({
      ...draft,
      processes: draft.processes.filter((_, index) => index !== row),
      allocation: draft.allocation.filter((_, index) => index !== row),
      max: draft.max.filter((_, index) => index !== row),
      requestProcess: draft.requestProcess === row ? -1 : draft.requestProcess,
    });
  };

  const addResource = (): void => {
    if (resourceCount >= MAX_BANKER_RESOURCES) return;
    onChange({
      ...draft,
      resources: [...draft.resources, nextResourceName(draft.resources)],
      allocation: draft.allocation.map((row) => [...row, 0]),
      max: draft.max.map((row) => [...row, 0]),
      available: [...draft.available, 0],
      request: [...draft.request, 0],
    });
  };

  const removeResource = (column: number): void => {
    if (resourceCount <= 1) return;
    onChange({
      ...draft,
      resources: draft.resources.filter((_, index) => index !== column),
      allocation: draft.allocation.map((row) => row.filter((_, index) => index !== column)),
      max: draft.max.map((row) => row.filter((_, index) => index !== column)),
      available: draft.available.filter((_, index) => index !== column),
      request: draft.request.filter((_, index) => index !== column),
    });
  };

  const applyPreset = (input: BankersInput): void => {
    onChange(draftFromInput(input));
  };

  return (
    <div className="bankers-editor">
      <div className="bankers-editor__presets" role="group" aria-label="Example states">
        {BANKERS_PRESETS.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => applyPreset(preset.input)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table data-table--inputs matrix-table">
          <caption className="sr-only">
            Allocation, Maximum and Available for each process and resource type.
          </caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Process
              </th>
              <th scope="colgroup" colSpan={resourceCount}>
                Allocation
              </th>
              <th scope="colgroup" colSpan={resourceCount}>
                Max
              </th>
              <th scope="col" rowSpan={2}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
            <tr>
              {[...draft.resources, ...draft.resources].map((resource, index) => (
                <th scope="col" key={`h-${resource}-${index}`}>
                  {resource}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.processes.map((process, row) => (
              <tr key={process}>
                <th scope="row">{process}</th>
                {draft.resources.map((resource, column) => (
                  <td key={`a-${resource}`}>
                    <input
                      className="data-table__input"
                      type="number"
                      min={0}
                      max={MAX_MATRIX_VALUE}
                      value={draft.allocation[row]?.[column] ?? 0}
                      aria-label={`${process} allocation of ${resource}`}
                      onChange={(event) => updateAllocation(row, column, Number(event.target.value))}
                    />
                  </td>
                ))}
                {draft.resources.map((resource, column) => (
                  <td key={`m-${resource}`}>
                    <input
                      className="data-table__input"
                      type="number"
                      min={0}
                      max={MAX_MATRIX_VALUE}
                      value={draft.max[row]?.[column] ?? 0}
                      aria-label={`${process} maximum for ${resource}`}
                      onChange={(event) => updateMax(row, column, Number(event.target.value))}
                    />
                  </td>
                ))}
                <td>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeProcess(row)}
                    disabled={processCount <= 1}
                    aria-label={`Remove ${process}`}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Available</th>
              {draft.resources.map((resource, column) => (
                <td key={`av-${resource}`} colSpan={2}>
                  <input
                    className="data-table__input"
                    type="number"
                    min={0}
                    max={MAX_MATRIX_VALUE}
                    value={draft.available[column] ?? 0}
                    aria-label={`Available ${resource}`}
                    onChange={(event) => updateAvailable(column, Number(event.target.value))}
                  />
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bankers-editor__actions">
        <Button size="sm" onClick={addProcess} disabled={processCount >= MAX_BANKER_PROCESSES}>
          + Add process
        </Button>
        <Button size="sm" onClick={addResource} disabled={resourceCount >= MAX_BANKER_RESOURCES}>
          + Add resource
        </Button>
        <span className="bankers-editor__hint">
          {processCount} / {MAX_BANKER_PROCESSES} processes · {resourceCount} / {MAX_BANKER_RESOURCES}{' '}
          resources
        </span>
      </div>

      <fieldset className="bankers-editor__request">
        <legend>Pending request</legend>
        <label className="field">
          <span className="field__label">Process</span>
          <select
            className="field__control"
            value={draft.requestProcess}
            onChange={(event) =>
              onChange({ ...draft, requestProcess: Number(event.target.value) })
            }
          >
            <option value={-1}>No request</option>
            {draft.processes.map((process, index) => (
              <option value={index} key={process}>
                {process}
              </option>
            ))}
          </select>
        </label>
        {draft.requestProcess >= 0 ? (
          <div className="bankers-editor__request-vector">
            {draft.resources.map((resource, column) => (
              <label className="field" key={`req-${resource}`}>
                <span className="field__label">{resource}</span>
                <input
                  className="data-table__input"
                  type="number"
                  min={0}
                  max={MAX_MATRIX_VALUE}
                  value={draft.request[column] ?? 0}
                  aria-label={`Requested ${resource}`}
                  onChange={(event) => updateRequest(column, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="bankers-editor__note">
            With no request, the safety check runs directly on the current state.
          </p>
        )}
      </fieldset>

      <div className="bankers-editor__remove-resources" role="group" aria-label="Resource types">
        <span className="bankers-editor__hint">Resource types:</span>
        {draft.resources.map((resource, column) => (
          <Button
            key={`rm-${resource}`}
            size="sm"
            variant="ghost"
            onClick={() => removeResource(column)}
            disabled={resourceCount <= 1}
            aria-label={`Remove resource ${resource}`}
          >
            ✕ {resource}
          </Button>
        ))}
      </div>
    </div>
  );
}
