import { useState } from 'react';
import { Button } from '@/components';
import { PROCESS_SCENE_PRESETS } from '@/engine';
import type { ProcessScenePreset, ProcessSystem } from '@/engine';
import { cn } from '@/utils';
import { processColor } from '../processPresentation';
import { ProcessStateBadge } from './ProcessStateBadge';

export interface ProcessRosterProps {
  readonly system: ProcessSystem;
  readonly selectedPid: number | null;
  readonly onSelect: (pid: number) => void;
  readonly onCreate: (name: string) => void;
  readonly onLoadScene: (preset: ProcessScenePreset) => void;
}

/**
 * The workload side of the lab: predefined scenes, a create control and the list
 * of live PCBs. Selecting a row focuses every other panel on that process.
 */
export function ProcessRoster({
  system,
  selectedPid,
  onSelect,
  onCreate,
  onLoadScene,
}: ProcessRosterProps) {
  const [name, setName] = useState('');

  const submit = (): void => {
    onCreate(name.trim());
    setName('');
  };

  return (
    <div className="process-roster">
      <div className="process-roster__presets" role="group" aria-label="Example scenarios">
        {PROCESS_SCENE_PRESETS.map((preset) => (
          <Button key={preset.id} size="sm" onClick={() => onLoadScene(preset)} title={preset.description}>
            {preset.name}
          </Button>
        ))}
      </div>

      <form
        className="process-roster__create"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="process-roster__create-label" htmlFor="new-process-name">
          New process
        </label>
        <input
          id="new-process-name"
          className="process-roster__input"
          type="text"
          value={name}
          placeholder="P1"
          maxLength={12}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" size="sm" variant="primary">
          + Create
        </Button>
      </form>

      <div className="table-wrap">
        <table className="data-table process-roster__table">
          <caption className="sr-only">
            Processes: name, PID, state, priority and CPU time. Select a row to inspect its PCB.
          </caption>
        <thead>
          <tr>
            <th scope="col">Process</th>
            <th scope="col">PID</th>
            <th scope="col">State</th>
            <th scope="col">Prio</th>
            <th scope="col">CPU</th>
            <th scope="col">Wait</th>
          </tr>
        </thead>
        <tbody>
          {system.processes.length === 0 ? (
            <tr>
              <td className="process-roster__empty" colSpan={6}>
                No processes yet. Create one, or load a scenario above.
              </td>
            </tr>
          ) : (
            system.processes.map((process) => {
              const isSelected = process.pid === selectedPid;
              return (
                <tr key={process.pid} className={cn(isSelected && 'is-selected')}>
                  <th scope="row">
                    <button
                      type="button"
                      className="process-roster__select"
                      onClick={() => onSelect(process.pid)}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="data-table__swatch"
                        aria-hidden="true"
                        style={{ backgroundColor: processColor(process.pid) }}
                      />
                      {process.name}
                    </button>
                  </th>
                  <td>{process.pid}</td>
                  <td>
                    <ProcessStateBadge state={process.state} />
                  </td>
                  <td>{process.priority}</td>
                  <td>{process.cpuTime}</td>
                  <td>{process.waitingTime}</td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
