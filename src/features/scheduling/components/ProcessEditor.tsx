import type { Process, ProcessPreset } from '@/engine';
import {
  MAX_PROCESS_COUNT,
  MAX_PRIORITY,
  MIN_PRIORITY,
  PROCESS_PRESETS,
  priorityOf,
  randomProcessSet,
} from '@/engine';
import { Button } from '@/components';

export interface ProcessEditorProps {
  readonly processes: readonly Process[];
  readonly colorFor: (processId: string | null) => string;
  readonly onChange: (next: Process[]) => void;
}

const MAX_ARRIVAL = 40;
const MAX_BURST = 40;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Editable process table.
 *
 * Arrival, burst and priority are plain number inputs because they are the raw
 * inputs the engines consume. Colour is an explicit visual identity: when it is
 * set it is honoured by every chart, so a learner can pin the process they are
 * tracking to a colour that survives a schedule being rebuilt.
 */
export function ProcessEditor({ processes, colorFor, onChange }: ProcessEditorProps) {
  const update = (index: number, patch: Partial<Process>): void => {
    onChange(processes.map((process, i) => (i === index ? { ...process, ...patch } : process)));
  };

  const remove = (index: number): void => {
    const remaining = processes.filter((_, i) => i !== index).map((process, i) => ({
      ...process,
      id: `p${i + 1}`,
      name: `P${i + 1}`,
    }));
    onChange(remaining);
  };

  const add = (): void => {
    const index = processes.length;
    onChange([
      ...processes,
      {
        id: `p${index + 1}`,
        name: `P${index + 1}`,
        arrivalTime: index,
        burstTime: 3,
        priority: 5 - Math.min(index, 4),
      },
    ]);
  };

  const applyPreset = (preset: ProcessPreset): void => {
    onChange(preset.processes.map((process) => ({ ...process })));
  };

  const generate = (): void => {
    const size = Math.max(2, Math.min(processes.length, 8));
    onChange(randomProcessSet(Date.now(), size));
  };

  return (
    <div className="process-editor">
      <div className="process-editor__presets" role="group" aria-label="Example workloads">
        {PROCESS_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            onClick={() => applyPreset(preset)}
            title={preset.description}
          >
            {preset.name}
          </Button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table data-table--inputs">
          <caption className="sr-only">
            Process table: name, arrival time, burst time, priority and colour.
          </caption>
          <thead>
            <tr>
              <th scope="col">Process</th>
              <th scope="col">Arrival</th>
              <th scope="col">Burst</th>
              <th scope="col">Priority</th>
              <th scope="col">
                <span className="sr-only">Colour</span>
              </th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process, index) => (
              <tr key={process.id}>
                <th scope="row">
                  <span
                    className="data-table__swatch"
                    aria-hidden="true"
                    style={{ backgroundColor: colorFor(process.id) }}
                  />
                  {process.name}
                </th>
                <td>
                  <input
                    id={`arrival-${process.id}`}
                    className="data-table__input"
                    type="number"
                    min={0}
                    max={MAX_ARRIVAL}
                    step={1}
                    value={process.arrivalTime}
                    aria-label={`${process.name} arrival time`}
                    onChange={(event) =>
                      update(index, {
                        arrivalTime: clampInt(Number(event.target.value), 0, MAX_ARRIVAL),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className="data-table__input"
                    type="number"
                    min={1}
                    max={MAX_BURST}
                    step={1}
                    value={process.burstTime}
                    aria-label={`${process.name} burst time`}
                    onChange={(event) =>
                      update(index, { burstTime: clampInt(Number(event.target.value), 1, MAX_BURST) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="data-table__input"
                    type="number"
                    min={MIN_PRIORITY}
                    max={MAX_PRIORITY}
                    step={1}
                    value={priorityOf(process)}
                    aria-label={`${process.name} priority, lower number means higher priority`}
                    onChange={(event) =>
                      update(index, {
                        priority: clampInt(Number(event.target.value), MIN_PRIORITY, MAX_PRIORITY),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className="data-table__color"
                    type="color"
                    value={process.color ?? colorFor(process.id)}
                    aria-label={`${process.name} colour`}
                    onChange={(event) => update(index, { color: event.target.value })}
                  />
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                    disabled={processes.length <= 1}
                    aria-label={`Remove ${process.name}`}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="process-editor__actions">
        <Button size="sm" onClick={add} disabled={processes.length >= MAX_PROCESS_COUNT}>
          + Add process
        </Button>
        <Button size="sm" variant="ghost" onClick={generate}>
          Generate workload
        </Button>
        <Button size="sm" variant="ghost" onClick={() => applyPreset(PROCESS_PRESETS[0]!)}>
          Reset to default
        </Button>
        <span className="process-editor__hint">
          {processes.length} / {MAX_PROCESS_COUNT} processes · priority {MIN_PRIORITY}–{MAX_PRIORITY} (lower
          wins)
        </span>
      </div>
    </div>
  );
}
