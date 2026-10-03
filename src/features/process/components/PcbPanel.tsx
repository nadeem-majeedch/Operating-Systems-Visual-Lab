import { findProcess } from '@/engine';
import type { ProcessControlBlock, ProcessSystem } from '@/engine';
import { parentName, processColor } from '../processPresentation';
import { ProcessStateBadge } from './ProcessStateBadge';

export interface PcbPanelProps {
  readonly system: ProcessSystem;
  readonly process: ProcessControlBlock | undefined;
}

interface Row {
  readonly label: string;
  readonly value: string;
}

function rows(system: ProcessSystem, process: ProcessControlBlock): Row[] {
  return [
    { label: 'PID', value: String(process.pid) },
    { label: 'Name', value: process.name },
    {
      label: 'Parent PID',
      value:
        process.parentPid === null
          ? '—'
          : `${process.parentPid}${findProcess(system, process.parentPid) ? ` (${parentName(system, process)})` : ''}`,
    },
    { label: 'Priority', value: String(process.priority) },
    { label: 'Creation time', value: `t = ${process.creationTime}` },
    { label: 'CPU time', value: `${process.cpuTime}` },
    { label: 'Waiting time', value: `${process.waitingTime}` },
    { label: 'Burst', value: `${process.remainingTime} / ${process.burstTime} left` },
    {
      label: 'Completion time',
      value: process.completionTime === null ? '—' : `t = ${process.completionTime}`,
    },
  ];
}

/**
 * The process control block for one process.
 *
 * This is the kernel’s entire record of a process, so it is exactly what a
 * context switch saves and restores.
 */
export function PcbPanel({ system, process }: PcbPanelProps) {
  const pcb = process ?? (system.processes[0] ? findProcess(system, system.processes[0].pid) : undefined);

  return (
    <section className="pcb-panel" aria-label="Process control block">
      <header className="pcb-panel__header">
        <h4 className="pcb-panel__title">Process control block</h4>
        {pcb ? <span className="pcb-panel__swatch" style={{ backgroundColor: processColor(pcb.pid) }} aria-hidden="true" /> : null}
      </header>

      {!pcb ? (
        <p className="pcb-panel__empty">
          Select a process to inspect its PCB — the kernel’s entire record of how to run it.
        </p>
      ) : (
        <>
          <div className="pcb-panel__identity">
            <strong className="pcb-panel__name">{pcb.name}</strong>
            <ProcessStateBadge state={pcb.state} />
          </div>
          <dl className="pcb-panel__grid">
            {rows(system, pcb).map((row) => (
              <div className="pcb-panel__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
