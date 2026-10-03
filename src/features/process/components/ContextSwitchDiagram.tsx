import { findProcess } from '@/engine';
import type { ProcessEvent, ProcessSystem } from '@/engine';
import { cn } from '@/utils';

export interface ContextSwitchDiagramProps {
  readonly system: ProcessSystem;
  readonly event: ProcessEvent | null;
  readonly className?: string;
}

/**
 * What a context switch actually does.
 *
 * The diagram contrasts the outgoing PCB (saved) with the incoming one
 * (restored). When the last event was not a switch it says so plainly and names
 * whoever holds the CPU, so the panel never implies work that did not happen.
 */
export function ContextSwitchDiagram({ system, event, className }: ContextSwitchDiagramProps) {
  const running = system.processes.find((process) => process.state === 'running');
  const incoming = event?.contextSwitch && event.pid !== null ? findProcess(system, event.pid) : undefined;
  const outgoingName =
    event?.contextSwitch && event.highlights.length > 0 ? event.highlights[0] : undefined;
  const outgoingPid =
    outgoingName === undefined
      ? undefined
      : system.processes.find((process) => process.name === outgoingName)?.pid;

  return (
    <section className={cn('context-switch', className)} aria-label="Context switch">
      <header className="context-switch__header">
        <h4 className="context-switch__title">Context switch</h4>
        <span className="context-switch__count">
          {system.contextSwitches} total
        </span>
      </header>

      {event?.contextSwitch && incoming && outgoingName !== undefined ? (
        <>
          <div className="context-switch__flow">
            <div className="context-switch__pcb context-switch__pcb--out">
              <span className="context-switch__phase">Save</span>
              <strong className="context-switch__name">{outgoingName}</strong>
              <span className="context-switch__pid">
                {outgoingPid === undefined ? '—' : `PID ${outgoingPid}`}
              </span>
            </div>

            <svg
              className="context-switch__arrow"
              viewBox="0 0 120 40"
              role="presentation"
              aria-hidden="true"
            >
              <path className="context-switch__arrow-path" d="M 4 20 L 108 20" />
              <path className="context-switch__arrow-head" d="M 100 12 L 112 20 L 100 28 z" />
              <circle className="context-switch__arrow-token" r={5} cx={0} cy={20}>
                <animate attributeName="cx" from="4" to="108" dur="0.8s" fill="freeze" />
              </circle>
            </svg>

            <div className="context-switch__pcb context-switch__pcb--in">
              <span className="context-switch__phase">Restore</span>
              <strong className="context-switch__name">{incoming.name}</strong>
              <span className="context-switch__pid">PID {incoming.pid}</span>
            </div>
          </div>
          <p className="context-switch__note">
            Switch #{system.contextSwitches}: the kernel saves {outgoingName}’s registers and program
            counter into its PCB, then reloads them for {incoming.name}. No user code runs during the
            swap.
          </p>
        </>
      ) : (
        <p className="context-switch__idle">
          {running ? (
            <>
              No context switch on the last event — <strong>{running.name}</strong> keeps the CPU.
              Switching only happens when the CPU moves between two different processes.
            </>
          ) : (
            <>
              The CPU is idle. Dispatch a ready process to bring the CPU back to life.
              {running === undefined && system.contextSwitches > 0 ? (
                <> {system.contextSwitches} context switches so far.</>
              ) : null}
            </>
          )}
        </p>
      )}
    </section>
  );
}
