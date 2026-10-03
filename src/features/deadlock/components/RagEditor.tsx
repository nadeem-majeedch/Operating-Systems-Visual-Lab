import type { RagInput } from '@/engine';
import {
  MAX_RAG_INSTANCES,
  MAX_RAG_PROCESSES,
  MAX_RAG_RESOURCES,
  MIN_RAG_INSTANCES,
  RAG_PRESETS,
} from '@/engine';
import { Button } from '@/components';
import { draftFromRagInput, type RagDraft } from '../drafts';

export interface RagEditorProps {
  readonly draft: RagDraft;
  readonly onChange: (next: RagDraft) => void;
}

type CellState = 'none' | 'holds' | 'requests';

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

function cellState(draft: RagDraft, row: number, column: number): CellState {
  if ((draft.allocation[row]?.[column] ?? 0) > 0) return 'holds';
  if ((draft.requests[row]?.[column] ?? 0) > 0) return 'requests';
  return 'none';
}

/**
 * A compact builder for resource-allocation graphs.
 *
 * Each process/resource cell cycles between "holds an instance", "requests an
 * instance" and nothing, and each resource type carries an instance count. That
 * is enough to draw every scenario the engine can reason about, including a
 * cycle that multiple instances dissolve.
 */
export function RagEditor({ draft, onChange }: RagEditorProps) {
  const processCount = draft.processes.length;
  const resourceCount = draft.resources.length;

  const setCell = (row: number, column: number, state: CellState): void => {
    onChange({
      ...draft,
      allocation: draft.allocation.map((entries, index) =>
        index === row
          ? entries.map((entry, c) => (c === column ? (state === 'holds' ? 1 : 0) : entry))
          : entries,
      ),
      requests: draft.requests.map((entries, index) =>
        index === row
          ? entries.map((entry, c) => (c === column ? (state === 'requests' ? 1 : 0) : entry))
          : entries,
      ),
    });
  };

  const setInstances = (column: number, value: number): void => {
    const clamped = Math.min(MAX_RAG_INSTANCES, Math.max(MIN_RAG_INSTANCES, Math.trunc(value) || 1));
    onChange({
      ...draft,
      instances: draft.instances.map((entry, index) => (index === column ? clamped : entry)),
      allocation: draft.allocation.map((row) =>
        row.map((entry, index) => (index === column ? Math.min(entry, clamped) : entry)),
      ),
    });
  };

  const addProcess = (): void => {
    if (processCount >= MAX_RAG_PROCESSES) return;
    onChange({
      ...draft,
      processes: [...draft.processes, nextProcessName(draft.processes)],
      allocation: [...draft.allocation, Array.from({ length: resourceCount }, () => 0)],
      requests: [...draft.requests, Array.from({ length: resourceCount }, () => 0)],
    });
  };

  const removeProcess = (row: number): void => {
    if (processCount <= 1) return;
    onChange({
      ...draft,
      processes: draft.processes.filter((_, index) => index !== row),
      allocation: draft.allocation.filter((_, index) => index !== row),
      requests: draft.requests.filter((_, index) => index !== row),
    });
  };

  const addResource = (): void => {
    if (resourceCount >= MAX_RAG_RESOURCES) return;
    onChange({
      ...draft,
      resources: [...draft.resources, nextResourceName(draft.resources)],
      instances: [...draft.instances, 1],
      allocation: draft.allocation.map((row) => [...row, 0]),
      requests: draft.requests.map((row) => [...row, 0]),
    });
  };

  const removeResource = (column: number): void => {
    if (resourceCount <= 1) return;
    onChange({
      ...draft,
      resources: draft.resources.filter((_, index) => index !== column),
      instances: draft.instances.filter((_, index) => index !== column),
      allocation: draft.allocation.map((row) => row.filter((_, index) => index !== column)),
      requests: draft.requests.map((row) => row.filter((_, index) => index !== column)),
    });
  };

  const applyPreset = (input: RagInput): void => onChange(draftFromRagInput(input));

  return (
    <div className="rag-editor">
      <div className="rag-editor__presets" role="group" aria-label="Example graphs">
        {RAG_PRESETS.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => applyPreset(preset.input)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="rag-editor__instances" role="group" aria-label="Resource instances">
        {draft.resources.map((resource, column) => (
          <label className="field" key={`inst-${resource}`}>
            <span className="field__label">{resource} instances</span>
            <input
              className="data-table__input"
              type="number"
              min={MIN_RAG_INSTANCES}
              max={MAX_RAG_INSTANCES}
              value={draft.instances[column] ?? 1}
              aria-label={`${resource} instance count`}
              onChange={(event) => setInstances(column, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table data-table--inputs matrix-table">
          <caption className="sr-only">
            For each process and resource, whether the process holds or requests an instance.
          </caption>
          <thead>
            <tr>
              <th scope="col">Process</th>
              {draft.resources.map((resource) => (
                <th scope="col" key={`th-${resource}`}>
                  {resource}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.processes.map((process, row) => (
              <tr key={process}>
                <th scope="row">{process}</th>
                {draft.resources.map((resource, column) => {
                  const state = cellState(draft, row, column);
                  return (
                    <td key={`cell-${resource}`}>
                      <select
                        className="data-table__select"
                        value={state}
                        aria-label={`${process} and ${resource}`}
                        onChange={(event) => setCell(row, column, event.target.value as CellState)}
                      >
                        <option value="none">—</option>
                        <option value="holds">holds</option>
                        <option value="requests">requests</option>
                      </select>
                    </td>
                  );
                })}
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
          </tbody>
        </table>
      </div>

      <div className="rag-editor__actions">
        <Button size="sm" onClick={addProcess} disabled={processCount >= MAX_RAG_PROCESSES}>
          + Add process
        </Button>
        <Button size="sm" onClick={addResource} disabled={resourceCount >= MAX_RAG_RESOURCES}>
          + Add resource
        </Button>
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
